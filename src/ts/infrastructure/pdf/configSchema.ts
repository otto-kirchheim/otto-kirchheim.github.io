import { z } from 'zod';
import type { Registry, Version, ZeilenBerechnet } from '@otto-kirchheim/nebengeld-shared';

// Spiegelt das Typsystem aus @otto-kirchheim/nebengeld-shared (formular/types.ts) --
// die vom Server gelieferte Konfiguration ist zur Laufzeit `unknown` und muss vor der
// Verwendung (insbesondere vor `resolve()`) validiert werden.

const ausrichtungSchema = z.enum(['links', 'rechts', 'zentriert']);
const formatNameSchema = z.enum([
  'waehrung',
  'zahl',
  'ganzzahl',
  'datum',
  'datumKurz',
  'tag',
  'tagZweistellig',
  'wochentag',
  'monatJahr',
  'monatName',
  'monatNameKurz',
  'uhrzeit',
  'stunden',
  'liste',
  'grossbuchstaben',
  'jaNein',
  'oe',
]);
const opNameSchema = z.enum(['summe', 'anzahl', 'max', 'letztesDatum']);
const zeilenOpNameSchema = z.enum(['produkt', 'summe', 'differenz', 'quotient', 'zeitdifferenz', 'zeitspanne']);

const berechnetSchema = z.object({
  op: opNameSchema,
  ueber: z.string(),
  feld: z.string().optional(),
  tabellen: z.array(z.string()).optional(),
  maxTage: z.number().optional(),
  // Gleiche Form wie listenPlatzSchema (unten definiert, hier nicht wiederverwendbar wegen der
  // Deklarationsreihenfolge) + tabelle (wie bei Feld.listenKopf) + art. Ohne `index`: Summe über
  // ALLE Einträge der Gruppe (Gesamtsumme) statt über einen Platz, `art` gilt genauso.
  liste: z
    .object({
      tabelle: z.string(),
      gruppe: z.string(),
      index: z.number().int().nonnegative().optional(),
      // Gleiche Werte wie sonderZeileArtSchema, ohne 'kopf' -- Default 'summe' (roh).
      art: z.enum(['summe', 'bereinigt', 'summeGeld']).optional(),
    })
    .optional(),
});

// Rekursiv: ein Operand darf selbst eine Rechnung sein (geklammerte Zwischenrechnung). Zod braucht
// dafür `z.lazy` plus die explizite Typannotation, da der Typ sich sonst selbst referenziert.
const zeilenBerechnetSchema: z.ZodType<ZeilenBerechnet> = z.lazy(() =>
  z.object({
    op: zeilenOpNameSchema,
    operanden: z.array(z.union([z.string(), z.number(), zeilenBerechnetSchema])),
  }),
);

const bereichSchema = z.object({
  von: z.union([z.string(), z.number()]),
  bis: z.union([z.string(), z.number()]),
});

const bedingungSchema = z.object({
  feld: z.string().optional(),
  berechnet: zeilenBerechnetSchema.optional(),
  werte: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
  bereich: bereichSchema.optional(),
  dann: z.string(),
});

/** Gegenstück zu `bedingungSchema` auf Feldebene -- `berechnet` ist hier eine Aggregation
 * (`berechnetSchema`), kein Zeilenbezug wie bei einer Tabellenspalte. */
const feldBedingungSchema = z.object({
  feld: z.string().optional(),
  berechnet: berechnetSchema.optional(),
  werte: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
  bereich: bereichSchema.optional(),
  dann: z.string(),
});

const listenPlatzSchema = z.object({
  gruppe: z.string(),
  index: z.number().int().nonnegative(),
});

/** Dynamische Spaltengruppe: welche Schlüssel welchen Platz belegen, entscheiden erst die Daten. */
const listenGruppeSchema = z.object({
  quelle: z.string(),
  schluessel: z.string(),
  wert: z.string(),
  auswahl: z.array(z.string()).optional(),
  beschriftungen: z.record(z.string(), z.string()).optional(),
});

