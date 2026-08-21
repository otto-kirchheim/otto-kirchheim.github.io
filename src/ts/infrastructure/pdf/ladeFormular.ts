import type { Daten } from '@otto-kirchheim/nebengeld-shared';
import { FetchRetry, getServerUrl } from '../api/FetchRetry';
import Storage from '../storage/Storage';
import { parseVersion } from './configSchema';
import { build } from './build';

/** Trägt den HTTP-Status mit, z.B. um einen 404 ("keine gültige Version") erkennbar zu machen. */
export class ApiFehler extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ApiFehler';
  }
}

export function authHeader(): Record<string, string> {
  const token = Storage.get<string>('AccessToken', { default: undefined });
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'x-client-version': import.meta.env.APP_VERSION,
  };
}

/**
 * Holt eine gespeicherte Vorlage als `File` — Roh-`fetch()` mit Auth-Headern, da es sich um einen
 * Binär-Download handelt (`FetchRetry` erwartet immer eine JSON-Antwort).
 */
export async function holeVorlageAlsDatei(vorlageId: string): Promise<File> {
  const serverUrl = await getServerUrl();
  const res = await fetch(`${serverUrl}/vorlagen/${vorlageId}`, { headers: authHeader() });
  if (!res.ok) throw new ApiFehler(`Vorlage konnte nicht geladen werden (${res.status})`, res.status);
  return new File([await res.blob()], `vorlage-${vorlageId}.pdf`, { type: 'application/pdf' });
}

/** Extrahiert die Vorlagen-ID aus `Version.layout.template` (`/api/v2/vorlagen/<id>`, vom Server
 * gesetzt, siehe `versionAnlegen.service.ts::zuFormular()`). */
function vorlagenId(template: string): string {
  const id = template.split('/').pop();
  if (!id) throw new Error(`Ungültige Vorlagen-URL: ${template}`);
  return id;
}

/**
 * Löst die gültige Version zum Leistungsdatum server-seitig auf (`GET /formulare/:f?stichtag=`,
 * Server statt Client -- siehe Phase-7-Design-Entscheidung in der Plandatei, Version und
 * ausgelieferte PDF laufen dadurch nie auseinander), lädt die Vorlage authentifiziert nach und
 * erzeugt daraus das PDF.
 *
 * `build()` tut intern nur ein ungeprüftes `fetch(layout.template)` ohne Auth-Header (siehe dort) --
 * `/vorlagen/:id` verlangt aber Login. Deshalb hier die Vorlage vorab laden und `template` auf eine
 * lokale `blob:`-URL umbiegen, derselbe Trick wie die Testdaten-Vorschau im Admin-Editor
 * (`FormularEditor.tsx`), nur mit einer echt hochgeladenen statt einer lokal gewählten Datei.
 */
export async function ladeUndErzeugePdf(formular: string, stichtag: string, daten: Daten, signaturPng?: string): Promise<Uint8Array> {
  const antwort = await FetchRetry<undefined, unknown>(`formulare/${formular}?stichtag=${stichtag}`, undefined, 'GET');
  if (antwort instanceof Error) throw antwort;
  if (!antwort.success) throw new ApiFehler(antwort.message ?? `Keine gültige Version für ${formular} am ${stichtag}`, antwort.statusCode);

  const version = parseVersion(antwort.data);
  const vorlage = await holeVorlageAlsDatei(vorlagenId(version.layout.template));
  const templateUrl = URL.createObjectURL(vorlage);

  try {
    return await build({ ...version, formular, layout: { ...version.layout, template: templateUrl } }, daten, signaturPng);
  } finally {
    URL.revokeObjectURL(templateUrl);
  }
}
