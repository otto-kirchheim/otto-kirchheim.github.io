import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib';
import { hoeheFuer, spaltenFuer, startYFuer } from './spaltenFuer';
import { loeseListenAuf } from './listen';
import type { ListenAufloesung } from './listen';
import { tabellenZeilen } from './tabellenZeilen';
import type { Daten, Spalte, SonderZeileZelle, Version } from '@otto-kirchheim/nebengeld-shared';
import { zeichne, type FontSet } from './zeichne';
import { sonderZeileZelleWert, wert, zeilenFuerUeber, type Kontext, type TabellenZeilen } from './wert';
import { spaltenWert } from './spaltenWert';
import { verteile } from './verteile';

function verbinde(a: TabellenZeilen, b: TabellenZeilen): TabellenZeilen {
  const zusammen: TabellenZeilen = { ...a };
  for (const [name, zeilen] of Object.entries(b)) zusammen[name] = [...(zusammen[name] ?? []), ...zeilen];
  return zusammen;
}

/**
 * Spalte, die eine Sonderzeilen-Zelle referenziert -- über die Position, nicht `key` (der bleibt bei
 * dynamischen UND Ankreuz-Spalten regelmäßig leer, siehe `SonderZeileZelle`-Kommentar in `shared`).
 * Nach einem Löschen/Verschieben von Spalten kann der Index ins Leere zeigen -- die Zelle wird dann
 * beim Rendern übersprungen statt eine falsche Spalte zu treffen.
 */
export function spalteFuerZelle(spalten: Spalte[], zelle: SonderZeileZelle): Spalte | undefined {
  return spalten[zelle.spaltenIndex];
}

/**
 * Zeichen-Geometrie einer Sonderzeilen-Zelle: x/x2 immer von der Spalte, `size`/`align`/
 * `autoGroesse` von der Zelle ÜBERSCHRIEBEN, wenn gesetzt (z.B. eine fett-große Gesamtsumme bei
 * sonst kleiner Datenzeilen-Schrift) -- ohne Angabe gilt jeweils der Wert der Spalte.
 */
export function zellGeometrie(
  spalte: Spalte,
  zelle: SonderZeileZelle,
  y: number,
  y2: number | undefined,
): Spalte & { y: number; y2?: number } {
  return {
    ...spalte,
    y,
    y2,
    size: zelle.size ?? spalte.size,
    align: zelle.align ?? spalte.align,
    autoGroesse: zelle.autoGroesse ?? spalte.autoGroesse,
    schriftart: zelle.schriftart ?? spalte.schriftart,
    fett: zelle.fett ?? spalte.fett,
    kursiv: zelle.kursiv ?? spalte.kursiv,
    unterstrichen: zelle.unterstrichen ?? spalte.unterstrichen,
  };
}

/**
 * Renderer — verteilt die Zeilen aller Tabellen über `verteile()` auf die Seitenfolge
 * `cfg.layout.seiten` (inkl. Wiederholung bei Überlauf), noch ohne
 * `resolve()`-Anbindung im Aufrufer selbst (folgt in Phase 9). `signaturPng` ist optional — bei
 * fehlendem Input bleibt die Signaturfläche leer (siehe Entscheidungsdialog "Jetzt unterschreiben?"
 * im aufrufenden Code, Kandidat E: kein Nachsignieren eines heruntergeladenen PDFs vorgesehen).
 * `digitaleSignatur` kommt aus demselben Dialog (`SignaturErgebnis.digital`) und ist UNABHÄNGIG
 * von `signaturPng` -- auch "Ohne Unterschrift" liefert kein `signaturPng`, unterdrückt aber (anders
 * als "Digital") kein `Feld.nurBeiSignatur` (siehe `Kontext.digitaleSignatur`).
 *
 * Die Seitenzahl ist bewusst NICHT fest eingebaut: sie entsteht als normales Feld mit festem Text
 * und den Platzhaltern `{seite}`/`{seiten}` — Wortlaut und Position bestimmt damit die Konfiguration.
 */
