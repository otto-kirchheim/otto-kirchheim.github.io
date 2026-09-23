import { FetchRetry, getServerUrl } from '@/shared/api/FetchRetry';
import { ApiFehler, authHeader, holeVorlageAlsDatei } from '@/shared/lib/pdf/ladeFormular';
import type {
  VersionUebersicht as SharedVersionUebersicht,
  VersionNutzdaten as SharedVersionNutzdaten,
} from '@otto-kirchheim/nebengeld-shared';
import type { Konfig } from './FormularEditor/FormularEditor';
import type { FormularCode } from './FormularEditor/datenKatalog';

// Definiert in `shared/lib/pdf/ladeFormular.ts` (auch vom Download-Pfad der Ressourcen-Tabs
// genutzt) und hier re-exportiert, damit Importe wie in `FormularUpload.tsx` unverändert bleiben.
export { ApiFehler, holeVorlageAlsDatei };

/**
 * Eine gespeicherte Formular-Version, wie sie `GET /formulare/:f/versionen` liefert -- schärft
 * `konfig`/`tabellen` aus `shared`s lose typisiertem Wire-Format auf `Konfig` (FormularEditor).
 */
export interface VersionUebersicht extends Omit<SharedVersionUebersicht, 'konfig' | 'tabellen'> {
  konfig: Omit<Konfig, 'tabellen'>;
  tabellen: Konfig['tabellen'];
}

export interface VersionNutzdaten extends Omit<SharedVersionNutzdaten, 'konfig' | 'tabellen'> {
  konfig: Omit<Konfig, 'tabellen'>;
  tabellen: Konfig['tabellen'];
}

/**
 * Ruft einen Endpunkt über `FetchRetry` auf und liefert dessen Nutzdaten.
 *
 * @typeParam T - Typ der Antwort-Nutzdaten.
 * @param pfad - Endpunktpfad relativ zur API.
 * @param daten - Request-Body (bei GET/DELETE `undefined`).
 * @param methode - HTTP-Methode.
 * @returns Nutzdaten der Antwort.
 * @throws {Error} Bei Netzwerkfehler; `ApiFehler` mit Statuscode, wenn die Antwort nicht erfolgreich ist.
 */
async function ruf<T>(pfad: string, daten: unknown, methode: 'GET' | 'POST' | 'PUT' | 'DELETE'): Promise<T> {
  const antwort = await FetchRetry<unknown, T>(pfad, daten, methode);
  if (antwort instanceof Error) throw antwort;
  if (!antwort.success)
    throw new ApiFehler(antwort.message ?? `Anfrage fehlgeschlagen (${antwort.statusCode})`, antwort.statusCode);
  return antwort.data;
}

/**
 * Lädt die PDF-Vorlage hoch. `FetchRetry` unterstützt nur JSON-Bodies, daher hier ein eigener
 * Roh-`fetch()` mit denselben Auth-Headern.
 *
 * @param formular - Formularcode, dem die Vorlage zugeordnet wird.
 * @param datei - Die PDF-Datei.
 * @returns Id der angelegten Vorlage.
 * @throws {ApiFehler} Wenn der Upload fehlschlägt.
 */
export async function ladeVorlagenHoch(formular: FormularCode, datei: File): Promise<string> {
  const form = new FormData();
  form.append('formular', formular);
  form.append('pdf', datei);

  const serverUrl = await getServerUrl();
  const res = await fetch(`${serverUrl}/vorlagen`, { method: 'POST', headers: authHeader(), body: form });
  const body = (await res.json()) as { success: boolean; data?: { id: string }; message?: string };
  if (!res.ok || !body.success || !body.data)
    throw new ApiFehler(body.message ?? `Upload fehlgeschlagen (${res.status})`, res.status);
  return body.data.id;
}

/**
 * Lädt alle gespeicherten Versionen eines Formulars.
 *
 * @param formular - Formularcode.
 * @returns Versionen des Formulars.
 */
export function holeVersionen(formular: FormularCode): Promise<VersionUebersicht[]> {
  return ruf<VersionUebersicht[]>(`formulare/${formular}/versionen`, undefined, 'GET');
}

/**
 * Legt eine neue Version eines Formulars an.
 *
 * @param formular - Formularcode.
 * @param daten - Konfiguration, Tabellen und Gültigkeit der neuen Version.
 * @returns Antwortdaten des Backends.
 */
export function legeVersionAn(formular: FormularCode, daten: VersionNutzdaten): Promise<unknown> {
  return ruf(`formulare/${formular}/versionen`, daten, 'POST');
}

/**
 * Ändert eine Version. `erzwingen` übergeht die Intervallprüfung — nötig, um die Vorgängerversion zu schließen.
 *
 * @param formular - Formularcode.
 * @param id - Id der Version.
 * @param daten - Neue Nutzdaten der Version.
 * @param erzwingen - `true` übergeht die Intervallprüfung.
 * @returns Antwortdaten des Backends.
 */
export function aendereVersion(
  formular: FormularCode,
  id: string,
  daten: VersionNutzdaten,
  erzwingen = false,
): Promise<unknown> {
  return ruf(`formulare/${formular}/versionen/${id}`, { ...daten, erzwingen }, 'PUT');
}

/**
 * Löscht eine Version. Entstünde dadurch eine lückenhafte Kette, braucht das Backend `erzwingen`.
 *
 * @param formular - Formularcode.
 * @param id - Id der Version.
 * @param erzwingen - `true` löscht trotz entstehender Lücke.
 * @returns Antwortdaten des Backends.
 */
export function loescheVersion(formular: FormularCode, id: string, erzwingen = false): Promise<unknown> {
  const query = erzwingen ? '?erzwingen=true' : '';
  return ruf(`formulare/${formular}/versionen/${id}${query}`, undefined, 'DELETE');
}
