/**
 * Sichtvergleich im echten Browser (Puppeteer, Fake-Backend) gegen den laufenden Vite-Dev-Server: fotografiert feste
 * Ansichten (Tabs, Dialoge, Admin-Unter-Tabs) je Farbschema und Viewport und vergleicht zwei Laeufe pixelweise.
 * Grundlage fuer Umbauten ohne gewollte Optikaenderung (Bootstrap-Rueckbau, `tasks/plan-bootstrap-rueckbau.md`).
 *
 * Aufruf (Dev-Server muss laufen):
 *   bun scripts/sichtvergleich.ts aufnehmen <name>            # Fotos nach .sichtvergleich/<name>/
 *   bun scripts/sichtvergleich.ts vergleichen <alt> <neu>     # Diff-Bilder nach .sichtvergleich/diff-<alt>-<neu>/
 * Optionen beim Aufnehmen: --nur <Teilstring>[,<Teilstring>…] (nur passende Ansichten), --farbe light|dark, --viewport desktop|mobil,
 *   --backend <API-URL> (echtes Backend statt Fake, Testbenutzer --user/--password, Standard livetest-fsd als Super-Admin;
 *   Login-Zeiten, Logs und Speicherwerte aendern sich zwischen Laeufen -- fuer exakte Vergleiche das Fake-Backend nehmen),
 *   --base <URL>, --chrome <Pfad>. Ein voller Lauf (4 Browser parallel, 4 x 22 Ansichten) dauert etwa 1-2 Minuten.
 */

import { mkdir, readdir } from 'node:fs/promises';
import puppeteer, { type Page } from 'puppeteer';
import { echtesBackend, fakeBackend, type Backend } from './livetest/backends';
import { anmelden, oeffneApp, warteBis } from './livetest/browser';

const args = process.argv.slice(2);
const argValue = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const BASE = argValue('--base') ?? 'http://localhost:8080';
const CHROME = argValue('--chrome') ?? '/usr/bin/google-chrome-stable';
const NUR = argValue('--nur')?.split(',');
const FARBE = argValue('--farbe');
const VIEWPORT = argValue('--viewport');
const ORDNER = `${import.meta.dir}/../.sichtvergleich`;
const BACKEND = argValue('--backend')?.replace(/\/$/, '');
const USER = argValue('--user') ?? (BACKEND ? 'livetest-fsd' : 'sichtvergleich');
const PASSWORD = argValue('--password') ?? 'Livetest-FSD-2026!';

/** Hoehe reicht fuer die laengsten Ansichten: die App scrollt im eigenen Container, ein Ganzseiten-Foto saehe das nicht. */
const VIEWPORTS = {
  desktop: { width: 1400, height: 2400 },
  mobil: { width: 390, height: 2400 },
} as const;
const FARBSCHEMATA = ['light', 'dark'] as const;

/** Ruhige Darstellung: keine Animationen, kein Cursor, keine Snackbars (Zeitpunkt-abhaengig). */
const RUHE_CSS = `*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }
.CustomSnackbar-container { display: none !important; }`;

interface Ansicht {
  name: string;
  /** Stellt die Ansicht her (Tab waehlen, Dialog oeffnen). */
  oeffnen(page: Page): Promise<void>;
  /** Raeumt danach auf (Dialog schliessen). */
  schliessen?(page: Page): Promise<void>;
}

const klick = (page: Page, selektor: string): Promise<void> =>
  page.evaluate(s => {
    const ziel = [...document.querySelectorAll<HTMLElement>(s)].find(el => el.offsetParent !== null);
    (ziel ?? document.querySelector<HTMLElement>(s))?.click();
  }, selektor);

const tab =
  (paneId: string): Ansicht['oeffnen'] =>
  page =>
    klick(page, `[data-tab-target="${paneId}"]`);

