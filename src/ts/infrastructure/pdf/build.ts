import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib';
import { FORMAT, get } from '@otto-kirchheim/nebengeld-shared';
import type { Daten, Version, Zeile } from '@otto-kirchheim/nebengeld-shared';
import { zeichne } from './zeichne';
import { wert, type Kontext } from './wert';
import { verteile } from './verteile';

/**
 * Renderer-Grundgerüst (Phase 3-5) — noch ohne `resolve()`-Anbindung (folgt in Phase 6).
 * Wählt anhand der Zeilenzahl zwischen `einseitig`/`mehrseitig` und verteilt bei Mehrseitigkeit
 * über `verteile()` auf die Layout-Seiten (inkl. Wiederholseite und Waisenzeilen-Schutz).
 * `signaturPng` ist optional — bei fehlendem Input bleibt die Signaturfläche leer (siehe
 * Entscheidungsdialog "Jetzt unterschreiben?" im aufrufenden Code, Kandidat E: kein
 * Nachsignieren eines bereits heruntergeladenen PDFs vorgesehen).
 */
export async function build(cfg: Version & { formular: string }, daten: Daten, signaturPng?: string): Promise<Uint8Array> {
  const alle = (get(daten, cfg.zeilen.quelle) as Zeile[] | undefined) ?? [];
  const layout = alle.length <= cfg.einseitig.seiten[0].maxZeilen ? cfg.einseitig : cfg.mehrseitig;

  const vorlage = await PDFDocument.load(await fetch(layout.template).then(r => r.arrayBuffer()));
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const bloecke = verteile(alle, layout);
  let bisher: Zeile[] = [];

  for (const [i, block] of bloecke.entries()) {
    const { def } = block;
    const [seite] = await pdf.copyPages(vorlage, [def.quelle]);
    pdf.addPage(seite);
    const kontext: Kontext = { $seite: block.zeilen, $bisher: bisher };

    for (const [key, f] of Object.entries(def.kopf)) zeichne(seite, wert(f, key, daten, kontext), f, font);

    let y = def.startY;
    for (const zeile of block.zeilen) {
      for (const sp of cfg.zeilen.spalten) {
        const roh = zeile[sp.key];
        const txt = sp.format ? FORMAT[sp.format](roh) : String(roh ?? '');
        zeichne(seite, txt, { ...sp, y }, font);
      }
      y -= cfg.zeilen.hoehe;
    }

    for (const [key, f] of Object.entries(def.seitenfuss ?? {})) zeichne(seite, wert(f, key, daten, kontext), f, font);

    // Fuß und Unterschrift stehen nur auf der Abschlussseite und rechnen über alle Zeilen.
    const abschlussKontext: Kontext = { $seite: alle, $bisher: [] };
    for (const [key, f] of Object.entries(def.fuss ?? {}))
      zeichne(seite, wert(f, key, daten, abschlussKontext), f, font);

    if (signaturPng && def.signaturBild) {
      const png = await pdf.embedPng(signaturPng);
      const s = def.signaturBild;
      seite.drawImage(png, { x: s.x, y: s.y, ...png.scaleToFit(s.w, s.h) });
    }

    zeichne(seite, `Seite ${i + 1} von ${bloecke.length}`, { x: 500, y: 30, size: 8 }, font);

    bisher = bisher.concat(block.zeilen);
  }

  pdf.setSubject(`${cfg.formular}@${cfg.version}`);
  return pdf.save();
}
