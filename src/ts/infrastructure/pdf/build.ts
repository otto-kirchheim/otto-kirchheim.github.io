import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib';
import { FORMAT, get } from '@otto-kirchheim/nebengeld-shared';
import type { Daten, Version, Zeile } from '@otto-kirchheim/nebengeld-shared';
import { zeichne } from './zeichne';
import { wert, type Kontext } from './wert';
import { verteile } from './verteile';

/**
 * Renderer (Phase 3-6) — verteilt Zeilen über `verteile()` auf `cfg.layout.ersteSeite`/`weitereSeite`
 * (inkl. Wiederholung bei Überlauf und Waisenzeilen-Schutz), noch ohne `resolve()`-Anbindung im
 * Aufrufer selbst (folgt in Phase 9). `signaturPng` ist optional — bei fehlendem Input bleibt die
 * Signaturfläche leer (siehe Entscheidungsdialog "Jetzt unterschreiben?" im aufrufenden Code,
 * Kandidat E: kein Nachsignieren eines bereits heruntergeladenen PDFs vorgesehen).
 */
export async function build(cfg: Version & { formular: string }, daten: Daten, signaturPng?: string): Promise<Uint8Array> {
  const alle = (get(daten, cfg.zeilen.quelle) as Zeile[] | undefined) ?? [];
  const layout = cfg.layout;

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

    // Fuß-/Summenfelder rechnen immer über ALLE Zeilen, unabhängig davon, auf welcher Seite sie
    // stehen (meist die letzte, bei Bereitschaft aber bewusst die erste — siehe SeitenDef.fuss).
    const gesamtKontext: Kontext = { $seite: alle, $bisher: [] };
    for (const [key, f] of Object.entries(def.fuss ?? {})) zeichne(seite, wert(f, key, daten, gesamtKontext), f, font);

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
