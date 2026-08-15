import { useState } from 'preact/hooks';
import { FetchRetry, getServerUrl } from '@/infrastructure/api/FetchRetry';
import Storage from '@/infrastructure/storage/Storage';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { JsonEditor } from './JsonEditor';

const FORMULAR_CODES = ['ez', 'ewt', 'bereitschaft', 'ea'] as const;
type FormularCode = (typeof FORMULAR_CODES)[number];

const KONFIG_PLATZHALTER = JSON.stringify(
  {
    ersteSeite: {
      quelle: 0,
      maxZeilen: 20,
      startY: 700,
      kopf: { name: { x: 50, y: 800, size: 12 } },
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
    zeilen: {
      quelle: 'zeilen',
      hoehe: 14,
      spalten: [{ key: 'text', x: 50, size: 10 }],
    },
  },
  null,
  2,
);

/**
 * Lädt die PDF-Vorlage hoch (Bun-natives FormData-Handling im Backend, siehe
 * `backend/src/routes/vorlagen.routes.ts`). `FetchRetry` unterstützt nur JSON-Bodies,
 * daher hier ein eigener Roh-`fetch()` mit denselben Auth-Headern.
 */
async function ladeVorlagenHoch(formular: FormularCode, datei: File): Promise<string> {
  const form = new FormData();
  form.append('formular', formular);
  form.append('pdf', datei);

  const serverUrl = await getServerUrl();
  const token = Storage.get<string>('AccessToken', { default: undefined });
  const res = await fetch(`${serverUrl}/vorlagen`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-client-version': import.meta.env.APP_VERSION,
    },
    body: form,
  });
  const body = (await res.json()) as { success: boolean; data?: { id: string }; message?: string };
  if (!res.ok || !body.success || !body.data) throw new Error(body.message ?? `Upload fehlgeschlagen (${res.status})`);
  return body.data.id;
}

/**
 * Minimale Admin-Oberfläche zum Anlegen einer neuen Formular-Version: EINE PDF-Vorlage
 * (ein Layout pro Version -- die ursprünglich geplante Aufteilung in einseitig/mehrseitig
 * war nur wegen Kandidat C (pyHanko-Signaturfeld-Namenskollision) nötig und entfällt unter
 * Kandidat E) plus die Koordinaten-Config als JSON. Wird in Phase 13 zur vollen
 * Drag/Resize-Oberfläche ausgebaut; dieser JSON-Modus bleibt dann als Power-User-Fallback bestehen.
 */
