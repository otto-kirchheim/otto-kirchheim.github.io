/**
 * Live-Test im echten Browser (Puppeteer) gegen den laufenden Vite-Dev-Server.
 *
 * Zwei Modi:
 *  - Standard: Fake-Backend im Browser (Request-Interception), keine echten Daten, nichts wird persistiert.
 *  - `--backend <url>`: echtes Backend (z. B. das lokale `http://localhost:8081/api/v2`). Das Script meldet einen eigenen
 *    Testbenutzer an (legt ihn beim ersten Lauf per Zugangscode an), leert dessen Daten im Testjahr, legt die Testdaten
 *    ueber die API an und raeumt am Ende wieder auf. Andere Benutzer werden nicht angefasst.
 *
 * Prueft den Feature-Vertrag nach dem Umzug der Feature-Logik (Audit Schritt A):
 *  1. Login ueber das Login-Formular, Laden aller Ressourcen (`features/<id>/model/backend.ts`, `createResourceEndpoints`)
 *  2. Mapper, Monatsfilter je Tabelle (`features/<id>/model/monat.ts`), Berechnung aus der Registry (`loadUserDaten`)
 *  3. Ueberschneidungspruefung BZ/EWT (`meta.resources[].overlapWindow`)
 *  4. EWT loeschen + Speichern: `onDeleted` -> `ewt:deleted` -> Verweise in EZ und EA geloest
 *  5. Einstellungen: Pers-Feld „Entgeltgruppe“ aus dem Einstellungen-Slot von `ea` (`PersFelder`), Speichern nach `Pers`;
 *     EA abgewaehlt: Feld ausgeblendet, Wert bleibt
 *  6. Nur Fake-Backend (Benutzer ist dort Team-Admin): Admin > Profile-Templates mit den Feature-Abschnitten
 *     (`profilVorlage` der Admin-Anteile: VorgabenB, Fahrzeit, Zulagen, EA-Pers-Felder), Bearbeiten und Speichern
 *
 *  7. Nur Fake-Backend: Ressourcenbrowser (nur Super-Admins, deshalb per Modul-Import eigenstaendig gemountet), Feldtypen je
 *     Ressource aus dem Admin-Anteil (`nurDatumFelder`, `zeitFelder`)
 *
 * Aufruf (Dev-Server muss laufen, z. B. `bun run dev`):
 *   bun scripts/livetest.ts                                        # Fake-Backend, headless
 *   bun scripts/livetest.ts --backend http://localhost:8081/api/v2  # lokales Backend
 *   bun scripts/livetest.ts --headful --slow 50                    # sichtbar mitverfolgen
 * Weitere Optionen: --base <Dev-Server-URL> (Standard http://localhost:8080), --chrome <Pfad>,
 *   --user/--password/--code (Testbenutzer im Backend-Modus, Standard livetest-fsd / Zugangscode kirchheim).
 */

import { tmpdir } from 'node:os';
import { FAKE_VORLAGE, JAHR, MONAT, RESSOURCEN, echtesBackend, fakeBackend } from './livetest/backends';
import { anmelden, oeffneApp, sichtbareZeilen, storage, warteBis } from './livetest/browser';

// ─── Argumente ───────────────────────────────────────────

const args = process.argv.slice(2);
const argValue = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const BASE = argValue('--base') ?? 'http://localhost:8080';
const BACKEND = argValue('--backend')?.replace(/\/$/, '');
const HEADFUL = args.includes('--headful');
const SLOW = Number(argValue('--slow') ?? 0);
const CHROME = argValue('--chrome') ?? '/usr/bin/google-chrome-stable';
const USER = argValue('--user') ?? 'livetest-fsd';
const PASSWORD = argValue('--password') ?? 'Livetest-FSD-2026!';
const ACCESS_CODE = argValue('--code') ?? 'kirchheim';

// ─── Pruefungen ──────────────────────────────────────────

const ergebnisse: { name: string; ok: boolean }[] = [];
function check(name: string, ok: boolean, info?: unknown): void {
  ergebnisse.push({ name, ok });
  console.log(`${ok ? '  ✔' : '  ✘'} ${name}${ok || info === undefined ? '' : `  -> ${JSON.stringify(info)}`}`);
}

// ─── Ablauf ──────────────────────────────────────────────

const backend = BACKEND
  ? echtesBackend(BACKEND, { user: USER, password: PASSWORD, code: ACCESS_CODE })
  : fakeBackend(USER);
console.log(`Live-Test gegen ${BASE}, ${backend.name}`);

