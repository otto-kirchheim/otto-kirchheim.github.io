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
  listenKopf: listenPlatzSchema.extend({ tabelle: z.string() }).optional(),
  drehung: drehungSchema.optional(),
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
  startY: z.number(),
  // Ganzzahl und mindestens 1: eine halbe oder negative Zeilenzahl ist keine gültige Kapazität und
  // liefe im Renderer auf eine leere oder endlos wiederholte Seite hinaus.
  maxZeilen: z.number().int().positive(),
  /** Seitenspezifisches Spaltenraster; ohne Angabe gelten die Spalten der Tabelle. */
  spalten: z.array(spalteSchema).optional(),
});

const seitenDefSchema = z.object({
  quelle: z.number().int().nonnegative(),
  bereiche: z.array(tabellenBereichSchema),
  felder: z.record(z.string(), feldSchema),
  signaturBild: signaturBildSchema.optional(),
  wiederholt: z.boolean().optional(),
});

const tabellenDefSchema = z.object({
  quelle: z.string(),
  filter: z.object({ feld: z.string(), werte: z.array(z.union([z.string(), z.number()])) }).optional(),
  hoehe: z.number().positive(),
  spalten: z.array(spalteSchema),
  listen: z.record(z.string(), listenGruppeSchema).optional(),
});

const layoutSchema = z.object({
  template: z.string(),
  seiten: z.array(seitenDefSchema).min(1),
});

/**
 * Was der Admin-Editor bearbeitet: Layout ohne `template` (die URL entsteht serverseitig aus der
 * hochgeladenen Vorlage) plus die Tabellen. Gleiche Form wie `konfig` + `tabellen` im Request an
 * `POST /formulare/:f/versionen`.
 */
export const konfigSchema = z.object({
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
