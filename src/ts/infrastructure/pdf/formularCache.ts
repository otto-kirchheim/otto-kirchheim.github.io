import type { Version } from '@otto-kirchheim/nebengeld-shared';
import Storage from '../../shared/lib/storage/Storage';
import { parseVersion } from './configSchema';

/** Deckelt nur die Vorlagen-PDFs (Binärdaten) -- die Version-Cache-Map bleibt unbegrenzt, da JSON
 * klein ist und pro Formular höchstens ~12 Einträge/Jahr (ein Stichtag je Monat) anfallen. */
const MAX_VORLAGEN_EINTRAEGE = 10;

interface VersionCacheEintrag {
  version: unknown;
  timestamp: number;
}

interface VorlagenCacheEintrag {
  base64: string;
  timestamp: number;
}

type VersionCache = Record<string, VersionCacheEintrag>;
type VorlagenCache = Record<string, VorlagenCacheEintrag>;

/**
 * Cache-Schlüssel einer Version.
 *
 * @param formular - Formular-Code.
 * @param stichtag - Stichtag (`YYYY-MM-DD`).
 * @returns `<formular>:<stichtag>`.
 */
function versionSchluessel(formular: string, stichtag: string): string {
  return `${formular}:${stichtag}`;
}

/** Speichert eine erfolgreich aufgelöste Version -- best-effort, ein Schreibfehler (z.B. Quota)
 * darf den eigentlichen PDF-Export nie verhindern.
 *
 * @param formular - Formular-Code.
 * @param stichtag - Stichtag (`YYYY-MM-DD`), für den die Version aufgelöst wurde.
 * @param version - Die aufgelöste Version.
 */
export function cacheVersion(formular: string, stichtag: string, version: Version): void {
  try {
    const cache = Storage.get<VersionCache>('formularVersionCache', { default: {} });
    cache[versionSchluessel(formular, stichtag)] = { version, timestamp: Date.now() };
    Storage.set('formularVersionCache', cache);
  } catch (err) {
    console.warn('Version-Cache konnte nicht geschrieben werden:', err);
  }
}

/** Liest eine zwischengespeicherte Version. Validiert über `parseVersion()` -- eine strukturell
 * nicht mehr passende Altlast (z.B. nach einer Breaking-Change am Typsystem) gilt als Cache-Miss
 * statt offline mit einem Zod-Fehler abzustürzen.
 *
 * @param formular - Formular-Code.
 * @param stichtag - Stichtag (`YYYY-MM-DD`).
 * @returns Die Version, `undefined` bei Cache-Miss oder nicht mehr gültiger Struktur.
 */
export function getCachedVersion(formular: string, stichtag: string): Version | undefined {
  try {
    const cache = Storage.get<VersionCache>('formularVersionCache', { default: {} });
    const eintrag = cache[versionSchluessel(formular, stichtag)];
    if (!eintrag) return undefined;
    return parseVersion(eintrag.version);
  } catch {
    return undefined;
  }
}

/** Speichert eine geladene Vorlagen-PDF, dedupliziert über die (inhaltsstabile) `vorlagenId`.
 * Best-effort wie `cacheVersion()`; hält höchstens `MAX_VORLAGEN_EINTRAEGE` Einträge (ältester fliegt zuerst).
 *
 * @param vorlagenId - Inhaltsstabile Id der Vorlage.
 * @param datei - Die geladene Vorlagen-PDF.
 */
export async function cacheVorlage(vorlagenId: string, datei: File): Promise<void> {
  try {
    const cache = Storage.get<VorlagenCache>('vorlagenPdfCache', { default: {} });
    if (cache[vorlagenId]) return;
    cache[vorlagenId] = { base64: await datenAlsBase64(datei), timestamp: Date.now() };
    while (Object.keys(cache).length > MAX_VORLAGEN_EINTRAEGE) evictAelteste(cache);
    Storage.set('vorlagenPdfCache', cache);
  } catch (err) {
    console.warn('Vorlagen-Cache konnte nicht geschrieben werden:', err);
  }
}

/**
 * Liest eine zwischengespeicherte Vorlagen-PDF.
 *
 * @param vorlagenId - Inhaltsstabile Id der Vorlage.
 * @returns Die PDF als `File`, `undefined` bei Cache-Miss oder Lesefehler.
 */
export function getCachedVorlage(vorlagenId: string): File | undefined {
  try {
    const cache = Storage.get<VorlagenCache>('vorlagenPdfCache', { default: {} });
    const eintrag = cache[vorlagenId];
    if (!eintrag) return undefined;
    return new File([base64AlsBytes(eintrag.base64) as BlobPart], `vorlage-${vorlagenId}.pdf`, {
      type: 'application/pdf',
    });
  } catch {
    return undefined;
  }
}

/**
 * Entfernt den Eintrag mit dem kleinsten `timestamp` (verändert `cache` direkt).
 *
 * @param cache - Vorlagen-Cache; bei leerem Cache passiert nichts.
 */
function evictAelteste(cache: VorlagenCache): void {
  const schluessel = Object.keys(cache);
  if (schluessel.length === 0) return;
  const aeltester = schluessel.reduce((a, b) => (cache[a]!.timestamp <= cache[b]!.timestamp ? a : b));
  delete cache[aeltester];
}

/**
 * Kodiert eine Datei als Base64. Die Bytes gehen in Blöcken an `String.fromCharCode`, weil ein
 * Spread über die ganze Datei das Argument-Limit sprengen würde.
 *
 * @param datei - Zu kodierende Datei.
 * @returns Base64-String.
 */
async function datenAlsBase64(datei: File): Promise<string> {
  const bytes = new Uint8Array(await datei.arrayBuffer());
  const CHUNK = 0x8000;
  let binaer = '';
  for (let i = 0; i < bytes.length; i += CHUNK) binaer += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(binaer);
}

/**
 * Dekodiert einen Base64-String zu Bytes.
 *
 * @param base64 - Base64-String aus `datenAlsBase64()`.
 * @returns Die dekodierten Bytes.
 */
function base64AlsBytes(base64: string): Uint8Array {
  const binaer = atob(base64);
  const bytes = new Uint8Array(binaer.length);
  for (let i = 0; i < binaer.length; i++) bytes[i] = binaer.charCodeAt(i);
  return bytes;
}