export function FormularUpload() {
  const [formular, setFormular] = useState<FormularCode>('ez');
  const [version, setVersion] = useState('');
  const [gueltigVon, setGueltigVon] = useState('');
  const [gueltigBis, setGueltigBis] = useState('');
  const [datei, setDatei] = useState<File | null>(null);
  const [konfigJson, setKonfigJson] = useState(KONFIG_PLATZHALTER);
  const [speichert, setSpeichert] = useState(false);

  async function handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    if (!datei) {
      createSnackBar({ message: 'Die PDF-Vorlage ist erforderlich', status: 'error', timeout: 3000, fixed: true });
      return;
    }

    let eingabe: { zeilen: unknown; [key: string]: unknown };
    try {
      eingabe = JSON.parse(konfigJson) as typeof eingabe;
    } catch {
      createSnackBar({ message: 'Koordinaten-Config ist kein gültiges JSON', status: 'error', timeout: 3000, fixed: true });
      return;
    }
    // JSON-Feld enthält ersteSeite/weitereSeite UND zeilen zusammen (leichter für den Admin zu
    // pflegen) -- die Route erwartet konfig={ersteSeite,weitereSeite} und zeilen getrennt.
    const { zeilen, ...konfig } = eingabe;

    setSpeichert(true);
    try {
      const vorlageId = await ladeVorlagenHoch(formular, datei);

      const result = await FetchRetry<Record<string, unknown>, unknown>(
        `formulare/${formular}/versionen`,
        { version, gueltigVon, gueltigBis: gueltigBis || null, vorlageId, konfig, zeilen },
        'POST',
      );

      if (result instanceof Error) throw result;
      if (!result.success) throw new Error(result.message ?? 'Version konnte nicht angelegt werden');

      createSnackBar({ message: `Version "${version}" für ${formular} angelegt`, status: 'success', timeout: 3000 });
      setVersion('');
      setGueltigVon('');
      setGueltigBis('');
      setDatei(null);
    } catch (error) {
      createSnackBar({
        message: `Fehler: ${error instanceof Error ? error.message : String(error)}`,
        status: 'error',
        timeout: 4000,
        fixed: true,
      });
    } finally {
      setSpeichert(false);
    }
  }

  return (
    <form class="d-flex flex-column gap-3" onSubmit={e => void handleSubmit(e)}>
      <h5 class="mb-0">Formular-Vorlage hochladen</h5>
      <p class="small text-body-secondary mb-0">
        Neue Version anlegen: eine fertige PDF-Vorlage (reines Text-Layout, in LibreOffice aus dem xlsx exportiert)
        plus die Koordinaten-Config. Bestehende Versionen werden nie überschrieben.
      </p>

      <div class="row g-2">
        <div class="col-md-3">
          <label class="form-label" for="formular-upload-code">
            Formular
          </label>
          <select
            id="formular-upload-code"
            class="form-select"
            value={formular}
            onChange={e => setFormular((e.target as HTMLSelectElement).value as FormularCode)}
          >
            {FORMULAR_CODES.map(code => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label" for="formular-upload-version">
            Version
          </label>
          <input
            id="formular-upload-version"
            class="form-control"
            value={version}
            onInput={e => setVersion((e.target as HTMLInputElement).value)}
            required
          />
        </div>
        <div class="col-md-3">
          <label class="form-label" for="formular-upload-gueltig-von">
            Gültig ab
          </label>
          <input
            id="formular-upload-gueltig-von"
            type="date"
            class="form-control"
            value={gueltigVon}
            onInput={e => setGueltigVon((e.target as HTMLInputElement).value)}
            required
          />
        </div>
        <div class="col-md-3">
          <label class="form-label" for="formular-upload-gueltig-bis">
            Gültig bis (leer = offen)
          </label>
          <input
            id="formular-upload-gueltig-bis"
            type="date"
            class="form-control"
            value={gueltigBis}
            onInput={e => setGueltigBis((e.target as HTMLInputElement).value)}
          />
        </div>
      </div>

      <div>
        <label class="form-label" for="formular-upload-pdf">
          PDF-Vorlage
        </label>
        <input
          id="formular-upload-pdf"
          type="file"
          accept="application/pdf"
          class="form-control"
          onChange={e => setDatei((e.target as HTMLInputElement).files?.[0] ?? null)}
          required
        />
      </div>

      <details class="border rounded p-2 bg-body-secondary">
        <summary class="small fw-semibold" style="cursor: pointer">
          Hilfe zur Koordinaten-Config
        </summary>
        <div class="small mt-2">
          <p class="mb-2">
            Koordinatensystem: PDF-Punkte (1pt = 1/72 Zoll), Ursprung <strong>unten links</strong>. A4 = 595×842pt.
          </p>
          <p class="mb-1">
            <code>ersteSeite</code> wird immer genau einmal gerendert, <code>weitereSeite</code> (optional) wiederholt
            sich bei Zeilenüberlauf. Beide haben dieselbe Form:
          </p>
          <ul class="mb-2">
            <li>
              <code>quelle</code> — Seitenindex in der hochgeladenen PDF (0 = erste Seite).
            </li>
            <li>
              <code>maxZeilen</code> — wie viele Datenzeilen auf diese Seite passen.
            </li>
            <li>
              <code>startY</code> — y-Koordinate der ersten Datenzeile, jede weitere Zeile rutscht um{' '}
              <code>zeilen.hoehe</code> nach unten.
            </li>
            <li>
              <code>kopf</code>/<code>fuss</code> — Felder außerhalb der Datentabelle, je{' '}
              <code>{'{ name: { x, y, size, align?, format?, berechnet? } }'}</code>. <code>fuss</code> wird auf
              jeder Seite gezeichnet, die ihn definiert (meist die letzte, bei Bereitschaft bewusst die erste).
            </li>
            <li>
              <code>signaturBild</code> — <code>{'{ x, y, w, h }'}</code>, Platzierung der Canvas-Unterschrift.
            </li>
          </ul>
          <p class="mb-1">
            Feld-Optionen: <code>align</code> (<code>links</code>/<code>rechts</code>), <code>format</code> (
            <code>waehrung</code>/<code>datum</code>), <code>berechnet</code> für Summenfelder (
            <code>{'{ op: "summe"|"anzahl"|"max", ueber: "$seite"|"$bisher"|<Datenpfad>, feld? }'}</code>).
          </p>
          <p class="mb-1">
            <code>zeilen</code>: <code>quelle</code> (Datenpfad zur Zeilenliste), <code>hoehe</code>, <code>spalten</code>{' '}
            (Array von <code>{'{ key, x, size, align?, format?, maxBreite? }'}</code>).
          </p>
        </div>
      </details>

      <div>
        <label class="form-label">Koordinaten-Config (JSON: ersteSeite/weitereSeite/zeilen)</label>
        <JsonEditor value={konfigJson} onChange={setKonfigJson} />
      </div>

      <button type="submit" class="btn btn-primary align-self-start" disabled={speichert}>
        {speichert ? 'Speichert…' : 'Version anlegen'}
      </button>
    </form>
  );
}
