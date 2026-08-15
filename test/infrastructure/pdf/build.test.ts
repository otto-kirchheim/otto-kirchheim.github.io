import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { PDFDocument } from '@cantoo/pdf-lib';
import type { Version } from '@otto-kirchheim/nebengeld-shared';
import { build } from '@/infrastructure/pdf/build';

const vorlagePfad = `${import.meta.dir}/../../fixtures/test_1seitig.pdf`;

globalThis.fetch = vi.fn() as unknown as typeof fetch;

function macheCfg(): Version & { formular: string } {
  return {
    formular: 'ez',
    version: 'v1',
    gueltigVon: '2026-01-01',
    gueltigBis: null,
    einseitig: {
      template: 'test_1seitig.pdf',
      seiten: [
        {
          quelle: 0,
          maxZeilen: 20,
          startY: 700,
          kopf: {
            name: { x: 50, y: 800, size: 12 },
          },
          fuss: {
            summe: {
              x: 500,
              y: 60,
              size: 10,
              align: 'rechts',
              format: 'waehrung',
              berechnet: { op: 'summe', ueber: '$seite', feld: 'betrag' },
            },
          },
        },
      ],
    },
    mehrseitig: { template: 'test_1seitig.pdf', seiten: [] },
    zeilen: {
      quelle: 'zeilen',
      hoehe: 14,
      spalten: [
        { key: 'text', x: 50, size: 10 },
        { key: 'betrag', x: 500, size: 10, align: 'rechts', format: 'waehrung' },
      ],
    },
  };
}

describe('build', () => {
  beforeEach(async () => {
    const bytes = await Bun.file(vorlagePfad).arrayBuffer();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ arrayBuffer: async () => bytes });
  });

  it('erzeugt ein einseitiges PDF mit korrekter Seitenzahl und Subject-Metadaten', async () => {
    const cfg = macheCfg();
    const daten = {
      name: 'Max Mustermann',
      zeilen: [
        { text: 'Zeile 1', betrag: 10 },
        { text: 'Zeile 2', betrag: 5 },
      ],
    };

    const bytes = await build(cfg, daten);
    const doc = await PDFDocument.load(bytes);

    expect(doc.getPageCount()).toBe(1);
    expect(doc.getSubject()).toBe('ez@v1');
  });

  it('lädt die Vorlage über die konfigurierte Template-URL', async () => {
    const cfg = macheCfg();
    await build(cfg, { name: 'X', zeilen: [] });
    expect(globalThis.fetch).toHaveBeenCalledWith('test_1seitig.pdf');
  });

  it('funktioniert auch ohne Zeilen (leere Datenliste)', async () => {
    const cfg = macheCfg();
    const bytes = await build(cfg, { name: 'Leer', zeilen: [] });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });
});
