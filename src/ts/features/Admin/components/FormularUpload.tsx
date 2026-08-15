import { useState } from 'preact/hooks';
import { FetchRetry, getServerUrl } from '@/infrastructure/api/FetchRetry';
import Storage from '@/infrastructure/storage/Storage';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { JsonEditor } from './JsonEditor';

const FORMULAR_CODES = ['ez', 'ewt', 'bereitschaft', 'ea'] as const;
type FormularCode = (typeof FORMULAR_CODES)[number];
type VorlagenArt = 'einseitig' | 'mehrseitig';

const KONFIG_PLATZHALTER = JSON.stringify(
  {
    konfigEinseitig: { seiten: [{ quelle: 0, maxZeilen: 20, startY: 700, kopf: {} }] },
    konfigMehrseitig: { seiten: [] },
    zeilen: { quelle: 'zeilen', hoehe: 14, spalten: [] },
  },
  null,
  2,
);

/**
 * Lädt eine PDF-Vorlage hoch (Bun-natives FormData-Handling im Backend, siehe
 * `backend/src/routes/vorlagen.routes.ts`). `FetchRetry` unterstützt nur JSON-Bodies,
 * daher hier ein eigener Roh-`fetch()` mit denselben Auth-Headern.
 */
async function ladeVorlagenHoch(formular: FormularCode, art: VorlagenArt, datei: File): Promise<string> {
  const form = new FormData();
  form.append('formular', formular);
  form.append('art', art);
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
 * Minimale Admin-Oberfläche zum Anlegen einer neuen Formular-Version: zwei PDF-Uploads
 * (einseitig + mehrseitig, siehe "zwei Vorlagendateien je Version" im Konzept) plus die
 * Koordinaten-Config als JSON. Wird in Phase 13 zur vollen Drag/Resize-Oberfläche ausgebaut;
 * dieser JSON-Modus bleibt dann als Power-User-Fallback bestehen.
 */
export function FormularUpload() {
  const [formular, setFormular] = useState<FormularCode>('ez');
  const [version, setVersion] = useState('');
  const [gueltigVon, setGueltigVon] = useState('');
  const [gueltigBis, setGueltigBis] = useState('');
  const [einseitigDatei, setEinseitigDatei] = useState<File | null>(null);
  const [mehrseitigDatei, setMehrseitigDatei] = useState<File | null>(null);
  const [konfigJson, setKonfigJson] = useState(KONFIG_PLATZHALTER);
  const [speichert, setSpeichert] = useState(false);

  async function handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    if (!einseitigDatei || !mehrseitigDatei) {
      createSnackBar({
        message: 'Beide PDF-Vorlagen (einseitig + mehrseitig) sind erforderlich',
        status: 'error',
        timeout: 3000,
        fixed: true,
      });
      return;
    }

    let konfig: Record<string, unknown>;
    try {
      konfig = JSON.parse(konfigJson) as Record<string, unknown>;
    } catch {
      createSnackBar({ message: 'Koordinaten-Config ist kein gültiges JSON', status: 'error', timeout: 3000, fixed: true });
      return;
    }

    setSpeichert(true);
    try {
      const vorlageEinseitigId = await ladeVorlagenHoch(formular, 'einseitig', einseitigDatei);
      const vorlageMehrseitigId = await ladeVorlagenHoch(formular, 'mehrseitig', mehrseitigDatei);

      const result = await FetchRetry<Record<string, unknown>, unknown>(
        `formulare/${formular}/versionen`,
        { version, gueltigVon, gueltigBis: gueltigBis || null, vorlageEinseitigId, vorlageMehrseitigId, ...konfig },
        'POST',
      );

      if (result instanceof Error) throw result;
      if (!result.success) throw new Error(result.message ?? 'Version konnte nicht angelegt werden');

      createSnackBar({ message: `Version "${version}" für ${formular} angelegt`, status: 'success', timeout: 3000 });
      setVersion('');
      setGueltigVon('');
      setGueltigBis('');
      setEinseitigDatei(null);
      setMehrseitigDatei(null);
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
        Neue Version anlegen: zwei fertige PDF-Vorlagen (reines Text-Layout, in LibreOffice aus dem xlsx exportiert)
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

      <div class="row g-2">
        <div class="col-md-6">
          <label class="form-label" for="formular-upload-einseitig">
            PDF einseitig
          </label>
          <input
            id="formular-upload-einseitig"
            type="file"
            accept="application/pdf"
            class="form-control"
            onChange={e => setEinseitigDatei((e.target as HTMLInputElement).files?.[0] ?? null)}
            required
          />
        </div>
        <div class="col-md-6">
          <label class="form-label" for="formular-upload-mehrseitig">
            PDF mehrseitig
          </label>
          <input
            id="formular-upload-mehrseitig"
            type="file"
            accept="application/pdf"
            class="form-control"
            onChange={e => setMehrseitigDatei((e.target as HTMLInputElement).files?.[0] ?? null)}
            required
          />
        </div>
      </div>

      <div>
        <label class="form-label">Koordinaten-Config (JSON: konfigEinseitig/konfigMehrseitig/zeilen)</label>
        <JsonEditor value={konfigJson} onChange={setKonfigJson} />
      </div>

      <button type="submit" class="btn btn-primary align-self-start" disabled={speichert}>
        {speichert ? 'Speichert…' : 'Version anlegen'}
      </button>
    </form>
  );
}