const dialog = (paneId: string, knopf: string): Pick<Ansicht, 'oeffnen' | 'schliessen'> => ({
  async oeffnen(page) {
    await tab(paneId)(page);
    await klick(page, knopf);
    await page.waitForSelector('dialog[open]', { timeout: 5000 }).catch(() => undefined);
  },
  async schliessen(page) {
    await page.keyboard.press('Escape');
    await warteBis(page, () => !document.querySelector('dialog[open]'), '', 3000);
  },
});

const adminTab =
  (id: string): Ansicht['oeffnen'] =>
  async page => {
    await klick(page, 'a#admin-tab[href="#Admin"]');
    await page.waitForSelector(`[data-tab-target="admin-pane-${id}"]`, { timeout: 10000 }).catch(() => undefined);
    await klick(page, `[data-tab-target="admin-pane-${id}"]`);
  };

/**
 * Dialog, den ein Modul direkt oeffnet (HTML-Dialoge ohne eigenen Ausloeser in der Oberflaeche, z. B. Speicherfehler).
 *
 * @param aufruf - Laeuft im Browser und oeffnet den Dialog (Modul per `import('/ts/...')`).
 * @param weiter - Optional: Klick auf diesen Selektor im Dialog (Folgedialog).
 * @returns Oeffnen/Schliessen der Ansicht.
 */
const modulDialog = (aufruf: ModulAufruf, weiter?: string): Pick<Ansicht, 'oeffnen' | 'schliessen'> => ({
  async oeffnen(page) {
    await tab('start')(page);
    await rufeModul(page, aufruf);
    await page.waitForSelector('dialog[open]', { timeout: 5000 }).catch(() => undefined);
    if (weiter) {
      await klick(page, `dialog[open] ${weiter}`);
      // Der Folgedialog entsteht erst nach dem Schliessen des ersten (naechster Frame).
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.waitForSelector('dialog[open]', { timeout: 5000 }).catch(() => undefined);
    }
  },
  async schliessen(page) {
    // Nur Schliessen/Abbrechen: andere `data-dialog-dismiss`-Knoepfe oeffnen Folgedialoge (Login -> Registrieren).
    await page.evaluate(() => {
      const knoepfe = [...document.querySelectorAll<HTMLElement>('dialog[open] [data-dialog-dismiss="modal"]')];
      const knopf =
        knoepfe.find(k => k.dataset['icon'] === 'cross') ??
        knoepfe.find(k => /^(Schlie(ß|ss)en|Abbrechen)$/.test(k.textContent?.trim() ?? ''));
      knopf?.click();
    });
    await page.keyboard.press('Escape');
    await warteBis(page, () => !document.querySelector('dialog[open]'), '', 3000);
  },
});

/**
 * Ansicht, die ein Modul ausserhalb eines Dialogs einblendet (z. B. das Ersteinrichtungs-Panel).
 *
 * @param aufruf - Laeuft im Browser und blendet die Ansicht ein.
 * @param selektor - Element, auf das gewartet und das danach entfernt wird.
 * @returns Oeffnen/Schliessen der Ansicht.
 */
const modulAnsicht = (aufruf: ModulAufruf, selektor: string): Pick<Ansicht, 'oeffnen' | 'schliessen'> => ({
  async oeffnen(page) {
    await tab('start')(page);
    await rufeModul(page, aufruf);
    await page.waitForSelector(selektor, { timeout: 5000 }).catch(() => undefined);
  },
  async schliessen(page) {
    await page.evaluate(s => document.querySelectorAll(s).forEach(el => el.remove()), selektor);
  },
});

/** Aufruf einer Modulfunktion im Browser (Pfad wie vom Dev-Server ausgeliefert, `name` = Export, `default` fuer den Standardexport). */
interface ModulAufruf {
  pfad: string;
  name: string;
  argumente?: unknown[];
}

/**
 * Fuehrt einen `ModulAufruf` im Browser aus (das Ergebnis wird nicht abgewartet: Dialoge loesen erst beim Schliessen auf).
 *
 * @param page - Seite mit geladener App.
 * @param aufruf - Modul, Export und Argumente.
 */
