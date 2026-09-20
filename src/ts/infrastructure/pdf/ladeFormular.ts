import type { Daten } from '@otto-kirchheim/nebengeld-shared';
import { FetchRetry, getServerUrl } from '../api/FetchRetry';
import Storage from '../storage/Storage';
import { createSnackBar } from '../ui/CustomSnackbar';
import { parseVersion } from './configSchema';
import { build } from './build';
import { cacheVersion, cacheVorlage, getCachedVersion, getCachedVorlage } from './formularCache';

/** `still`: Warmlauf-Aufrufe (`warmeVorlagenCache`) zeigen keinen "Offline"-Snackbar, wenn sie auf den
 * Cache zurückfallen. Der normale Export-Pfad bleibt bei `false`. */
interface LadeOptionen {
  still?: boolean;
}

/** Trägt den HTTP-Status mit, z.B. um einen 404 ("keine gültige Version") erkennbar zu machen. */
export class ApiFehler extends Error {
  /**
   * @param message - Fehlertext.
   * @param statusCode - HTTP-Status der Serverantwort.
   */
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ApiFehler';
  }
}

/**
 * Header für Roh-`fetch()`-Aufrufe: Bearer-Token (falls angemeldet) und Client-Version.
 *
 * @returns Header-Objekt ohne `Authorization`, wenn kein Token gespeichert ist.
 */
export function authHeader(): Record<string, string> {
  const token = Storage.get<string>('AccessToken', { default: undefined });
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'x-client-version': import.meta.env.APP_VERSION,
  };
}

/** Zeigt den Snackbar-Hinweis, dass eine zwischengespeicherte Vorlage bzw. Version verwendet wird. */
function zeigeOfflineHinweis(): void {
  createSnackBar({
    message: 'Offline: zwischengespeicherte Vorlage verwendet.',
    status: 'warning',
    icon: 'warn',
    timeout: 4000,
    fixed: true,
  });
}

/**
 * Holt eine gespeicherte Vorlage als `File` — Roh-`fetch()` mit Auth-Headern, da es sich um einen
 * Binär-Download handelt (`FetchRetry` erwartet immer eine JSON-Antwort).
 *
 * Bei echtem Transportfehler (offline, Server nicht erreichbar) fällt der Aufruf auf eine zuvor
 * erfolgreich geladene Vorlage aus `formularCache` zurück -- ein `ApiFehler` (erreichbarer Server
 * antwortet mit einem echten HTTP-Fehler, z.B. 404 "gelöscht") wird dagegen NIE durch den Cache
 * maskiert und immer weitergereicht.
 *
 * @param vorlageId - Id der Vorlage (`/vorlagen/:id`).
 * @param optionen - `still`: bei Cache-Fallback keinen Offline-Hinweis zeigen.
 * @returns Die Vorlagen-PDF.
 * @throws {ApiFehler} Bei HTTP-Fehler des erreichbaren Servers.
 * @throws {Error} Bei Transportfehler ohne Cache-Eintrag.
 */
export async function holeVorlageAlsDatei(vorlageId: string, { still = false }: LadeOptionen = {}): Promise<File> {
  try {
    const serverUrl = await getServerUrl();
    const res = await fetch(`${serverUrl}/vorlagen/${vorlageId}`, { headers: authHeader() });
    if (!res.ok) throw new ApiFehler(`Vorlage konnte nicht geladen werden (${res.status})`, res.status);
    const datei = new File([await res.blob()], `vorlage-${vorlageId}.pdf`, { type: 'application/pdf' });
    await cacheVorlage(vorlageId, datei);
    return datei;
  } catch (err) {
    if (err instanceof ApiFehler) throw err;
    const cached = getCachedVorlage(vorlageId);
    if (!cached) throw err;
    if (!still) zeigeOfflineHinweis();
    return cached;
  }
}

/**
 * Extrahiert die Vorlagen-ID aus `Version.layout.template` (`/api/v2/vorlagen/<id>`, vom Server
 * gesetzt, siehe `versionAnlegen.service.ts::zuFormular()`).
 *
 * @param template - Wert von `Version.layout.template`.
 * @returns Letztes Pfadsegment der URL.
 * @throws {Error} Wenn die URL kein Pfadsegment enthält.
 */
function vorlagenId(template: string): string {
  const id = template.split('/').pop();
  if (!id) throw new Error(`Ungültige Vorlagen-URL: ${template}`);
  return id;
}