export async function build(
  cfg: Version & { formular: string },
  daten: Daten,
  signaturPng?: string,
  digitaleSignatur?: boolean,
): Promise<Uint8Array> {
  const layout = cfg.layout;
  const alle: TabellenZeilen = Object.fromEntries(
    Object.entries(cfg.tabellen).map(([name, def]) => [name, tabellenZeilen(daten, def)]),
  );

  // Platzvergabe der dynamischen Spalten (EZ-Zulagen) EINMAL über alle Zeilen -- je Seite bestimmt
  // stünde auf Seite 2 womöglich eine andere Zulage über derselben Spalte.
  const listen: Record<string, ListenAufloesung> = {};
  for (const [name, def] of Object.entries(cfg.tabellen)) {
    const aufgeloest = loeseListenAuf(def, alle[name] ?? []);
    if (aufgeloest) listen[name] = aufgeloest;
  }

  const vorlage = await PDFDocument.load(await fetch(layout.template).then(r => r.arrayBuffer()));
  const pdf = await PDFDocument.create();
  // Standard-14-Familien: `embedFont` bettet für sie keine Bytes ein, alle drei einbinden kostet
  // also nichts. `Zelle.schriftart` wählt die Familie, `waehleFont()` den Schnitt.
  const fonts: FontSet = {
    helvetica: {
      normal: await pdf.embedFont(StandardFonts.Helvetica),
      fett: await pdf.embedFont(StandardFonts.HelveticaBold),
      kursiv: await pdf.embedFont(StandardFonts.HelveticaOblique),
      fettKursiv: await pdf.embedFont(StandardFonts.HelveticaBoldOblique),
    },
    times: {
      normal: await pdf.embedFont(StandardFonts.TimesRoman),
      fett: await pdf.embedFont(StandardFonts.TimesRomanBold),
      kursiv: await pdf.embedFont(StandardFonts.TimesRomanItalic),
      fettKursiv: await pdf.embedFont(StandardFonts.TimesRomanBoldItalic),
    },
    courier: {
      normal: await pdf.embedFont(StandardFonts.Courier),
      fett: await pdf.embedFont(StandardFonts.CourierBold),
      kursiv: await pdf.embedFont(StandardFonts.CourierOblique),
      fettKursiv: await pdf.embedFont(StandardFonts.CourierBoldOblique),
    },
  };

  const bloecke = verteile(alle, layout, cfg.tabellen);
  // Einmal je Dokument bestimmt, nicht je Seite -- sonst könnte ein Lauf über Mitternacht zwei
  // verschiedene Datumsangaben im selben PDF erzeugen.
  const heute = new Date();
  let bisher: TabellenZeilen = {};

  for (const [i, block] of bloecke.entries()) {
    const { def } = block;
    const [seite] = await pdf.copyPages(vorlage, [def.quelle]);
    pdf.addPage(seite);
    // `$laufend` ist die Summe bis EINSCHLIESSLICH dieser Seite -- auf der letzten Seite gleich
    // `$alle`, davor die Zwischensumme, die eine Übertragsrechnung fortschreibt.
    const kontext: Kontext = {
      $seite: block.zeilen,
      $bisher: bisher,
      $laufend: verbinde(bisher, block.zeilen),
      $alle: alle,
      seite: i + 1,
      seiten: bloecke.length,
      heute,
      listen,
      digitaleSignatur: Boolean(digitaleSignatur),
    };

    // Ein einziger Feld-Bereich: Kopfangaben, Zwischen-/Gesamtsummen, Übertragszeile und
    // Seitenzahl unterscheiden sich nur durch Koordinaten und `berechnet`, nicht durch eine
    // eigene Renderer-Phase.
    for (const [key, f] of Object.entries(def.felder)) zeichne(seite, wert(f, key, daten, kontext), f, fonts);

    for (const bereich of def.bereiche) {
      const tabelle = cfg.tabellen[bereich.tabelle];
      if (!tabelle) continue;
      // Spalten kommen aus dem Seitenbereich, wenn er eigene mitbringt -- eine Folgeseite darf ein
      // anderes Spaltenraster haben als die erste.
      const spalten = spaltenFuer(bereich, tabelle);
      const hoehe = hoeheFuer(bereich, tabelle);
      let y = startYFuer(bereich, tabelle);
      for (const zeile of block.zeilen[bereich.tabelle] ?? []) {
        // Die Spalte liefert nur die x-Kanten; die y-Kanten der Zelle kommen aus der Zeilenhöhe.
        // Ohne sie wäre `y` die Grundlinie und der Text säße auf der Zeilenunterkante statt mittig.
        for (const sp of spalten)
          zeichne(seite, spaltenWert(sp, zeile, listen[bereich.tabelle]), { ...sp, y, y2: y + hoehe }, fonts);
        y -= hoehe;
      }

      // Sonderzeilen (Kopf-/Summenzeilen über mehrere Spalten, siehe SonderZeile): x kommt von der
      // (seiten-aufgelösten!) Spalte, nur y kommt von der Platzierung dieser Seite.
      for (const platz of bereich.sonderzeilen ?? []) {
        const sonderzeile = tabelle.sonderzeilen?.[platz.name];
        if (!sonderzeile) continue;
        const rows = zeilenFuerUeber(sonderzeile.ueber ?? '$alle', bereich.tabelle, kontext);
        for (const zelle of sonderzeile.zellen) {
          const spalte = spalteFuerZelle(spalten, zelle);
          if (!spalte) continue;
          zeichne(
            seite,
            sonderZeileZelleWert(zelle, spalte, bereich.tabelle, rows, daten, kontext),
            zellGeometrie(spalte, zelle, platz.y, platz.y2),
            fonts,
          );
        }
      }
    }

    if (signaturPng && def.signaturBild) {
      const png = await pdf.embedPng(signaturPng);
      const s = def.signaturBild;
      const { width, height } = png.scaleToFit(s.w, s.h);
      seite.drawImage(png, { x: s.x + (s.w - width) / 2, y: s.y + (s.h - height) / 2, width, height });
    }

    bisher = verbinde(bisher, block.zeilen);
  }

  pdf.setSubject(`${cfg.formular}@${cfg.version}`);
  return pdf.save();
}