const rufeModul = (page: Page, { pfad, name, argumente = [] }: ModulAufruf): Promise<void> =>
  page.evaluate(
    async (p: string, n: string, a: unknown[]) => {
      const modul = (await import(p)) as Record<string, (...x: unknown[]) => unknown>;
      void modul[n](...a);
    },
    pfad,
    name,
    argumente,
  );

const SPEICHERFEHLER: ModulAufruf = {
  pfad: '/ts/shared/lib/autosave/errorHandling.ts',
  name: 'showErrorDialog',
  argumente: [
    'BZ',
    [
      {
        operation: 'create',
        label: 'Mo 07.09., 15:00',
        message: 'Zeitraum ueberschneidet sich mit einem vorhandenen.',
      },
      { operation: 'delete', id: 'abc123', message: 'Eintrag nicht gefunden.' },
    ],
  ],
};
const SIGNATUR: ModulAufruf = { pfad: '/ts/shared/lib/pdf/signaturDialog.ts', name: 'signaturDialog' };

const ANSICHTEN: Ansicht[] = [
  { name: 'start', oeffnen: tab('start') },
  { name: 'bereitschaft', oeffnen: tab('Bereitschaft') },
  { name: 'bereitschaft-dialog-zeitraum', ...dialog('Bereitschaft', '#btnESZ') },
  { name: 'bereitschaft-dialog-einsatz', ...dialog('Bereitschaft', '#btnESE') },
  { name: 'bereitschaft-hilfe', ...dialog('Bereitschaft', '#btnHelpBereitschaft') },
  { name: 'bereitschaft-anzeige', ...dialog('Bereitschaft', '#tableBE tbody tr:first-child td:nth-child(2)') },
  { name: 'ewt', oeffnen: tab('EWT') },
  { name: 'ewt-dialog', ...dialog('EWT', '#btnESEE') },
  { name: 'ewt-anzeige', ...dialog('EWT', '#tableE tbody tr:first-child td:nth-child(2)') },
  { name: 'neben', oeffnen: tab('Neben') },
  { name: 'neben-dialog', ...dialog('Neben', '#btnESN') },
  { name: 'ea', oeffnen: tab('EA') },
  { name: 'ea-dialog', ...dialog('EA', '#btnESEA') },
  { name: 'berechnung', oeffnen: tab('Berechnung') },
  { name: 'impressum', ...dialog('start', '.app-footer .impressum') },
  { name: 'dialog-speicherfehler', ...modulDialog(SPEICHERFEHLER) },
  {
    name: 'dialog-registrieren',
    ...modulDialog({ pfad: '/ts/features/auth/ui/createModalNewUser.tsx', name: 'default' }),
  },
  {
    name: 'dialog-passwort-vergessen',
    ...modulDialog({ pfad: '/ts/features/auth/ui/createModalForgotPassword.tsx', name: 'default' }),
  },
  {
    name: 'dialog-passwort-neu',
    ...modulDialog({
      pfad: '/ts/features/auth/ui/createModalResetPassword.tsx',
      name: 'default',
      argumente: ['token'],
    }),
  },
  {
    name: 'ersteinrichtung',
    ...modulAnsicht(
      { pfad: '/ts/features/onboarding/ui/createOnboardingGuideModal.tsx', name: 'openOnboardingGuide' },
      '.onboarding-panel',
    ),
  },
  { name: 'dialog-signatur', ...modulDialog(SIGNATUR) },
  { name: 'dialog-signatur-pad', ...modulDialog(SIGNATUR, '[data-wahl="neu"]') },
  { name: 'start-hilfe', ...dialog('start', '#btnHelpStart') },
  {
    name: 'einstellungen',
    async oeffnen(page) {
      await tab('Einstellungen')(page);
      // Alle Abschnitte gleichzeitig offen (das `name` der Accordion-Items erlaubt sonst nur einen).
      await page.evaluate(() =>
        document.querySelectorAll<HTMLDetailsElement>('#Einstellungen details').forEach(details => {
          details.removeAttribute('name');
          details.open = true;
        }),
      );
    },
  },
  ...['dashboard', 'users', 'vorgaben', 'templates', 'formulare', 'resources', 'profiles', 'logs'].map(id => ({
    name: `admin-${id}`,
    oeffnen: adminTab(id),
  })),
];

