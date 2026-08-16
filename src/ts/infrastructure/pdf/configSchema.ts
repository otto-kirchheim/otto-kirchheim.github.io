import { z } from 'zod';
import type { Registry } from '@otto-kirchheim/nebengeld-shared';

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
  'wochentag',
  'monatJahr',
  'uhrzeit',
  'stunden',
  'liste',
  'grossbuchstaben',
]);
const opNameSchema = z.enum(['summe', 'anzahl', 'max']);
const zeilenOpNameSchema = z.enum(['produkt', 'summe', 'differenz', 'quotient', 'zeitdifferenz']);

const berechnetSchema = z.object({
  op: opNameSchema,
  ueber: z.string(),
  feld: z.string().optional(),
  tabelle: z.string().optional(),
});

const zeilenBerechnetSchema = z.object({
  op: zeilenOpNameSchema,
  operanden: z.array(z.union([z.string(), z.number()])),
});

const bedingungSchema = z.object({
  feld: z.string(),
  werte: z.array(z.union([z.string(), z.number()])),
  dann: z.string(),
});

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
  maxZeilen: z.number(),
});

const seitenDefSchema = z.object({
  quelle: z.number(),
  bereiche: z.array(tabellenBereichSchema),
  felder: z.record(z.string(), feldSchema),
  signaturBild: signaturBildSchema.optional(),
});

const tabellenDefSchema = z.object({
  quelle: z.string(),
  filter: z.object({ feld: z.string(), werte: z.array(z.union([z.string(), z.number()])) }).optional(),
  hoehe: z.number(),
  spalten: z.array(spalteSchema),
});

const layoutSchema = z.object({
  template: z.string(),
  ersteSeite: seitenDefSchema,
  weitereSeite: seitenDefSchema.optional(),
});

/**
 * Was der Admin-Editor bearbeitet: Layout ohne `template` (die URL entsteht serverseitig aus der
 * hochgeladenen Vorlage) plus die Tabellen. Gleiche Form wie `konfig` + `tabellen` im Request an
 * `POST /formulare/:f/versionen`.
 */
export const konfigSchema = z.object({
  ersteSeite: seitenDefSchema,
  weitereSeite: seitenDefSchema.optional(),
  tabellen: z.record(z.string(), tabellenDefSchema),
});

const versionSchema = z.object({
  version: z.string(),
  gueltigVon: z.string(),
  gueltigBis: z.string().nullable(),
  layout: layoutSchema,
  tabellen: z.record(z.string(), tabellenDefSchema),
});

const formularSchema = z.object({
  titel: z.string(),
  versionen: z.array(versionSchema),
});

export const registrySchema = z.record(z.string(), formularSchema);

/** Validiert eine vom Server geladene Registry-Konfiguration; wirft `ZodError` bei ungültiger Form. */
export function parseRegistry(json: unknown): Registry {
  return registrySchema.parse(json);
}
