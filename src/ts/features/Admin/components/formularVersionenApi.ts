import { FetchRetry, getServerUrl } from '@/infrastructure/api/FetchRetry';
import Storage from '@/infrastructure/storage/Storage';
import type { Konfig } from './FormularEditor/FormularEditor';
import type { FormularCode } from './FormularEditor/datenKatalog';

/** Eine gespeicherte Formular-Version, wie sie `GET /formulare/:f/versionen` liefert. */
export interface VersionUebersicht {
  id: string;
  version: string;
  gueltigVon: string;
  gueltigBis: string | null;
  vorlageId: string;
  konfig: Omit<Konfig, 'tabellen'>;
  tabellen: Konfig['tabellen'];
}

export interface VersionNutzdaten {
  version: string;
  gueltigVon: string;
  gueltigBis: string | null;
  vorlageId: string;
  konfig: Omit<Konfig, 'tabellen'>;
  tabellen: Konfig['tabellen'];
}

/** Trägt den HTTP-Status mit, damit der Aufrufer den Intervall-Konflikt (409) erkennen kann. */
export class ApiFehler extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ApiFehler';
  }
}

function authHeader(): Record<string, string> {
  const token = Storage.get<string>('AccessToken', { default: undefined });
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'x-client-version': import.meta.env.APP_VERSION,
  };
}

async function ruf<T>(pfad: string, daten: unknown, methode: 'GET' | 'POST' | 'PUT' | 'DELETE'): Promise<T> {
  const antwort = await FetchRetry<unknown, T>(pfad, daten, methode);
  if (antwort instanceof Error) throw antwort;
  if (!antwort.success) throw new ApiFehler(antwort.message ?? `Anfrage fehlgeschlagen (${antwort.statusCode})`, antwort.statusCode);
  return antwort.data;
}

/**
 * Lädt die PDF-Vorlage hoch. `FetchRetry` unterstützt nur JSON-Bodies, daher hier ein eigener
 * Roh-`fetch()` mit denselben Auth-Headern.
 */
export async function ladeVorlagenHoch(formular: FormularCode, datei: File): Promise<string> {
  const form = new FormData();
  form.append('formular', formular);
  form.append('pdf', datei);

  const serverUrl = await getServerUrl();
  const res = await fetch(`${serverUrl}/vorlagen`, { method: 'POST', headers: authHeader(), body: form });
  const body = (await res.json()) as { success: boolean; data?: { id: string }; message?: string };
  if (!res.ok || !body.success || !body.data) throw new ApiFehler(body.message ?? `Upload fehlgeschlagen (${res.status})`, res.status);
  return body.data.id;
}

/**
 * Holt eine gespeicherte Vorlage als `File` zurück — der Editor arbeitet immer gegen eine lokale
 * Datei, beim Bearbeiten muss die bereits hochgeladene PDF dafür wieder zum `File` werden.
 */
export async function holeVorlageAlsDatei(vorlageId: string): Promise<File> {
  const serverUrl = await getServerUrl();
  const res = await fetch(`${serverUrl}/vorlagen/${vorlageId}`, { headers: authHeader() });
  if (!res.ok) throw new ApiFehler(`Vorlage konnte nicht geladen werden (${res.status})`, res.status);
  return new File([await res.blob()], `vorlage-${vorlageId}.pdf`, { type: 'application/pdf' });
}

export function holeVersionen(formular: FormularCode): Promise<VersionUebersicht[]> {
  return ruf<VersionUebersicht[]>(`formulare/${formular}/versionen`, undefined, 'GET');
}

export function legeVersionAn(formular: FormularCode, daten: VersionNutzdaten): Promise<unknown> {
  return ruf(`formulare/${formular}/versionen`, daten, 'POST');
}

/** `erzwingen` übergeht die Intervallprüfung — nötig, um die Vorgängerversion zu schließen. */
export function aendereVersion(
  formular: FormularCode,
  id: string,
  daten: VersionNutzdaten,
  erzwingen = false,
): Promise<unknown> {
  return ruf(`formulare/${formular}/versionen/${id}`, { ...daten, erzwingen }, 'PUT');
}

export function loescheVersion(formular: FormularCode, id: string, erzwingen = false): Promise<unknown> {
  const query = erzwingen ? '?erzwingen=true' : '';
  return ruf(`formulare/${formular}/versionen/${id}${query}`, undefined, 'DELETE');
}