/**
 * Stellt eine Ansicht her, fotografiert sie und raeumt danach auf.
 *
 * @param page - Seite mit geladener App.
 * @param ansicht - Ansicht.
 * @param praefix - Pfad samt Farbschema/Viewport, `-<ansicht>.png` wird angehaengt.
 */
async function foto(page: Page, ansicht: Ansicht, praefix: string): Promise<void> {
  await ansicht.oeffnen(page);
  await page.evaluate(() => document.fonts.ready);
  await new Promise(resolve => setTimeout(resolve, 400));
  await page.screenshot({ path: `${praefix}-${ansicht.name}.png` });
  await ansicht.schliessen?.(page);
}

/**
 * Nimmt alle Ansichten je Farbschema und Viewport auf.
 *
 * @param name - Zielordner unter `.sichtvergleich/`.
 */
async function aufnehmen(name: string): Promise<void> {
  const ziel = `${ORDNER}/${name}`;
  await mkdir(ziel, { recursive: true });
  const laeufe = FARBSCHEMATA.filter(farbschema => !FARBE || farbschema === FARBE).flatMap(farbschema =>
    Object.entries(VIEWPORTS)
      .filter(([viewportName]) => !VIEWPORT || viewportName === VIEWPORT)
      .map(([viewportName, viewport]) => ({ farbschema, viewportName, viewport })),
  );
  // Echtes Backend: Testdaten einmal anlegen, alle Browser teilen sie; Fake: je Browser ein eigenes.
  const echtes = BACKEND ? echtesBackend(BACKEND, { user: USER, password: PASSWORD, code: 'kirchheim' }) : undefined;
  await echtes?.vorbereiten();
  // Je Farbschema/Viewport ein eigener Browser, alle parallel.
  await Promise.all(
    laeufe.map(async ({ farbschema, viewportName, viewport }) => {
      let backend: Backend;
      if (echtes) backend = echtes;
      else {
        backend = fakeBackend(USER, 'super-admin');
        await backend.vorbereiten();
      }
      const { browser, page, seitenfehler } = await oeffneApp({
        backend,
        backendUrl: BACKEND,
        chrome: CHROME,
        viewport,
        farbschema,
      });
      try {
        await page.evaluateOnNewDocument(css => {
          document.addEventListener('DOMContentLoaded', () => {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.append(style);
          });
        }, RUHE_CSS);
        await page.goto(BASE, { waitUntil: 'networkidle2' });

        const login: Ansicht = { name: 'login-dialog', ...dialog('start', '#btnLogin') };
        const passt = (ansicht: Ansicht): boolean => !NUR || NUR.some(teil => ansicht.name.includes(teil));
        const ansichten = [login, ...ANSICHTEN].filter(passt);
        if (passt(login)) await foto(page, login, `${ziel}/${farbschema}-${viewportName}`);
        const { geladen } = await anmelden(page, USER, PASSWORD);
        if (!geladen) throw new Error('Login fehlgeschlagen');
        for (const ansicht of ANSICHTEN.filter(passt))
          await foto(page, ansicht, `${ziel}/${farbschema}-${viewportName}`);
        console.log(`${farbschema}/${viewportName}: ${ansichten.length} Ansichten`);
        if (seitenfehler.length > 0) console.log(`  Seitenfehler: ${seitenfehler.slice(0, 5).join(' | ')}`);
      } finally {
        await browser.close();
      }
    }),
  );
  await echtes?.aufraeumen();
  console.log(`Fotos: ${ziel}`);
}

