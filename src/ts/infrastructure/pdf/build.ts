import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib';
import { FORMAT, get } from '@otto-kirchheim/nebengeld-shared';
import type { Daten, Version, Zeile } from '@otto-kirchheim/nebengeld-shared';
import { zeichne } from './zeichne';
import { wert, type Kontext } from './wert';

/**
 * Grundgerüst des Renderers (Phase 3) — einseitig, ohne Unterschrift/Versionsauflösung.
 * Mehrseitigkeit (`verteile()`) folgt in Phase 5, Signatur in Phase 4, `resolve()`-Anbindung in Phase 6.
 */
export async function build(cfg: Version & { formular: string }, daten: Daten): Promise<Uint8Array> {
  const alle = (get(daten, cfg.zeilen.quelle) as Zeile[] | undefined) ?? [];
  const def = cfg.einseitig.seiten[0];

  const vorlage = await PDFDocument.load(await fetch(cfg.einseitig.template).then(r => r.arrayBuffer()));
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const [seite] = await pdf.copyPages(vorlage, [def.quelle]);
  pdf.addPage(seite);

  const kontext: Kontext = { $seite: alle, $bisher: [] };

  for (const [key, f] of Object.entries(def.kopf)) zeichne(seite, wert(f, key, daten, kontext), f, font);

  let y = def.startY;
  for (const zeile of alle) {
    for (const sp of cfg.zeilen.spalten) {
      const roh = zeile[sp.key];
      const txt = sp.format ? FORMAT[sp.format](roh) : String(roh ?? '');
      zeichne(seite, txt, { ...sp, y }, font);
    }
    y -= cfg.zeilen.hoehe;
  }

  for (const [key, f] of Object.entries(def.fuss ?? {})) zeichne(seite, wert(f, key, daten, kontext), f, font);

  pdf.setSubject(`${cfg.formular}@${cfg.version}`);
  return pdf.save();
}