const { browser, page, apiLog, seitenfehler, konsolenfehler } = await oeffneApp({
  backend,
  backendUrl: BACKEND,
  chrome: CHROME,
  headful: HEADFUL,
  slow: SLOW,
});

try {
  console.log('0. Testdaten anlegen');
  const ids = await backend.vorbereiten();
  check('Testdaten angelegt', Object.values(ids).length === 9 && Object.values(ids).every(Boolean), ids);

  await page.goto(BASE, { waitUntil: 'networkidle2' });

  // 1. Login (wechselt danach in den Testmonat)
  console.log('1. Login + Laden');
  const { formular, geladen } = await anmelden(page, USER, PASSWORD);
  check('Login-Formular erreichbar', formular);
  check('Nach Login: Tabellen gemountet und Daten im Storage', geladen);
  check('Nach Login: Tabellen gemountet und Daten im Storage', geladen);
  for (const pfad of RESSOURCEN)
    check(`GET ${pfad}/${JAHR} (createResourceEndpoints)`, apiLog.includes(`GET ${pfad}/${JAHR}`), apiLog);

  // 2. Mapper + Monatsfilter + Berechnung
  console.log('2. Mapper, Monatsfilter, Berechnung');
  const dataN = await storage<Record<string, unknown>[]>(page, 'dataN');
  const n1 = dataN?.find(row => row._id === ids.n1);
  check(
    'nebengeldFromBackend: Tag als DD.MM.YYYY, Verweis auf e1, zulagenAnzeigeN',
    n1?.Tag === '01.09.2026' && n1?.EWT === ids.e1 && Boolean(n1?.zulagenAnzeigeN),
    n1,
  );
  const dataE = await storage<Record<string, unknown>[]>(page, 'dataE');
  check('ewtFromBackend: Tag als YYYY-MM-DD', dataE?.find(row => row._id === ids.e1)?.Tag === '2026-09-01', dataE?.[0]);
  const dataBE = await storage<Record<string, unknown>[]>(page, 'dataBE');
  check('beFromBackend: Tag als DD.MM.YYYY', dataBE?.[0]?.Tag === '07.09.2026', dataBE?.[0]);

  const erwartet: Record<string, number> = { tableBZ: 2, tableBE: 1, tableE: 3, tableN: 1, tableEA: 2 };
  for (const [tableId, anzahl] of Object.entries(erwartet)) {
    const ist = await sichtbareZeilen(page, tableId);
    check(`${tableId}: ${anzahl} Zeile(n) im Monat ${MONAT}`, ist === anzahl, ist);
  }
  const berechnung = await storage<Record<string, Record<string, unknown>>>(page, 'datenBerechnung');
  const buckets = berechnung?.[MONAT] ? Object.keys(berechnung[MONAT]) : [];
  check('Berechnung: Buckets fuer Monat 9 aus allen Features', buckets.length >= 4, buckets);

  // 3. Ueberschneidungspruefung (nur lokal, nichts wird gesendet)
  console.log('3. Ueberschneidungspruefung');
  const overlap = await page.evaluate(
    async (bz1: string, e3: string) => {
      const { findOverlapBlockedRows } = (await import('/ts/shared/lib/autosave/overlapGuard.ts' as string)) as {
        findOverlapBlockedRows(resource: string, table: unknown): unknown[];
      };
      type Tbl = {
        rows: {
          array: { _state: string; deleteRow(): void }[];
          add(value: Record<string, unknown>, state?: string): void;
          findById(id: string): { deleteRow(): void; undoDelete(): void } | undefined;
        };
      };
      const ergebnis: Record<string, number> = {};
      const pruefe = (tableId: string, key: string, id: string, neu: Record<string, unknown>) => {
        const table = (document.querySelector(`#${tableId}`) as unknown as { instance: Tbl }).instance;
        const row = table.rows.findById(id)!;
        row.deleteRow();
        table.rows.add(neu, 'new');
        ergebnis[key] = findOverlapBlockedRows(key, table).length;
        // Aufraeumen: neue Zeile entfernen, Loeschung zuruecknehmen.
        table.rows.array.find(r => r._state === 'new')?.deleteRow();
        row.undoDelete();
        ergebnis[`${key}-danach`] = findOverlapBlockedRows(key, table).length;
      };
      pruefe('tableBZ', 'BZ', bz1, { Beginn: '2026-09-07T20:00:00.000Z', Ende: '2026-09-08T02:00:00.000Z', Pause: 0 });
      pruefe('tableE', 'EWT', e3, {
        Tag: '2026-09-03',
        Buchungstag: '2026-09-03',
        Einsatzort: 'X',
        Schicht: 'T',
        beginE: '08:00',
        endeE: '09:00',
        berechnen: true,
      });
      return ergebnis;
    },
    ids.bz1,
    ids.e3,
  );
  check('BZ: neue Zeile ueber geloeschter blockiert (overlapWindow aus ber/meta)', overlap.BZ === 1, overlap);
  check('EWT: neue Zeile ueber geloeschter blockiert (overlapWindow aus ewt/meta)', overlap.EWT === 1, overlap);
  check('Nach Aufraeumen: nichts blockiert', overlap['BZ-danach'] === 0 && overlap['EWT-danach'] === 0, overlap);

  // 4. EWT loeschen + Speichern -> onDeleted -> ewt:deleted -> Verweise in EZ/EA geloest
  console.log('4. EWT loeschen + Speichern');
  const vorher = apiLog.length;
  await page.evaluate((e1: string) => {
    const table = (
      document.querySelector('#tableE') as unknown as {
        instance: { rows: { findById(id: string): { deleteRow(): void } | undefined } };
      }
    ).instance;
    table.rows.findById(e1)!.deleteRow();
    (document.querySelector('#btnSaveE') as HTMLElement).click();
  }, ids.e1);
  const geloest = await warteBis(
    page,
    (n1Id: string) => {
      const raw = localStorage.getItem('dataN');
      const n = raw ? (JSON.parse(raw) as { data: { _id: string; EWT?: string }[] }).data : [];
      return n.some(row => row._id === n1Id && !row.EWT);
    },
    ids.n1,
  );
  const neueAufrufe = apiLog.slice(vorher);
  check(
    'Server-Aufruf loescht e1',
    neueAufrufe.some(
      a => a === `DELETE einsatzwechseltaetigkeit/${ids.e1}` || a === 'POST einsatzwechseltaetigkeit/bulk',
    ),
    neueAufrufe,
  );
  check('Backend: e1 entfernt', !(await backend.existiert('einsatzwechseltaetigkeit', ids.e1)));
  check('EZ: Verweis n1 -> e1 geloest (onDeleted -> ewt:deleted)', geloest, await storage(page, 'dataN'));
  const dataEA = await storage<{ _id: string; EWT?: string }[]>(page, 'dataEA');
  check('EA: Verweis ea1 -> e1 geloest', dataEA?.find(r => r._id === ids.ea1)?.EWT === undefined, dataEA);
  check('EA: Verweis ea2 -> e2 bleibt', dataEA?.find(r => r._id === ids.ea2)?.EWT === ids.e2, dataEA);
  check('Tabelle EWT: 2 Zeilen', (await sichtbareZeilen(page, 'tableE')) === 2);

  // 5. Einstellungen: Entgeltgruppe kommt aus dem Einstellungen-Slot von ea und wird beim Speichern nach Pers geschrieben
  console.log('5. Einstellungen: Entgeltgruppe (ea)');
  await page.evaluate(() => (document.querySelector('#einstellungen-tab') as HTMLElement | null)?.click());
  const feldDa = await warteBis(page, () => Boolean(document.querySelector('#Entgeltgruppe')));
  const reihenfolge = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('#formEinstellungen input')].map(input => input.id);
    return ids.indexOf('Entgeltgruppe') - ids.indexOf('Taetigkeit');
  });
  check(
    'Feld Entgeltgruppe im Panel Persönliche Daten, direkt nach Tätigkeit',
    feldDa && reihenfolge === 1,
    reihenfolge,
  );
  const vorgabenVorher = await storage<{ Pers: { Entgeltgruppe?: string } }>(page, 'VorgabenU');
  const alt = vorgabenVorher?.Pers.Entgeltgruppe ?? '';
  check(
    'read (ea): gespeicherter Wert eingetragen',
    (await page.$eval('#Entgeltgruppe', el => (el as HTMLInputElement).value)) === alt,
    alt,
  );
  /** Setzt die Entgeltgruppe, speichert die Einstellungen und wartet, bis `VorgabenU` den Wert enthaelt. */
  const speichereEntgeltgruppe = async (wert: string): Promise<boolean> => {
    // Direkt setzen statt tippen: das Akkordeon „Persönliche Daten“ kann zugeklappt sein.
    await page.$eval(
      '#Entgeltgruppe',
      (el, w) => {
        (el as HTMLInputElement).value = w;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      },
      wert,
    );
    await page.evaluate(() => (document.querySelector('#formEinstellungen') as HTMLFormElement).requestSubmit());
    return warteBis(
      page,
      (w: string) => {
        const raw = localStorage.getItem('VorgabenU');
        const vorgaben = raw ? (JSON.parse(raw) as { data?: { Pers?: { Entgeltgruppe?: string } } }) : undefined;
        return (
          (vorgaben?.data ?? (vorgaben as { Pers?: { Entgeltgruppe?: string } } | undefined))?.Pers?.Entgeltgruppe === w
        );
      },
      wert,
    );
  };
  const vorSpeichern = apiLog.length;
  const neuerWert = alt === '104' ? '103' : '104';
  check('collect (ea): neuer Wert in VorgabenU.Pers.Entgeltgruppe', await speichereEntgeltgruppe(neuerWert), {
    feld: await page.$eval('#Entgeltgruppe', el => (el as HTMLInputElement).value),
    gespeichert: (await storage<{ Pers: { Entgeltgruppe?: string } }>(page, 'VorgabenU'))?.Pers.Entgeltgruppe,
    konsolenfehler,
  });
  // Der Profil-PUT laeuft nach dem Schreiben in den Storage; kurz darauf warten.
  for (let i = 0; i < 30 && !apiLog.slice(vorSpeichern).includes('PUT user-profiles/me'); i++)
    await new Promise(resolve => setTimeout(resolve, 100));
  check(
    'Profil an den Server gesendet',
    apiLog.slice(vorSpeichern).includes('PUT user-profiles/me'),
    apiLog.slice(vorSpeichern),
  );
  // EA unter „Sichtbare Bereiche“ abwaehlen und speichern: Feld ausgeblendet, Wert bleibt erhalten.
  /** Setzt den Haken fuer EA, speichert und wartet, bis `aktivierteTabs` passt. */
  const setzeEa = async (aktiv: boolean): Promise<boolean> => {
    await page.$eval(
      '#collapseFive input[data-tab-key="ea"]',
      (el, a) => {
        if ((el as HTMLInputElement).checked !== a) (el as HTMLInputElement).click();
      },
      aktiv,
    );
    await page.evaluate(() => (document.querySelector('#formEinstellungen') as HTMLFormElement).requestSubmit());
    return warteBis(
      page,
      (a: string) => {
        const raw = localStorage.getItem('VorgabenU');
        const parsed = raw ? (JSON.parse(raw) as { data?: unknown }) : undefined;
        const vorgaben = (parsed?.data ?? parsed) as { Einstellungen?: { aktivierteTabs?: string[] } } | undefined;
        return (vorgaben?.Einstellungen?.aktivierteTabs ?? []).includes('ea') === (a === '1');
      },
      aktiv ? '1' : '0',
    );
  };
  const eaAus = await setzeEa(false);
  const ausgeblendet = await page.$eval('#Entgeltgruppe', el => Boolean(el.closest('.d-none')));
  const nachAbwahl = (await storage<{ Pers: { Entgeltgruppe?: string } }>(page, 'VorgabenU'))?.Pers.Entgeltgruppe;
  check(
    'EA abgewaehlt + gespeichert: Feld ausgeblendet, Entgeltgruppe bleibt',
    eaAus && ausgeblendet && nachAbwahl === neuerWert,
    { eaAus, ausgeblendet, nachAbwahl },
  );
  const eaAn = await setzeEa(true);
  check(
    'EA wieder angewaehlt: Feld sichtbar mit Wert',
    eaAn &&
      (await page.$eval(
        '#Entgeltgruppe',
        (el, w) => !el.closest('.d-none') && (el as HTMLInputElement).value === w,
        neuerWert,
      )),
  );

  // Urspruenglichen Wert wiederherstellen (Backend-Modus: Profil des Testbenutzers).
  check('Ursprungswert wiederhergestellt', await speichereEntgeltgruppe(alt));

  // 6. Admin: Profil-Vorlagen mit Feature-Abschnitten (nur Fake-Backend, dort ist der Benutzer Team-Admin)
  if (backend.gespeicherteVorlage) {
    console.log('6. Admin: Profil-Vorlagen');
    await page.evaluate(() => (document.querySelector('a#admin-tab[href="#Admin"]') as HTMLElement | null)?.click());
    const reiter = await warteBis(page, () =>
      Boolean(document.querySelector('[data-tab-target="admin-pane-templates"]')),
    );
    check('Admin-Reiter Profile-Templates sichtbar', reiter);
    await page.evaluate(() =>
      (document.querySelector('[data-tab-target="admin-pane-templates"]') as HTMLElement | null)?.click(),
    );
    const liste = await warteBis(page, () =>
      [...document.querySelectorAll('#admin-pane-templates button')].some(b => b.textContent?.includes('livetest')),
    );
    check('Vorlage geladen', liste);

    /** Klickt im Vorlagen-Bereich den ersten Knopf mit genau diesem Text (bzw. enthaltenem Text). */
    const klicke = (text: string, exakt = true) =>
      page.evaluate(
        (t: string, e: boolean) => {
          const knopf = [...document.querySelectorAll<HTMLButtonElement>('#admin-pane-templates button')].find(b =>
            e ? b.textContent?.trim() === t : b.textContent?.includes(t),
          );
          knopf?.click();
          return Boolean(knopf);
        },
        text,
        exakt,
      );
    /** Schaltet einen Abschnitt des Editors auf (Checkbox im Tag). */
    const abschnitt = (label: string) =>
      page.evaluate((l: string) => {
        const tag = [...document.querySelectorAll('#admin-pane-templates .db-tag label')].find(
          x => x.textContent?.trim() === l,
        );
        (tag?.querySelector('input') as HTMLInputElement | null)?.click();
        return Boolean(tag);
      }, label);
    const pause = () => new Promise(resolve => setTimeout(resolve, 200));

    await klicke('livetest', false);
    await pause();
    const tags = await page.evaluate(() =>
      [...document.querySelectorAll('#admin-pane-templates .db-tag label')].map(l => l.textContent?.trim()),
    );
    check(
      'Abschnitte: global + Feature-Abschnitte in Feature-Reihenfolge',
      JSON.stringify(tags) ===
        JSON.stringify(['Pers', 'Arbeitszeit', 'VorgabenB', 'Fahrzeit', 'Zulagen', 'Einstellungen']),
      tags,
    );
    check(
      'Pers enthaelt die Felder des EA-Admin-Anteils',
      await page.evaluate(() =>
        Boolean(
          document.querySelector('#admin-pane-templates')?.textContent?.includes('Entgeltgruppe (Entgeltausgleich)'),
        ),
      ),
    );

    await abschnitt('VorgabenB');
    await pause();
    await klicke('Vorgabe hinzufügen');
    await pause();
    check(
      'VorgabenB-Editor (ber): neuer Eintrag ausgewaehlt',
      await page.evaluate(() =>
        Boolean(document.querySelector('#admin-pane-templates')?.textContent?.includes('Vorgabe 2 von 2')),
      ),
    );

    await abschnitt('Zulagen');
    await pause();
    const zulage = await page.evaluate(() => {
      const box = [...document.querySelectorAll<HTMLInputElement>('#admin-pane-templates .db-checkbox input')].find(
        b => !b.checked,
      );
      box?.click();
      // Nur das Label: die DB-Checkbox rendert zusaetzlich einen (versteckten) Fehlertext.
      return box?.closest('label')?.textContent?.trim();
    });
    await pause();
    await klicke('Speichern');
    const gespeichert = await warteBis(page, () => true, '', 500).then(async () => {
      for (let i = 0; i < 20 && !backend.gespeicherteVorlage?.(); i++) await pause();
      return backend.gespeicherteVorlage?.();
    });
    const vorgabenB = gespeichert?.VorgabenB as { key: string; value: Record<string, unknown> }[] | undefined;
    const einstellungen = gespeichert?.Einstellungen as { aktivierteTabs?: string[]; benoetigteZulagen?: string[] };
    check(
      'Gespeichert: VorgabenB mit 2 Eintraegen, unbekanntes Feld erhalten',
      vorgabenB?.length === 2 && vorgabenB[0].value.eigenesFeld === 'bleibt',
      vorgabenB,
    );
    check(
      'Gespeichert: neue Zulage in Einstellungen.benoetigteZulagen, Tabs unveraendert',
      Boolean(zulage && einstellungen?.benoetigteZulagen?.includes(zulage)) &&
        JSON.stringify(einstellungen?.aktivierteTabs) === JSON.stringify(['bereitschaft', 'ewt']),
      { zulage, einstellungen },
    );
    check(
      'Gespeichert: Fahrzeit unveraendert',
      JSON.stringify(gespeichert?.Fahrzeit) === JSON.stringify(FAKE_VORLAGE.template.Fahrzeit),
      gespeichert?.Fahrzeit,
    );
  }

  // 7. Admin: Ressourcenbrowser -- Feldtypen je Ressource aus dem Admin-Anteil (nur Fake-Backend, dort Super-Admin)
  if (backend.gespeicherteVorlage) {
    console.log('7. Admin: Ressourcenbrowser (Feldtypen)');
    // Der Browser ist nur fuer Super-Admins sichtbar; das Fake-Backend beantwortet sonst nicht alle Admin-Aufrufe.
    // Deshalb eigenstaendig mounten (echte Komponente, echtes DB-UX-CSS, Daten ueber das Fake-Backend).
    await page.evaluate(async () => {
      // Dieselbe React-Instanz wie die App: URL (mit Versions-Hash) aus dem transformierten Modul lesen.
      const quelle = await (await fetch('/ts/pages/admin/ui/AdminResourceBrowser.tsx')).text();
      const reactUrl = /from "([^"]*\/deps\/react\.js[^"]*)"/.exec(quelle)?.[1];
      if (!reactUrl) throw new Error('React-Modul nicht gefunden');
      // Vite liefert React als CommonJS-Wrapper: die API steckt im Default-Export.
      const { createElement } = ((await import(reactUrl)) as { default: typeof import('react') }).default;
      const { mount } = (await import('/ts/shared/lib/react-root/reactRoot.ts' as string)) as {
        mount(container: Element, node: unknown): void;
      };
      const { ladeAdminFeatures } = (await import('/ts/pages/admin/adminFeatures.ts' as string)) as {
        ladeAdminFeatures(): Promise<unknown>;
      };
      const { AdminResourceBrowser } = (await import('/ts/pages/admin/ui/AdminResourceBrowser.tsx' as string)) as {
        AdminResourceBrowser: () => null;
      };
      await ladeAdminFeatures();
      const host = document.createElement('div');
      host.id = 'livetest-ressourcen';
      document.body.prepend(host);
      mount(host, createElement(AdminResourceBrowser));
    });
    await warteBis(page, () => Boolean(document.querySelector('#livetest-ressourcen [role="tab"]')));
    await page.evaluate(() =>
      [...document.querySelectorAll<HTMLButtonElement>('#livetest-ressourcen [role="tab"]')]
        .find(b => b.textContent?.includes('Einsatzwechseltätigkeit'))
        ?.click(),
    );
    const zeile = await warteBis(page, () =>
      Boolean(document.querySelector('#livetest-ressourcen tbody td[title="Klicken zum Bearbeiten"]')),
    );
    const zellen = await page.evaluate(() =>
      [...document.querySelectorAll('#livetest-ressourcen tbody tr:first-child td')].map(td => td.textContent?.trim()),
    );
    check('EWT-Tabelle: Tag ohne Uhrzeit (nurDatumFelder)', zeile && zellen.includes('03.09.2026'), zellen);
    await page.evaluate(() =>
      (document.querySelector('#livetest-ressourcen tbody td[title="Klicken zum Bearbeiten"]') as HTMLElement).click(),
    );
    await warteBis(page, () => Boolean(document.querySelector('dialog[open] input[type="time"]')));
    const typen = await page.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll<HTMLInputElement>('dialog[open] input')].map(input => [
          input.closest('.db-input')?.querySelector('label')?.textContent?.trim() ?? input.id,
          input.type,
        ]),
      ),
    );
    check(
      'EWT-Editor: Tag/Buchungstag als Datum, beginE als Zeit',
      typen.Tag === 'date' && typen.Buchungstag === 'date' && typen.beginE === 'time',
      typen,
    );
    await page.keyboard.press('Escape');
  }

  check('Keine unbehandelten Seitenfehler', seitenfehler.length === 0, seitenfehler);
} catch (error) {
  check('Ablauf ohne Ausnahme', false, String(error));
  const bild = `${tmpdir()}/livetest-fehler.png`;
  await page.screenshot({ path: bild }).catch(() => undefined);
  console.log(`Screenshot: ${bild}`);
} finally {
  if (konsolenfehler.length > 0)
    console.log(`\nKonsolenfehler (${konsolenfehler.length}):\n  ${konsolenfehler.slice(0, 15).join('\n  ')}`);
  await browser.close();
  await backend.aufraeumen();
}

const fehler = ergebnisse.filter(e => !e.ok);
console.log(`\n${ergebnisse.length - fehler.length}/${ergebnisse.length} Pruefungen ok`);
process.exit(fehler.length > 0 ? 1 : 0);