/**
 * Löst die gültige Version zum Leistungsdatum server-seitig auf (`GET /formulare/:f?stichtag=`) --
 * so laufen Version und ausgelieferte PDF nie auseinander. Bei echtem Transportfehler fällt der
 * Aufruf auf eine zuvor erfolgreich geladene Version aus `formularCache` zurück -- ein `ApiFehler`
 * (erreichbarer Server sagt bewusst "nein", z.B. "keine gültige Version für diesen Stichtag") wird
 * dagegen NIE durch den Cache maskiert.
 *
 * @param formular - Formular-Code.
 * @param stichtag - Stichtag (`YYYY-MM-DD`).
 * @param optionen - `still`: bei Cache-Fallback keinen Offline-Hinweis zeigen.
 * @returns Die validierte Version.
 * @throws {ApiFehler} Wenn der Server keine gültige Version liefert.
 * @throws {Error} Bei Transportfehler ohne Cache-Eintrag.
 */
async function loeseVersionAuf(formular: string, stichtag: string, { still = false }: LadeOptionen = {}) {
  try {
    const antwort = await FetchRetry<undefined, unknown>(
      `formulare/${formular}?stichtag=${stichtag}`,
      undefined,
      'GET',
    );
    if (antwort instanceof Error) throw antwort;
    if (!antwort.success)
      throw new ApiFehler(
        antwort.message ?? `Keine gültige Version für ${formular} am ${stichtag}`,
        antwort.statusCode,
      );

    const version = parseVersion(antwort.data);
    cacheVersion(formular, stichtag, version);
    return version;
  } catch (err) {
    if (err instanceof ApiFehler) throw err;
    const cached = getCachedVersion(formular, stichtag);
    if (!cached) throw err;
    if (!still) zeigeOfflineHinweis();
    return cached;
  }
}

/**
 * Vorwaermer fuer den Offline-Fallback: loest die zum Stichtag gueltige ("neueste") Version
 * server-seitig auf und legt sie samt zugehoeriger Vorlagen-PDF in `formularCache` ab. Best-effort
 * und komplett still -- laeuft im Hintergrund (siehe `warmeFormularCaches.ts`) und darf nie werfen
 * oder ein Snackbar zeigen.
 *
 * - Nur online: ohne Netz gibt es nichts frisch zu holen, und der Fallback-Pfad soll hier nicht
 *   greifen (kein "Offline"-Hinweis fuer einen Vorgang, den der Nutzer nicht ausgeloest hat).
 * - Version wird bewusst bei jedem Lauf neu aufgeloest und ueberschrieben, damit eine laengst
 *   veroeffentlichte neue Version nicht dauerhaft an einer alten Cache-Zeile haengenbleibt.
 * - Die Vorlagen-PDF (Binaerdaten) wird nur gezogen, wenn sie noch nicht im Cache liegt.
 *
 * @param formular - Formular-Code.
 * @param stichtag - Stichtag (`YYYY-MM-DD`).
 */
export async function warmeVorlagenCache(formular: string, stichtag: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  try {
    const version = await loeseVersionAuf(formular, stichtag, { still: true });
    const id = vorlagenId(version.layout.template);
    if (getCachedVorlage(id)) return;
    await holeVorlageAlsDatei(id, { still: true });
  } catch {
    // best-effort: offline / keine gueltige Version / Quota -> Warmlauf still ueberspringen
  }
}

/**
 * Löst die Version auf, lädt die zugehörige Vorlage authentifiziert nach und erzeugt daraus das PDF.
 *
 * `build()` tut intern nur ein ungeprüftes `fetch(layout.template)` ohne Auth-Header (siehe dort) --
 * `/vorlagen/:id` verlangt aber Login. Deshalb hier die Vorlage vorab laden und `template` auf eine
 * lokale `blob:`-URL umbiegen, derselbe Trick wie die Testdaten-Vorschau im Admin-Editor
 * (`FormularEditor.tsx`), nur mit einer echt hochgeladenen statt einer lokal gewählten Datei.
 *
 * @param formular - Formular-Code.
 * @param stichtag - Stichtag (`YYYY-MM-DD`) zur Versionsauflösung.
 * @param daten - Quelldaten des PDFs.
 * @param signaturPng - Unterschrift als PNG-Data-URL, optional (siehe `build()`).
 * @param digitaleSignatur - true bei Wahl "Digital" (siehe `build()`).
 * @returns Die PDF-Bytes.
 */
export async function ladeUndErzeugePdf(
  formular: string,
  stichtag: string,
  daten: Daten,
  signaturPng?: string,
  digitaleSignatur?: boolean,
): Promise<Uint8Array> {
  const version = await loeseVersionAuf(formular, stichtag);
  const vorlage = await holeVorlageAlsDatei(vorlagenId(version.layout.template));
  const templateUrl = URL.createObjectURL(vorlage);

  try {
    return await build(
      { ...version, formular, layout: { ...version.layout, template: templateUrl } },
      daten,
      signaturPng,
      digitaleSignatur,
    );
  } finally {
    URL.revokeObjectURL(templateUrl);
  }
}