/**
 * Vergleicht zwei Laeufe pixelweise (Canvas im Browser, keine Zusatzpakete) und schreibt je abweichendem Foto ein
 * Diff-Bild (abweichende Pixel rot, Rest blass).
 *
 * @param alt - Ordnername des Vergleichslaufs.
 * @param neu - Ordnername des neuen Laufs.
 */
async function vergleichen(alt: string, neu: string): Promise<void> {
  const ziel = `${ORDNER}/diff-${alt}-${neu}`;
  await mkdir(ziel, { recursive: true });
  const dateien = (await readdir(`${ORDNER}/${alt}`)).filter(datei => datei.endsWith('.png')).sort();
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  let abweichend = 0;
  try {
    for (const datei of dateien) {
      const neuDatei = Bun.file(`${ORDNER}/${neu}/${datei}`);
      if (!(await neuDatei.exists())) {
        console.log(`  fehlt im neuen Lauf: ${datei}`);
        abweichend++;
        continue;
      }
      const [a, b] = await Promise.all([Bun.file(`${ORDNER}/${alt}/${datei}`).arrayBuffer(), neuDatei.arrayBuffer()]);
      const ergebnis = await page.evaluate(
        async (aB64: string, bB64: string) => {
          const bild = async (b64: string) =>
            createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
          const [ia, ib] = await Promise.all([bild(aB64), bild(bB64)]);
          const breite = Math.max(ia.width, ib.width);
          const hoehe = Math.max(ia.height, ib.height);
          const pixel = (bitmap: ImageBitmap) => {
            const canvas = new OffscreenCanvas(breite, hoehe);
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(bitmap, 0, 0);
            return ctx.getImageData(0, 0, breite, hoehe).data;
          };
          const [pa, pb] = [pixel(ia), pixel(ib)];
          const canvas = new OffscreenCanvas(breite, hoehe);
          const ctx = canvas.getContext('2d')!;
          const diff = ctx.createImageData(breite, hoehe);
          let anders = 0;
          for (let i = 0; i < pa.length; i += 4) {
            const delta = Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1]) + Math.abs(pa[i + 2] - pb[i + 2]);
            if (delta > 24) {
              anders++;
              diff.data.set([255, 0, 0, 255], i);
            } else {
              const grau = (pa[i] + pa[i + 1] + pa[i + 2]) / 3;
              diff.data.set([grau, grau, grau, 50], i);
            }
          }
          if (anders === 0) return { anders, groesse: ia.width === ib.width && ia.height === ib.height, png: '' };
          ctx.putImageData(diff, 0, 0);
          const blob = await canvas.convertToBlob({ type: 'image/png' });
          const bytes = new Uint8Array(await blob.arrayBuffer());
          let binaer = '';
          for (const byte of bytes) binaer += String.fromCharCode(byte);
          return { anders, groesse: ia.width === ib.width && ia.height === ib.height, png: btoa(binaer) };
        },
        Buffer.from(a).toString('base64'),
        Buffer.from(b).toString('base64'),
      );
      if (ergebnis.anders === 0) continue;
      abweichend++;
      await Bun.write(`${ziel}/${datei}`, Buffer.from(ergebnis.png, 'base64'));
      console.log(`  ${datei}: ${ergebnis.anders} Pixel${ergebnis.groesse ? '' : ' (Bildgroesse anders)'}`);
    }
  } finally {
    await browser.close();
  }
  console.log(`${dateien.length - abweichend}/${dateien.length} Fotos gleich${abweichend ? `, Diffs: ${ziel}` : ''}`);
}

const [befehl, erster, zweiter] = args.filter(
  (arg, index) => !arg.startsWith('--') && !args[index - 1]?.startsWith('--'),
);
if (befehl === 'aufnehmen' && erster) await aufnehmen(erster);
else if (befehl === 'vergleichen' && erster && zweiter) await vergleichen(erster, zweiter);
else {
  console.log('Aufruf: bun scripts/sichtvergleich.ts aufnehmen <name> | vergleichen <alt> <neu>');
  process.exit(1);
}
