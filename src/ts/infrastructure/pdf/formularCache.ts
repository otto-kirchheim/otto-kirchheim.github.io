import type { Version } from '@otto-kirchheim/nebengeld-shared';
import Storage from '../storage/Storage';
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

function versionSchluessel(formular: string, stichtag: string): string {
  return `${formular}:${stichtag}`;
}

/** Speichert eine erfolgreich aufgelöste Version -- best-effort, ein Schreibfehler (z.B. Quota)
 * darf den eigentlichen PDF-Export nie verhindern. */
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
 * statt offline mit einem Zod-Fehler abzustürzen. */
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
 * Best-effort wie `cacheVersion()`. */
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

/** Liest eine zwischengespeicherte Vorlagen-PDF. */
export function getCachedVorlage(vorlagenId: string): File | undefined {
  try {
    const cache = Storage.get<VorlagenCache>('vorlagenPdfCache', { default: {} });
    const eintrag = cache[vorlagenId];
    if (!eintrag) return undefined;
    return new File([base64AlsBytes(eintrag.base64) as BlobPart], `vorlage-${vorlagenId}.pdf`, { type: 'application/pdf' });
  } catch {
    return undefined;
  }
}

function evictAelteste(cache: VorlagenCache): void {
  const schluessel = Object.keys(cache);
  if (schluessel.length === 0) return;
  const aeltester = schluessel.reduce((a, b) => (cache[a]!.timestamp <= cache[b]!.timestamp ? a : b));
  delete cache[aeltester];
}

async function datenAlsBase64(datei: File): Promise<string> {
  const bytes = new Uint8Array(await datei.arrayBuffer());
  const CHUNK = 0x8000;
  let binaer = '';
  for (let i = 0; i < bytes.length; i += CHUNK) binaer += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(binaer);
}

function base64AlsBytes(base64: string): Uint8Array {
  const binaer = atob(base64);
  const bytes = new Uint8Array(binaer.length);
  for (let i = 0; i < binaer.length; i++) bytes[i] = binaer.charCodeAt(i);
  return bytes;
}
