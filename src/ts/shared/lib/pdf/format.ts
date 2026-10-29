import { DATUM_TOKEN_REGEX, datumTokens, pruefeFormat, zerlegeZahlenmuster } from '@otto-kirchheim/nebengeld-shared';
import type { FormatSchluessel, Zahlenmuster } from '@otto-kirchheim/nebengeld-shared';
import dayjs from '@/shared/lib/date/configDayjs';
import { alsDatum } from './aggregatoren';

type Formatierer = (value: unknown) => string;

/** `"HH:mm"`-Strings kommen so aus den Download-Bodies (Uhrzeit oder Dauer, kein Datum). */
const NUR_UHRZEIT = /^(\d{1,2}):(\d{2})/;
const ZEIT_TOKEN = /^[Hms]{1,2}$/;
const MONAT_TOKEN = /^M{1,4}$/;
const GANZZAHL = /^-?\d+(\.\d+)?$/;

/**
 * Feste Werttransformationen (`@…`) -- kein Muster, sondern eigene Logik je Schlüsselwort.
 */
const SCHLUESSEL_FORMAT: Record<FormatSchluessel, Formatierer> = {
  /**
   * Arrays zu einer Zelle zusammenfügen (Trenner ` / `). Nicht für `Pers.OE` -- siehe `@oe`.
   *
   * @param value - Array oder Einzelwert.
   * @returns Nichtleere Einträge, mit ` / ` verbunden.
   */
  '@liste': value =>
    Array.isArray(value)
      ? value.filter(t => t !== null && t !== undefined && t !== '').join(' / ')
      : String(value ?? ''),
  /**
   * Text in Großbuchstaben.
   *
   * @param value - Beliebiger Wert.
   * @returns Text in Großbuchstaben.
   */
  '@grossbuchstaben': value => String(value ?? '').toUpperCase(),
  /**
   * Boolean (echt oder als `"true"`/`"false"`-String) als deutsches Wort statt `true`/`false`.
   *
   * @param value - Boolean oder `"true"`/`"false"`.
   * @returns `Ja` oder `Nein`.
   */
  '@jaNein': value => (value === true || value === 'true' ? 'Ja' : 'Nein'),
  /**
   * Hierarchie-Ebenen einer OE (`Pers.OE`) kanonisch zusammenfügen: erste zwei Ebenen mit `.`, weitere
   * mit `-`, eine numerische letzte Ebene (Teamnummer) mit Leerzeichen, z.B. `V.IW-MI-N-KSL-IL 03`.
   * Spiegelt `joinOeSegments` (Backend) und `joinOeLevels` (`shared/lib/ressource/oeLevels.ts`), bewusst
   * dupliziert. `@liste` würde die Schreibweise zerstören.
   *
   * @param value - Ebenen der OE (Array); Nicht-Arrays werden als Text durchgereicht.
   * @returns Kanonische Schreibweise, leer ohne Ebenen.
   */
  '@oe': value => {
    if (!Array.isArray(value)) return String(value ?? '');
    const segmente = value.map(teil => String(teil ?? '').trim()).filter(Boolean);
    if (segmente.length === 0) return '';
    if (segmente.length === 1) return segmente[0]!;

    const [ebene1, ebene2, ...rest] = segmente;
    const basis = `${ebene1}.${ebene2}`;
    if (rest.length === 0) return basis;

    const letzte = rest[rest.length - 1]!;
    const hatNumerischeTeamnummer = /^\d+$/.test(letzte) && rest.length >= 2;
    if (!hatNumerischeTeamnummer) return `${basis}-${rest.join('-')}`;

    const vorTeamnummer = rest.slice(0, -1).join('-');
    return `${basis}-${vorTeamnummer} ${letzte}`;
  },
};

/**
 * Stringifizierung für Werte ohne `format`. Nie roh `String()`: Arrays ergäben kommagetrennt ohne
 * Leerzeichen, Booleans englisches "true", Objekte (falscher Datenpfad) `"[object Object]"`.
 *
 * @param value - Beliebiger Wert.
 * @returns Anzeigetext; leer für `null`, `undefined` und Objekte.
 */
export function standardText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return SCHLUESSEL_FORMAT['@liste'](value);
  if (typeof value === 'boolean') return SCHLUESSEL_FORMAT['@jaNein'](value);
  if (typeof value === 'object') return '';
  return String(value);
}

/**
 * Zahl aus einem Rohwert; nur echte Zahlen und reine Ziffern-Strings (kein `Number("02:30")`-NaN-Raten).
 *
 * @param value - Rohwert.
 * @returns Die Zahl, oder `null`.
 */
function alsEchteZahl(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && GANZZAHL.test(value.trim())) return Number(value);
  return null;
}

/**
 * Setzt einen Trenner zwischen Ziffern-Gruppen, von rechts gezählt.
 *
 * @param ziffern - Ganzzahliger Teil ohne Vorzeichen.
 * @param trenner - Trennzeichen (`.` oder Leerzeichen).
 * @param groesse - Ziffern je Gruppe.
 * @returns Gruppierte Ziffern, z. B. `1.234.567` oder `123 456 789`.
 */
function gruppiere(ziffern: string, trenner: string, groesse: number): string {
  const gruppen: string[] = [];
  for (let ende = ziffern.length; ende > 0; ende -= groesse)
    gruppen.unshift(ziffern.slice(Math.max(0, ende - groesse), ende));
  return gruppen.join(trenner);
}

/**
 * Formatierer für ein Zahlenmuster (deutsche Schreibweise, siehe `zerlegeZahlenmuster` in shared).
 *
 * @param m - Zerlegtes Zahlenmuster.
 * @returns Formatierer; Text, der keine Zahl ist, bleibt unverändert (Feld mit Text ODER Nummer).
 */