const sonderZeileArtSchema = z.enum(['kopf', 'summe', 'bereinigt', 'summeGeld']);

/**
 * Zelle einer Sonderzeile: referenziert eine Spalte über ihre Position in `TabellenDef.spalten`,
 * nicht über `key` -- der bleibt sowohl bei dynamischen (`listenPlatz`) als auch bei Ankreuz-Spalten
 * (`wenn`) regelmäßig leer und mehrfach vergeben.
 */
const sonderZeileZelleSchema = z.object({
  spaltenIndex: z.number().int().nonnegative(),
  art: sonderZeileArtSchema,
  format: formatNameSchema.optional(),
  // Ohne Angabe gelten jeweils die Werte der referenzierten Spalte.
  size: z.number().optional(),
  align: ausrichtungSchema.optional(),
  autoGroesse: z.boolean().optional(),
  fett: z.boolean().optional(),
  kursiv: z.boolean().optional(),
  unterstrichen: z.boolean().optional(),
});

/** Kopf-/Fußzeilen-Inhalt einer Tabelle -- WO er erscheint, legt `tabellenBereichSchema.sonderzeilen` fest. */
const sonderZeileSchema = z.object({
  ueber: z.string().optional(),
  zellen: z.array(sonderZeileZelleSchema),
});

const drehungSchema = z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]);

const feldSchema = z.object({
  x: z.number(),
  y: z.number(),
  x2: z.number().optional(),
  y2: z.number().optional(),
  size: z.number(),
  autoGroesse: z.boolean().optional(),
  umbruch: z.boolean().optional(),
  align: ausrichtungSchema.optional(),
  format: formatNameSchema.optional(),
  berechnet: berechnetSchema.optional(),
  text: z.string().optional(),
  quellen: z.array(z.string()).optional(),
  trenner: z.string().optional(),
  wenn: feldBedingungSchema.optional(),
  nurBeiSignatur: z.boolean().optional(),
  listenKopf: listenPlatzSchema.extend({ tabelle: z.string() }).optional(),
  drehung: drehungSchema.optional(),
  fett: z.boolean().optional(),
  kursiv: z.boolean().optional(),
  unterstrichen: z.boolean().optional(),
  label: z.string().optional(),
});

const spalteSchema = z.object({
  key: z.string(),
  x: z.number(),
  x2: z.number().optional(),
  size: z.number(),
  autoGroesse: z.boolean().optional(),
  umbruch: z.boolean().optional(),
  align: ausrichtungSchema.optional(),
  format: formatNameSchema.optional(),
  maxBreite: z.number().optional(),
  berechnet: zeilenBerechnetSchema.optional(),
  wenn: bedingungSchema.optional(),
  listenPlatz: listenPlatzSchema.optional(),
  drehung: drehungSchema.optional(),
  fett: z.boolean().optional(),
  kursiv: z.boolean().optional(),
  unterstrichen: z.boolean().optional(),
  label: z.string().optional(),
});

const signaturBildSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

const tabellenBereichSchema = z.object({
  tabelle: z.string(),
  /** Seitenspezifische Startposition; ohne Angabe gilt die Startposition der Tabelle. */
  startY: z.number().optional(),
  // Ganzzahl und mindestens 1: eine halbe oder negative Zeilenzahl ist keine gültige Kapazität und
  // liefe im Renderer auf eine leere oder endlos wiederholte Seite hinaus.
  /** Seitenspezifische Zeilenzahl; ohne Angabe gilt die Zeilenzahl der Tabelle. */
  maxZeilen: z.number().int().positive().optional(),
  /** Seitenspezifisches Spaltenraster; ohne Angabe gelten die Spalten der Tabelle. */
  spalten: z.array(spalteSchema).optional(),
  /** Seitenspezifische Zeilenhöhe; ohne Angabe gilt die Höhe der Tabelle. */
  hoehe: z.number().positive().optional(),
  /** Seitenspezifische Drehung; ohne Angabe gilt `tabellenDefSchema.drehung`. */
  drehung: drehungSchema.optional(),
  /** Platzierungen der Tabellen-Sonderzeilen auf dieser Seite; `name` darf mehrfach vorkommen
   *  (z.B. Überschrift oben UND als Kopie unten). */
  sonderzeilen: z
    .array(
      z.object({
        name: z.string(),
        y: z.number(),
        y2: z.number().optional(),
      }),
    )
    .optional(),
});

