import { PDFDocument, StandardFonts, type PDFFont } from '@cantoo/pdf-lib';
import { hoeheFuer, spaltenFuer, startYFuer } from './spaltenFuer';
import { loeseListenAuf } from './listen';
import type { ListenAufloesung } from './listen';
import { tabellenZeilen } from './tabellenZeilen';
import type { Daten, Schriftart, Spalte, SonderZeileZelle, Version } from '@otto-kirchheim/nebengeld-shared';
import { zeichne, type FontSet } from './zeichne';
import { sonderZeileZelleWert, wert, zeilenFuerUeber, type Kontext, type TabellenZeilen } from './wert';
import { spaltenWert } from './spaltenWert';
import { dreheTabellenZelle } from './tabellenDrehung';
import { verteile } from './verteile';

/** Standard-14-Schnitte je wählbarer Familie (`Layout.schriftart`). Einbetten kostet nichts --
 *  pdf-lib legt für Standard-Fonts keine Font-Bytes ins PDF. */
const STANDARD_FAMILIEN: Record<string, [StandardFonts, StandardFonts, StandardFonts, StandardFonts]> = {
  helvetica: [
    StandardFonts.Helvetica,
    StandardFonts.HelveticaBold,
    StandardFonts.HelveticaOblique,
    StandardFonts.HelveticaBoldOblique,
  ],
  times: [
    StandardFonts.TimesRoman,
    StandardFonts.TimesRomanBold,
    StandardFonts.TimesRomanItalic,
    StandardFonts.TimesRomanBoldItalic,
  ],
  courier: [
    StandardFonts.Courier,
    StandardFonts.CourierBold,
    StandardFonts.CourierOblique,
    StandardFonts.CourierBoldOblique,
  ],
};

const SCHNITTE = ['normal', 'fett', 'kursiv', 'fettKursiv'] as const;
type Schnitt = (typeof SCHNITTE)[number];

/** Font-Bytes je Schnitt einer in der Vorlage eingebetteten Familie, unter dem Familien-Wert
 *  (`vorlage:<Name>`). Nur die Editor-Vorschau reicht sie durch -- der Download-Pfad ruft `build()`
 *  ohne diesen Parameter, `vorlage:*` fällt dort auf Helvetica zurück. */
export type EingebetteteFonts = Map<string, Partial<Record<Schnitt, Uint8Array>>>;

/** Familie eines Schnitts: `schriftart` ist entweder eine Familie für alle vier oder ein Objekt je
 *  Schnitt (fehlt ein Schnitt, gilt `normal`, sonst `'helvetica'`). */
function familieFuerSchnitt(schriftart: Schriftart | undefined, schnitt: Schnitt): string {
  if (!schriftart) return 'helvetica';
  if (typeof schriftart === 'string') return schriftart;
  return schriftart[schnitt] ?? schriftart.normal ?? 'helvetica';
}

async function ladeSchnitt(
  pdf: PDFDocument,
  familie: string,
  schnitt: Schnitt,
  eingebettet: EingebetteteFonts | undefined,
): Promise<PDFFont> {
  const index = SCHNITTE.indexOf(schnitt);
  if (familie.startsWith('vorlage:')) {
    // Nur die Bytes GENAU dieses Schnitts -- eine eingebettete Familie ohne z.B. Kursiv soll dort
    // nicht den aufrechten Normal-Schnitt zeigen, sondern Helvetica im passenden Schnitt.
    const bytes = eingebettet?.get(familie)?.[schnitt];
    if (bytes) {
      try {
        return await pdf.embedFont(bytes);
      } catch (fehler) {
        console.warn(`Vorlagen-Schrift "${familie}" (${schnitt}) nicht einbettbar -- Helvetica:`, fehler);
      }
    } else {
      console.warn(`Vorlagen-Schrift "${familie}" hat keinen ${schnitt}-Schnitt -- Helvetica-${schnitt}.`);
    }
    return pdf.embedFont(STANDARD_FAMILIEN.helvetica![index]!);
  }
  const fam = STANDARD_FAMILIEN[familie] ?? STANDARD_FAMILIEN.helvetica!;
  return pdf.embedFont(fam[index]!);
}

async function ladeFontSet(
  pdf: PDFDocument,
  schriftart: Schriftart | undefined,
  eingebettet?: EingebetteteFonts,
): Promise<FontSet> {
  const familien = Object.fromEntries(SCHNITTE.map(s => [s, familieFuerSchnitt(schriftart, s)])) as Record<
    Schnitt,
    string
  >;
  // fontkit nur laden, wenn wirklich eine eingebettete Familie im Spiel ist -- bleibt sonst aus dem
  // Haupt-Bundle des Download-Pfads.
  if (Object.values(familien).some(f => f.startsWith('vorlage:'))) {
    pdf.registerFontkit((await import('@pdf-lib/fontkit')).default);
  }
  return {
    normal: await ladeSchnitt(pdf, familien.normal, 'normal', eingebettet),
    fett: await ladeSchnitt(pdf, familien.fett, 'fett', eingebettet),
    kursiv: await ladeSchnitt(pdf, familien.kursiv, 'kursiv', eingebettet),
    fettKursiv: await ladeSchnitt(pdf, familien.fettKursiv, 'fettKursiv', eingebettet),
  };
}

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
  eingebetteteFonts?: EingebetteteFonts,
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
  const fonts = await ladeFontSet(pdf, layout.schriftart, eingebetteteFonts);

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

    const { width: seiteW, height: seiteH } = seite.getSize();

    for (const bereich of def.bereiche) {
      const tabelle = cfg.tabellen[bereich.tabelle];
      if (!tabelle) continue;
      // Spalten kommen aus dem Seitenbereich, wenn er eigene mitbringt -- eine Folgeseite darf ein
      // anderes Spaltenraster haben als die erste.
      const spalten = spaltenFuer(bereich, tabelle);
      const hoehe = hoeheFuer(bereich, tabelle);
      // Bei gedrehter Vorlage bleibt die Tabellen-Konfiguration aufrecht -- die fertige Zelle wird
      // um den Seitenmittelpunkt gedreht (siehe `TabellenDef.drehung`).
      const drehung = bereich.drehung ?? tabelle.drehung ?? 0;
      let y = startYFuer(bereich, tabelle);
      for (const zeile of block.zeilen[bereich.tabelle] ?? []) {
        // Die Spalte liefert nur die x-Kanten; die y-Kanten der Zelle kommen aus der Zeilenhöhe.
        // Ohne sie wäre `y` die Grundlinie und der Text säße auf der Zeilenunterkante statt mittig.
        for (const sp of spalten)
          zeichne(
            seite,
            spaltenWert(sp, zeile, listen[bereich.tabelle]),
            dreheTabellenZelle({ ...sp, y, y2: y + hoehe }, drehung, seiteW, seiteH),
            fonts,
          );
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
            dreheTabellenZelle(zellGeometrie(spalte, zelle, platz.y, platz.y2), drehung, seiteW, seiteH),
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
