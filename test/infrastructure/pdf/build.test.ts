import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { PDFDict, PDFDocument, PDFName } from '@cantoo/pdf-lib';
import type { Version } from '@otto-kirchheim/nebengeld-shared';
import { build } from '@/infrastructure/pdf/build';

const vorlagePfad = `${import.meta.dir}/../../fixtures/test_1seitig.pdf`;

// Minimales gültiges 1x1-transparentes PNG als Signatur-Dummy.
const DUMMY_SIGNATUR_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

async function hatBildXObject(bytes: Uint8Array): Promise<boolean> {
  const doc = await PDFDocument.load(bytes);
  const resources = doc.getPage(0).node.Resources();
  const xobjekte = resources?.lookupMaybe(PDFName.of('XObject'), PDFDict);
  return (xobjekte?.keys().length ?? 0) > 0;
}

globalThis.fetch = vi.fn() as unknown as typeof fetch;

function macheCfg(): Version & { formular: string } {
  return {
    formular: 'ez',
    version: 'v1',
    gueltigVon: '2026-01-01',
    gueltigBis: null,
    layout: {
      template: 'test_1seitig.pdf',
      ersteSeite: {
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
        signaturBild: { x: 400, y: 100, w: 120, h: 40 },
      },
    },
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

  it('bettet bei vorhandenem Signatur-Input ein Image-XObject an der signaturBild-Position ein', async () => {
    const cfg = macheCfg();
    const bytes = await build(cfg, { name: 'X', zeilen: [] }, DUMMY_SIGNATUR_PNG);
    expect(await hatBildXObject(bytes)).toBe(true);
  });

  it('liefert ohne Signatur-Input ein valides PDF ohne Image-XObject (Pfad "Nein")', async () => {
    const cfg = macheCfg();
    const bytes = await build(cfg, { name: 'X', zeilen: [] });
    expect(await hatBildXObject(bytes)).toBe(false);
  });

  it('zeichnet keine Signatur, wenn die Seite kein signaturBild definiert (auch bei vorhandenem Input)', async () => {
    const cfg = macheCfg();
    delete cfg.layout.ersteSeite.signaturBild;
    const bytes = await build(cfg, { name: 'X', zeilen: [] }, DUMMY_SIGNATUR_PNG);
    expect(await hatBildXObject(bytes)).toBe(false);
  });
});
