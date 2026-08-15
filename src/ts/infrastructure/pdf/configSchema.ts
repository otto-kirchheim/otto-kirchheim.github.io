import { z } from 'zod';
import type { Registry } from '@otto-kirchheim/nebengeld-shared';

// Spiegelt das Typsystem aus @otto-kirchheim/nebengeld-shared (formular/types.ts) --
// die vom Server gelieferte Konfiguration ist zur Laufzeit `unknown` und muss vor der
// Verwendung (insbesondere vor `resolve()`) validiert werden.

const ausrichtungSchema = z.enum(['links', 'rechts']);
const formatNameSchema = z.enum(['waehrung', 'datum']);
const opNameSchema = z.enum(['summe', 'anzahl', 'max']);

const berechnetSchema = z.object({
  op: opNameSchema,
  ueber: z.string(),
  feld: z.string().optional(),
});

const feldSchema = z.object({
  x: z.number(),
  y: z.number(),
  size: z.number(),
  align: ausrichtungSchema.optional(),
  format: formatNameSchema.optional(),
  berechnet: berechnetSchema.optional(),
  label: z.string().optional(),
});

const spalteSchema = z.object({
  key: z.string(),
  x: z.number(),
  size: z.number(),
  align: ausrichtungSchema.optional(),
  format: formatNameSchema.optional(),
  maxBreite: z.number().optional(),
  label: z.string().optional(),
});

const signaturBildSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

const seitenDefSchema = z.object({
  quelle: z.number(),
  maxZeilen: z.number(),
  startY: z.number(),
  kopf: z.record(z.string(), feldSchema),
  seitenfuss: z.record(z.string(), feldSchema).optional(),
  fuss: z.record(z.string(), feldSchema).optional(),
  signaturBild: signaturBildSchema.optional(),
});

const layoutSchema = z.object({
  template: z.string(),
  seiten: z.array(seitenDefSchema),
  wiederholSeite: z.number().optional(),
});

const versionSchema = z.object({
  version: z.string(),
  gueltigVon: z.string(),
  gueltigBis: z.string().nullable(),
  einseitig: layoutSchema,
  mehrseitig: layoutSchema,
  zeilen: z.object({
    quelle: z.string(),
    hoehe: z.number(),
    spalten: z.array(spalteSchema),
  }),
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
