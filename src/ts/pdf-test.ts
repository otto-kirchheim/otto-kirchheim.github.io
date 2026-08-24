// Nur für die manuelle Verifikation der Phasen 3-6 der PDF-Vorlagen-Pipeline (siehe
// ~/.claude/plans/plane-die-umsetztung-mit-purring-globe.md). Kein Teil der echten App,
// nicht im Produktions-Build referenziert (Vite bündelt nur src/index.html standardmäßig).
import { PDFDocument } from '@cantoo/pdf-lib';
import { saveAs } from 'file-saver';
import { resolve } from '@otto-kirchheim/nebengeld-shared';
import type { SeitenDef } from '@otto-kirchheim/nebengeld-shared';
import { build } from './infrastructure/pdf/build';
import { confirmDialog } from './infrastructure/ui/confirmDialog';
import { erstelleSignaturPad, holeSignaturPng } from './infrastructure/pdf/signaturePad';
import { parseRegistry } from './infrastructure/pdf/configSchema';

async function macheLeereVorlage(): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.addPage([595, 842]);
  const bytes = await pdf.save();
  return URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
}

function macheSeite(): SeitenDef {
  return {
    quelle: 0,
    bereiche: [{ tabelle: 'haupt', startY: 700, maxZeilen: 20 }],
    felder: {
      titel: { x: 50, y: 800, size: 16 },
      name: { x: 50, y: 770, size: 12 },
      summeLabel: { x: 400, y: 60, size: 10 },
      summe: {
        x: 500,
        y: 60,
        size: 10,
        align: 'rechts',
        format: 'waehrung',
        berechnet: { op: 'summe', ueber: '$alle', feld: 'betrag' },
      },
      seitenzahl: { x: 500, y: 30, size: 8, align: 'rechts', text: 'Seite {seite} von {seiten}' },
    },
    signaturBild: { x: 50, y: 550, w: 150, h: 50 },
  };
}

/**
 * Simuliert die vom Server geladene Registry-Konfiguration (Phase 6): zwei Versionen von
 * `ez`, aufgelöst nach dem Leistungsdatum -- nicht nach `Date.now()`. `titel` unterscheidet
 * sich zwischen den Versionen, damit im erzeugten PDF sichtbar ist, welche Version griff.
 */
async function ladeRegistryJson(): Promise<unknown> {
  const template = await macheLeereVorlage();
  const registry = {
    ez: {
      titel: 'Zulagenzettel',
      versionen: [
        {
          version: 'v1',
          gueltigVon: '2025-01-01',
          gueltigBis: '2026-01-01',
          layout: { template, seiten: [macheSeite()] },
          tabellen: {
            haupt: {
              quelle: 'zeilen',
              hoehe: 16,
              spalten: [
                { key: 'text', x: 50, size: 10 },
                { key: 'betrag', x: 500, size: 10, align: 'rechts', format: 'waehrung' },
              ],
            },
          },
        },
        {
          version: 'v2',
          gueltigVon: '2026-01-01',
          gueltigBis: null,
          layout: { template, seiten: [macheSeite()] },
          tabellen: {
            haupt: {
              quelle: 'zeilen',
              hoehe: 16,
              spalten: [
                { key: 'text', x: 50, size: 10 },
                { key: 'betrag', x: 500, size: 10, align: 'rechts', format: 'waehrung' },
              ],
            },
          },
        },
      ],
    },
  };
  // Über eine blob:-URL geladen statt direkt übergeben -- simuliert den echten `fetch()`-Roundtrip
  // vom Server, bei dem die Konfiguration zur Laufzeit `unknown` ist und erst validiert werden muss.
  const url = URL.createObjectURL(new Blob([JSON.stringify(registry)], { type: 'application/json' }));
  return fetch(url).then(r => r.json());
}

const daten = {
  name: 'Max Mustermann',
  zeilen: [
    { text: 'Erschwerniszulage Nachtarbeit', betrag: 25.5 },
    { text: 'Erschwerniszulage Sonntagsarbeit', betrag: 40 },
    { text: 'Fahrtkostenpauschale', betrag: 12.3 },
  ],
};

async function erzeugeUndLade(signaturPng?: string): Promise<void> {
  const leistungsdatum = (document.getElementById('leistungsdatum') as HTMLInputElement).value;
  const registry = parseRegistry(await ladeRegistryJson());
  const version = resolve(registry, 'ez', leistungsdatum);
  // Nur zur visuellen Bestätigung im Test-PDF, welche Version anhand des Leistungsdatums griff.
  const datenFuerVersion = {
    ...daten,
    titel: `Zulagenzettel -- Version ${version.version} (Leistungsdatum ${leistungsdatum})`,
  };

  const bytes = await build({ ...version, formular: 'ez' }, datenFuerVersion, signaturPng);
  saveAs(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), `phase6-test_${version.version}.pdf`);
}

const padBereich = document.getElementById('pad-bereich') as HTMLDivElement;
const canvas = document.getElementById('pad') as HTMLCanvasElement;
let pad: ReturnType<typeof erstelleSignaturPad> | undefined;

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

  // Canvas ist bis hierher `display: none` -- offsetWidth/offsetHeight wären 0, wenn das Pad
  // vorher erstellt würde (skaliereFuerDisplay() liest die Anzeigegröße direkt vom Element).
  // Deshalb erst nach dem Sichtbar-Schalten erstellen.
  padBereich.style.display = 'block';
  pad = erstelleSignaturPad(canvas);
});

document.getElementById('pad-loeschen')?.addEventListener('click', () => pad?.clear());

document.getElementById('pad-fertig')?.addEventListener('click', async () => {
  const png = pad ? holeSignaturPng(pad) : null;
  await erzeugeUndLade(png ?? undefined);
  padBereich.style.display = 'none';
  pad?.clear();
});
