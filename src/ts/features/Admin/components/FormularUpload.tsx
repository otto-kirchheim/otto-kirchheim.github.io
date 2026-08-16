import { useState } from 'preact/hooks';
import { FetchRetry, getServerUrl } from '@/infrastructure/api/FetchRetry';
import Storage from '@/infrastructure/storage/Storage';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { FormularEditor, leereSeite, type Konfig } from './FormularEditor/FormularEditor';
import { ZEILEN_QUELLEN, type FormularCode } from './FormularEditor/datenKatalog';

const FORMULAR_CODES = ['ez', 'ewt', 'bereitschaft', 'ea'] as const;

function leereKonfig(formular: FormularCode): Konfig {
  return {
    ersteSeite: leereSeite(),
    tabellen: { haupt: { quelle: ZEILEN_QUELLEN[formular][0]?.pfad ?? '', hoehe: 14, spalten: [] } },
  };
}

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
 * Admin-Oberfläche zum Anlegen einer neuen Formular-Version: EINE PDF-Vorlage (ein Layout pro
 * Version -- die ursprünglich geplante Aufteilung in einseitig/mehrseitig war nur wegen
 * Kandidat C (pyHanko-Signaturfeld-Namenskollision) nötig und entfällt unter Kandidat E) plus die
 * Koordinaten-Config, per `FormularEditor` (Phase 8) durch Klicken auf die echte PDF-Vorschau
 * gesetzt statt per Hand ins JSON getippt.
 */
export function FormularUpload() {
  const [formular, setFormular] = useState<FormularCode>('ez');
  const [version, setVersion] = useState('');
  const [gueltigVon, setGueltigVon] = useState('');
  const [gueltigBis, setGueltigBis] = useState('');
  const [datei, setDatei] = useState<File | null>(null);
  const [konfig, setKonfig] = useState<Konfig>(() => leereKonfig('ez'));
  const [speichert, setSpeichert] = useState(false);

  function wechsleFormular(code: FormularCode): void {
    setFormular(code);
    // Zeilen-Quelle und Datenpfade sind ressourcenspezifisch -- eine für `ez` gebaute Konfiguration
    // zeigt unter `ewt` ins Leere, deshalb bewusst zurücksetzen statt stillschweigend übernehmen.
    setKonfig(leereKonfig(code));
  }

  async function handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    if (!datei) {
      createSnackBar({ message: 'Die PDF-Vorlage ist erforderlich', status: 'error', timeout: 3000, fixed: true });
      return;
    }

    const { tabellen, ...rest } = konfig;

    setSpeichert(true);
    try {
      const vorlageId = await ladeVorlagenHoch(formular, datei);

      const result = await FetchRetry<Record<string, unknown>, unknown>(
        `formulare/${formular}/versionen`,
        { version, gueltigVon, gueltigBis: gueltigBis || null, vorlageId, konfig: rest, tabellen },
        'POST',
      );

      if (result instanceof Error) throw result;
      if (!result.success) throw new Error(result.message ?? 'Version konnte nicht angelegt werden');

      createSnackBar({ message: `Version "${version}" für ${formular} angelegt`, status: 'success', timeout: 3000 });
      setVersion('');
      setGueltigVon('');
      setGueltigBis('');
      setDatei(null);
      setKonfig(leereKonfig(formular));
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
            onChange={e => wechsleFormular((e.target as HTMLSelectElement).value as FormularCode)}
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
            <strong>Erste Seite</strong> wird immer genau einmal gerendert, <strong>Weitere Seite</strong> (optional)
            wiederholt sich bei Zeilenüberlauf. Eintrag in der Liste rechts <em>scharf schalten</em>, dann links auf dem
            PDF ein <strong>Rechteck über die Zelle ziehen</strong> (Maustaste gedrückt halten — die Lupe zeigt den
            vergrößerten Ausschnitt). Der Text wird laut Ausrichtung in dieser Zelle platziert, bei „zentriert" mittig
            zwischen den beiden Kanten.
          </p>
          <ul class="mb-2">
            <li>
              <strong>Felder</strong> — alles außerhalb der Datentabelle: Kopfangaben, Summen, Übertrag, Seitenzahl.
              Es gibt bewusst nur einen Bereich, denn die Position bestimmt allein die gezogene Zelle. Je Feld wählbar:
              <em>Datenfeld</em> (aus der Liste der wirklich gelieferten Werte), <em>Mehrere</em> (zusammengesetzt,
              z.B. „Nachname, Vorname" oder Adresszeilen — Trennzeichen frei wählbar, leere Teile fallen weg),
              <em>Summe</em> oder <em>fester Text</em>.
            </li>
            <li>
              <strong>Summen</strong> — Summe/Anzahl/Maximum, wahlweise über <em>alle Zeilen</em> (Gesamtsumme),
              <em>nur diese Seite</em> (Zwischensumme) oder <em>alle Vorseiten</em> (Übertrag). Das ersetzt die
              frühere Trennung in Kopf-, Seitenfuß- und Fußbereich.
            </li>
            <li>
              <strong>Fester Text</strong> — Platzhalter in geschweiften Klammern werden ersetzt:{' '}
              <code>{'{seite}'}</code>/<code>{'{seiten}'}</code> für die Seitenzahl, jeder andere Name als Datenpfad
              (z.B. <code>{'Zulagen {Monat}/{Jahr}'}</code>). So wird auch die Seitenzahl gesetzt — sie ist nicht fest
              eingebaut; ohne solches Feld erscheint keine.
            </li>
            <li>
              <strong>Zeilenraster</strong> — Rechteck über die erste Datenzeile ziehen: setzt Startposition und
              Zeilenhöhe in einem Schritt. „Zeilen auf dieser Seite" als Zahl eingeben. Eine Übertragszeile belegt
              optisch einen Slot, diese Zahl also entsprechend kleiner setzen.
            </li>
            <li>
              <strong>Spalten</strong> — Rechteck über die Spalte ziehen, davon werden nur die linke/rechte Kante
              übernommen (die Höhe kommt aus dem Zeilenraster). Optional <em>berechnet</em> aus anderen Feldern
              derselben Zeile (z.B. Produkt aus Dauer und Satz).
            </li>
            <li>
              <strong>Signatur-Fläche</strong> — Rechteck für die Canvas-Unterschrift aufziehen.
            </li>
          </ul>
          <p class="mb-1">
            Schriftgröße, Ausrichtung und Format gelten je Zelle; <em>Schrift automatisch verkleinern</em> passt zu
            lange Werte in die Zelle ein, <em>Zeilenumbruch</em> bricht an Wortgrenzen um. Die Koordinaten-Anzeige
            rechts im Kopf jedes Eintrags lässt sich aufklappen, um die Kanten nachträglich exakt anzugleichen
            (z.B. gleiche Höhe wie das Feld daneben).
          </p>
          <p class="mb-0">
            „Testdaten-Vorschau" erzeugt mit Platzhalterwerten ein echtes PDF, um die Platzierung zu prüfen. Unter dem
            Editor liegt die komplette Konfiguration als JSON zum Kopieren, Sichern und Wiedereinfügen.
          </p>
        </div>
      </details>

      {datei ? (
        <FormularEditor formular={formular} datei={datei} value={konfig} onChange={setKonfig} />
      ) : (
        <p class="text-body-secondary small">PDF-Vorlage zuerst auswählen, um Koordinaten setzen zu können.</p>
      )}

      <button type="submit" class="btn btn-primary align-self-start" disabled={speichert}>
        {speichert ? 'Speichert…' : 'Version anlegen'}
      </button>
    </form>
  );
}
