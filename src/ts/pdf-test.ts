// Nur für die manuelle Verifikation der Phasen 3/4 der PDF-Vorlagen-Pipeline (siehe
// ~/.claude/plans/plane-die-umsetztung-mit-purring-globe.md). Kein Teil der echten App,
// nicht im Produktions-Build referenziert (Vite bündelt nur src/index.html standardmäßig).
import { PDFDocument } from '@cantoo/pdf-lib';
import { saveAs } from 'file-saver';
import type { Version } from '@otto-kirchheim/nebengeld-shared';
import { build } from './infrastructure/pdf/build';
import { confirmDialog } from './infrastructure/ui/confirmDialog';
import { erstelleSignaturPad, holeSignaturPng } from './infrastructure/pdf/signaturePad';

async function macheLeereVorlage(): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.addPage([595, 842]);
  const bytes = await pdf.save();
  return URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
}

async function macheCfg(): Promise<Version & { formular: string }> {
  const template = await macheLeereVorlage();
  return {
    formular: 'ez',
    version: 'v1',
    gueltigVon: '2026-01-01',
    gueltigBis: null,
    einseitig: {
      template,
      seiten: [
        {
          quelle: 0,
          maxZeilen: 20,
          startY: 700,
          kopf: {
            titel: { x: 50, y: 800, size: 16 },
            name: { x: 50, y: 770, size: 12 },
          },
          fuss: {
            summeLabel: { x: 400, y: 60, size: 10 },
            summe: {
              x: 500,
              y: 60,
              size: 10,
              align: 'rechts',
              format: 'waehrung',
              berechnet: { op: 'summe', ueber: '$seite', feld: 'betrag' },
            },
          },
          signaturBild: { x: 50, y: 550, w: 150, h: 50 },
        },
      ],
    },
    mehrseitig: { template, seiten: [] },
    zeilen: {
      quelle: 'zeilen',
      hoehe: 16,
      spalten: [
        { key: 'text', x: 50, size: 10 },
        { key: 'betrag', x: 500, size: 10, align: 'rechts', format: 'waehrung' },
      ],
    },
  };
}

const daten = {
  titel: 'Zulagenzettel (Testlauf Phase 4)',
  name: 'Max Mustermann',
  zeilen: [
    { text: 'Erschwerniszulage Nachtarbeit', betrag: 25.5 },
    { text: 'Erschwerniszulage Sonntagsarbeit', betrag: 40 },
    { text: 'Fahrtkostenpauschale', betrag: 12.3 },
  ],
};

async function erzeugeUndLade(signaturPng?: string): Promise<void> {
  const cfg = await macheCfg();
  const bytes = await build(cfg, daten, signaturPng);
  saveAs(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), 'phase4-test.pdf');
}

const padBereich = document.getElementById('pad-bereich') as HTMLDivElement;
const canvas = document.getElementById('pad') as HTMLCanvasElement;
const pad = erstelleSignaturPad(canvas);

document.getElementById('erzeugen')?.addEventListener('click', async () => {
  const ja = await confirmDialog('Jetzt unterschreiben?', {
    title: 'Unterschrift',
    confirmLabel: 'Ja',
    cancelLabel: 'Nein',
    confirmClass: 'btn-primary',
  });

  if (!ja) {
    await erzeugeUndLade();
    return;
  }

  padBereich.style.display = 'block';
});

document.getElementById('pad-loeschen')?.addEventListener('click', () => pad.clear());

document.getElementById('pad-fertig')?.addEventListener('click', async () => {
  const png = holeSignaturPng(pad);
  await erzeugeUndLade(png ?? undefined);
  padBereich.style.display = 'none';
  pad.clear();
});
