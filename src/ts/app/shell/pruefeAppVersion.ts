import Storage from '@/shared/lib/storage/Storage';
import compareVersion from '@/shared/lib/version/compareVersion';

/**
 * Prueft beim Start, ob der Browser Daten einer aelteren App-Version haelt, und leert sie dann (`localStorage` und
 * `sessionStorage`). Muss VOR allem anderen laufen, das den Speicher liest (Root-Mount, Start-Aufgaben): Alt-Daten in einem
 * frueheren Format liessen sonst schon den ersten Zugriff scheitern, die App blieb haengen und kam nie bis zur Pruefung.
 *
 * Ohne `Version`-Eintrag, aber mit App-Daten (mehr als 3 Keys) gilt der Speicher als alt (vor Einfuehrung von `Version`).
 * Der Login (`userLoginSuccess`) schreibt `Version` neu.
 *
 * @returns Name des bisher angemeldeten Benutzers, wenn geleert wurde (fuer den Hinweis nach dem Start); sonst `null`.
 */
export default function pruefeAppVersion(): string | null {
  try {
    return pruefe();
  } catch {
    return null; // Speicher gesperrt (z. B. Cookies blockiert) -- der Start-Task meldet das selbst
  }
}

/** Eigentliche Pruefung, siehe `pruefeAppVersion`. */
function pruefe(): string | null {
  if (Storage.size() <= 3) return null;
  const aktuell = import.meta.env.APP_VERSION;
  const gespeichert = Storage.get<string>('Version', { check: true, default: '0.0.0' });
  if (compareVersion(gespeichert, aktuell) >= 0) {
    if (gespeichert !== aktuell) Storage.set('Version', aktuell);
    return null;
  }
  const benutzer = Storage.get<string>('Benutzer', { check: true, default: '' });
  Storage.clear();
  sessionStorage.clear();
  return benutzer;
}