const seitenDefSchema = z.object({
  quelle: z.number().int().nonnegative(),
  /** Punkt-Maße der Vorlagenseite, gegen die die Koordinaten gesetzt wurden -- vom Editor gefüllt,
   *  Referenz für die Skalierung beim Vorlagen-Wechsel. Der Renderer nutzt sie nicht. */
  groesse: z.object({ w: z.number(), h: z.number() }).optional(),
  bereiche: z.array(tabellenBereichSchema),
  felder: z.record(z.string(), feldSchema),
  signaturBild: signaturBildSchema.optional(),
  wiederholt: z.boolean().optional(),
});

const tabellenDefSchema = z.object({
  quelle: z.string(),
  filter: z.object({ feld: z.string(), werte: z.array(z.union([z.string(), z.number()])) }).optional(),
  /** Globaler Standard für Seiten ohne eigenen Wert, siehe `tabellenBereichSchema.startY`. */
  startY: z.number(),
  /** Globaler Standard für Seiten ohne eigenen Wert, siehe `tabellenBereichSchema.maxZeilen`. */
  maxZeilen: z.number().int().positive(),
  hoehe: z.number().positive(),
  spalten: z.array(spalteSchema),
  /** Druckt die Tabelle gedreht (siehe `TabellenDef.drehung` in shared); Konfig-Werte bleiben aufrecht. */
  drehung: drehungSchema.optional(),
  listen: z.record(z.string(), listenGruppeSchema).optional(),
  sonderzeilen: z.record(z.string(), sonderZeileSchema).optional(),
});

/** Schrift fürs ganze Formular: eine Familie für alles oder je Schnitt eine eigene (siehe
 *  `Schriftart` in shared). Familien-Werte: `'helvetica'|'times'|'courier'|'vorlage:<Name>'`. */
const schriftartSchema = z.union([
  z.string(),
  z
    .object({
      normal: z.string().optional(),
      fett: z.string().optional(),
      kursiv: z.string().optional(),
      fettKursiv: z.string().optional(),
    })
    .strict(),
]);

const layoutSchema = z.object({
  template: z.string(),
  schriftart: schriftartSchema.optional(),
  seiten: z.array(seitenDefSchema).min(1),
});

/**
 * Was der Admin-Editor bearbeitet: Layout ohne `template` (die URL entsteht serverseitig aus der
 * hochgeladenen Vorlage) plus die Tabellen. Gleiche Form wie `konfig` + `tabellen` im Request an
 * `POST /formulare/:f/versionen`.
 */
export const konfigSchema = z.object({
  schriftart: schriftartSchema.optional(),
  seiten: z.array(seitenDefSchema).min(1),
  tabellen: z.record(z.string(), tabellenDefSchema),
});

export const versionSchema = z.object({
  version: z.string(),
  gueltigVon: z.string(),
  gueltigBis: z.string().nullable(),
  layout: layoutSchema,
  tabellen: z.record(z.string(), tabellenDefSchema),
});

/** Validiert die vom Server aufgelöste Einzel-Version (`GET /formulare/:f?stichtag=`) -- anders als
 * `parseRegistry()`, das eine ganze Registry aus mehreren Formularen/Versionen erwartet. */
export function parseVersion(json: unknown): Version {
  return versionSchema.parse(json);
}

const formularSchema = z.object({
  titel: z.string(),
  versionen: z.array(versionSchema),
});

export const registrySchema = z.record(z.string(), formularSchema);

/** Validiert eine vom Server geladene Registry-Konfiguration; wirft `ZodError` bei ungültiger Form. */
export function parseRegistry(json: unknown): Registry {
  return registrySchema.parse(json);
}
