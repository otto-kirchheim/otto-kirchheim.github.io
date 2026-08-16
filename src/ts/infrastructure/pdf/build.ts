import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib';
import { tabellenZeilen } from '@otto-kirchheim/nebengeld-shared';
import type { Daten, Version } from '@otto-kirchheim/nebengeld-shared';
import { zeichne } from './zeichne';
import { wert, type Kontext, type TabellenZeilen } from './wert';
import { spaltenWert } from './spaltenWert';
import { verteile } from './verteile';

function verbinde(a: TabellenZeilen, b: TabellenZeilen): TabellenZeilen {
  const zusammen: TabellenZeilen = { ...a };
  for (const [name, zeilen] of Object.entries(b)) zusammen[name] = [...(zusammen[name] ?? []), ...zeilen];
  return zusammen;
}

/**
 * Renderer — verteilt die Zeilen aller Tabellen über `verteile()` auf `cfg.layout.ersteSeite`/
 * `weitereSeite` (inkl. Wiederholung bei Überlauf und Waisenzeilen-Schutz), noch ohne
 * `resolve()`-Anbindung im Aufrufer selbst (folgt in Phase 9). `signaturPng` ist optional — bei
 * fehlendem Input bleibt die Signaturfläche leer (siehe Entscheidungsdialog "Jetzt unterschreiben?"
 * im aufrufenden Code, Kandidat E: kein Nachsignieren eines heruntergeladenen PDFs vorgesehen).
 *
 * Die Seitenzahl ist bewusst NICHT fest eingebaut: sie entsteht als normales Feld mit festem Text
 * und den Platzhaltern `{seite}`/`{seiten}` — Wortlaut und Position bestimmt damit die Konfiguration.
 */
export async function build(cfg: Version & { formular: string }, daten: Daten, signaturPng?: string): Promise<Uint8Array> {
  const layout = cfg.layout;
  const alle: TabellenZeilen = Object.fromEntries(Object.entries(cfg.tabellen).map(([name, def]) => [name, tabellenZeilen(daten, def)]));

  const vorlage = await PDFDocument.load(await fetch(layout.template).then(r => r.arrayBuffer()));
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const bloecke = verteile(alle, layout);
  let bisher: TabellenZeilen = {};

  for (const [i, block] of bloecke.entries()) {
    const { def } = block;
    const [seite] = await pdf.copyPages(vorlage, [def.quelle]);
    pdf.addPage(seite);
    const kontext: Kontext = { $seite: block.zeilen, $bisher: bisher, $alle: alle, seite: i + 1, seiten: bloecke.length };

    // Ein einziger Feld-Bereich: Kopfangaben, Zwischen-/Gesamtsummen, Übertragszeile und
    // Seitenzahl unterscheiden sich nur durch Koordinaten und `berechnet`, nicht durch eine
    // eigene Renderer-Phase.
    for (const [key, f] of Object.entries(def.felder)) zeichne(seite, wert(f, key, daten, kontext), f, font);

    for (const bereich of def.bereiche) {
      const tabelle = cfg.tabellen[bereich.tabelle];
      if (!tabelle) continue;
      let y = bereich.startY;
      for (const zeile of block.zeilen[bereich.tabelle] ?? []) {
        for (const sp of tabelle.spalten) zeichne(seite, spaltenWert(sp, zeile), { ...sp, y }, font);
        y -= tabelle.hoehe;
      }
    }

    if (signaturPng && def.signaturBild) {
      const png = await pdf.embedPng(signaturPng);
      const s = def.signaturBild;
      seite.drawImage(png, { x: s.x, y: s.y, ...png.scaleToFit(s.w, s.h) });
    }

    bisher = verbinde(bisher, block.zeilen);
  }

  pdf.setSubject(`${cfg.formular}@${cfg.version}`);
  return pdf.save();
}