function zahlFormatierer(m: Zahlenmuster): Formatierer {
  // Gruppiert wird selbst: `Intl` kennt nur 3er-Gruppen mit Punkt, Muster wie `00 00 00` brauchen mehr.
  const zahlformat = new Intl.NumberFormat('de-DE', {
    minimumIntegerDigits: m.minInt,
    useGrouping: false,
    minimumFractionDigits: m.minFrac,
    maximumFractionDigits: m.maxFrac,
  });
  return value => {
    const n = alsEchteZahl(value);
    if (n === null) return typeof value === 'number' ? '' : standardText(value);
    const wert = m.prozent ? n * 100 : n;
    const [ganz = '', bruch] = zahlformat.format(Math.abs(wert)).split(',');
    // Vorzeichen nur, wenn nach dem Runden etwas übrig bleibt (kein "-0").
    const vorzeichen = wert < 0 && /[1-9]/.test(ganz + (bruch ?? '')) ? '-' : '';
    const ganzGruppiert = m.gruppe ? gruppiere(ganz, m.gruppe.trenner, m.gruppe.groesse) : ganz;
    return `${m.praefix}${vorzeichen}${ganzGruppiert}${bruch === undefined ? '' : `,${bruch}`}${m.suffix}`;
  };
}

/**
 * Dauer in Minuten nach einem Zeitmuster. Stunden laufen über 23 hinaus (`dayjs.duration().format`
 * bricht bei 24 h in Tage um, darum eigene Ersetzung).
 *
 * @param minuten - Dauer in Minuten (Bruchteile = Sekunden).
 * @param muster - Muster nur mit `H`/`m`/`s`-Tokens.
 * @returns Formatierte Dauer, negativ mit `-` davor.
 */
function formatiereDauer(minuten: number, muster: string): string {
  const tokens = datumTokens(muster);
  const mitSekunden = tokens.some(t => t.startsWith('s'));
  // Ohne Sekunden-Token auf ganze Minuten runden, sonst schneidet `H:mm` 90,6 min auf 1:30 ab.
  const sekundenGesamt = mitSekunden ? Math.abs(Math.round(minuten * 60)) : Math.abs(Math.round(minuten)) * 60;
  const mitStunden = tokens.some(t => t.startsWith('H'));
  const teile: Record<string, number> = {
    H: mitStunden ? Math.floor(sekundenGesamt / 3600) : 0,
    m: Math.floor((mitStunden ? sekundenGesamt % 3600 : sekundenGesamt) / 60),
    s: sekundenGesamt % 60,
  };
  const text = muster.replace(DATUM_TOKEN_REGEX, token =>
    token.startsWith('[') ? token.slice(1, -1) : String(teile[token[0]!]).padStart(token.length, '0'),
  );
  return minuten < 0 && sekundenGesamt > 0 ? `-${text}` : text;
}

/**
 * Formatierer für ein Datumsmuster (dayjs-Tokens, Locale `de`). Liest den Rohwert je nach Muster als
 * Dauer in Minuten (nur Zeit-Tokens + Zahl/`"HH:mm"`), Monatsnummer (nur Monats-Tokens + 1-12) oder Datum.
 *
 * @param muster - Gültiges Datumsmuster.
 * @returns Formatierer; leer bei Unlesbarem.
 */
function datumFormatierer(muster: string): Formatierer {
  const tokens = datumTokens(muster);
  const nurZeit = tokens.every(t => ZEIT_TOKEN.test(t));
  const nurMonat = tokens.every(t => MONAT_TOKEN.test(t));
  return value => {
    if (value === null || value === undefined || value === '') return '';
    if (nurZeit) {
      const uhrzeit = typeof value === 'string' ? NUR_UHRZEIT.exec(value.trim()) : null;
      if (uhrzeit) return formatiereDauer(Number(uhrzeit[1]) * 60 + Number(uhrzeit[2]), muster);
      if (typeof value === 'number') return formatiereDauer(value, muster);
    }
    if (nurMonat) {
      const monat = alsEchteZahl(value);
      // Kleine ganze Zahl = Monatsnummer (0/13 → leer); große = ms-Zeitstempel (`letztesDatum`).
      if (monat !== null && Number.isInteger(monat) && Math.abs(monat) < 1000) {
        return monat >= 1 && monat <= 12
          ? dayjs()
              .month(monat - 1)
              .format(muster)
          : '';
      }
    }
    const d = alsDatum(value);
    return d ? dayjs(d).format(muster) : '';
  };
}

const CACHE = new Map<string, Formatierer>();

/**
 * Formatierer für ein Format (zwischengespeichert, damit `Intl.NumberFormat` und die Prüfung je Muster
 * nur einmal entstehen). Ungültige Formate fallen auf `standardText` zurück.
 *
 * @param muster - Format aus `Feld`/`Spalte`/Sonderzeile oder `{Pfad:Format}`.
 * @returns Formatierer.
 */
function formatierer(muster: string): Formatierer {
  let f = CACHE.get(muster);
  if (f) return f;
  const { art } = pruefeFormat(muster);
  if (art === 'schluessel') f = SCHLUESSEL_FORMAT[muster as FormatSchluessel];
  else if (art === 'zahl') f = zahlFormatierer(zerlegeZahlenmuster(muster)!);
  else if (art === 'datum') f = datumFormatierer(muster);
  else f = standardText;
  CACHE.set(muster, f);
  return f;
}

/**
 * Wandelt einen Rohwert in den Zellentext.
 *
 * @param value - Rohwert.
 * @param muster - Format; ohne Format greift `standardText`.
 * @returns Formatierter Text.
 */
export function formatiereWert(value: unknown, muster: string | undefined): string {
  return muster ? formatierer(muster)(value) : standardText(value);
}
