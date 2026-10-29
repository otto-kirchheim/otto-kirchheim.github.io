import { FORMAT_VORSCHLAEGE } from './datenKatalog';

type Zeile = { links: string; rechts: string };

const PLATZHALTER_BEISPIELE: Zeile[] = [
  {
    links: '{Datenpfad}',
    rechts:
      'Beliebiger Datenpfad, z.B. {Nachname} -- ohne Format greift der Standard-Fallback (Text/Zahl unverändert, Array als Liste ` / `, Boolean als Ja/Nein). Für VorgabenU.Pers.OE reicht das NICHT -- dafür immer explizit :@oe angeben (siehe unten).',
  },
  {
    links: '{Datenpfad:Format}',
    rechts:
      'Erzwingt ein Format (siehe unten), z.B. {VorgabenU.Pers.OE:@oe}, {Betrag:#.##0,00 €} oder {Beginn:HH:mm}. Getrennt wird am ersten Doppelpunkt. Text gehört neben den Platzhalter: {Tag:00}. Tag',
  },
  { links: '{seite} / {seiten}', rechts: 'Aktuelle Seitenzahl / Gesamtseitenzahl dieses Dokuments.' },
  {
    links: '{seite-1} / {seite+1}',
    rechts:
      'Seitenzahl mit ganzzahligem Versatz, z.B. "Übertrag von Seite {seite-1}". Gilt genauso für {seiten-1} etc.',
  },
  { links: '{heute}', rechts: 'Erzeugungsdatum des PDFs als DD.MM.YYYY (15.03.2026).' },
  { links: '{heute:Format}', rechts: 'Erzeugungsdatum mit anderem Format, z.B. {heute:DD.MM.} (15.03.).' },
  { links: '{A}, {B}', rechts: 'Mehrere Platzhalter gemischt im selben Text, z.B. {Nachname}, {Vorname}.' },
];

const DATUM_TOKENS: Zeile[] = [
  { links: 'D / DD', rechts: 'Tag: 5 / 05' },
  { links: 'dd / ddd / dddd', rechts: 'Wochentag: So / So. / Sonntag' },
  { links: 'M / MM', rechts: 'Monat: 3 / 03' },
  { links: 'MMM / MMMM', rechts: 'Monatsname: Jan., März / März' },
  { links: 'YY / YYYY', rechts: 'Jahr: 26 / 2026' },
  { links: 'H / HH', rechts: 'Stunde: 7 / 07 -- bei einer Dauer auch über 23 (26:30)' },
  { links: 'm / mm', rechts: 'Minute: 5 / 05' },
  { links: 's / ss', rechts: 'Sekunde: 9 / 09' },
  { links: '[Text]', rechts: 'Fester Text im Muster, z.B. [KW 01] DD.MM. oder HH:[00]' },
];

const ZAHL_TOKENS: Zeile[] = [
  { links: '0', rechts: 'Pflichtziffer. Vor dem Komma Mindeststellen (00 → 05), nach dem Komma feste Stelle' },
  { links: '#', rechts: 'Optionale Nachkommastelle, Nullen am Ende entfallen (#.##0,## → 5 / 1.234,57)' },
  {
    links: '. oder Leerzeichen',
    rechts:
      'Tausendertrenner im ganzzahligen Teil (#.##0 → 1.235, # ##0 → 1 235, ohne: 0 → 1235); Gruppengröße wie im Muster (000 000 000 → 123 456 789, 00 00 00 → 12 34 56)',
  },
  { links: ',', rechts: 'Dezimalkomma' },
  { links: '%', rechts: 'Wert × 100 (0,0 % → 12,5 % aus 0,125)' },
  { links: 'sonst', rechts: 'Text davor/dahinter bleibt stehen (#.##0,00 €, 0 Tage); [Text] ebenso (0 [m])' },
];

const SCHLUESSEL: Zeile[] = FORMAT_VORSCHLAEGE.filter(v => v.value.startsWith('@')).map(v => ({
  links: v.value,
  rechts: v.label,
}));

const REGELN =
  'Enthält das Format 0 oder # (außerhalb von [ ]), ist es ein Zahlenmuster, sonst ein Datumsmuster. ' +
  'Im Datumsmuster sind nur die Tokens unten erlaubt -- anderer Text gehört in [ ]. Mehrdeutiges ' +
  '(HH:00, 0 m) wird angemahnt; ungültige Formate lassen sich nicht speichern.';

/**
 * Zweispaltige Tabelle.
 *
 * @param props - `zeilen` und optional `kopf` (Spaltenüberschriften).
 */
function Tabelle({ zeilen, kopf }: { zeilen: Zeile[]; kopf?: [string, string] }) {
  return (
    <div className="db-table luft-unten-sm" data-width="full" data-size="small" data-divider="both">
      <table>
        {kopf && (
          <thead>
            <tr>
              <th>{kopf[0]}</th>
              <th>{kopf[1]}</th>
            </tr>
          </thead>
        )}
        <tbody>
          {zeilen.map(z => (
            <tr key={z.links}>
              <td className="schrift-mono nowrap">{z.links}</td>
              <td>{z.rechts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Überschrift eines Abschnitts.
 *
 * @param props - `children` der Titel.
 */
function Titel({ children }: { children: string }) {
  return <div className="zelle-klein fett luft-unten-2xs">{children}</div>;
}

/** Inhalt des Hilfe-Dialogs: Platzhalter-Syntax und die Formatsprache (Datum, Zahl, Schlüsselwörter). */
export function PlatzhalterHilfeInhalt() {
  return (
    <>
      <Tabelle zeilen={PLATZHALTER_BEISPIELE} kopf={['Platzhalter', 'Bedeutung']} />
      <Titel>{'Formate (für das Feld-Format und {Pfad:Format})'}</Titel>
      <p className="zelle-klein luft-unten-2xs">{REGELN}</p>
      <Titel>Datum und Uhrzeit (dayjs-Tokens)</Titel>
      <Tabelle zeilen={DATUM_TOKENS} />
      <Titel>Zahl</Titel>
      <Tabelle zeilen={ZAHL_TOKENS} />
      <Titel>Feste Schlüsselwörter</Titel>
      <Tabelle zeilen={SCHLUESSEL} />
      <Titel>Beispiele</Titel>
      <Tabelle
        zeilen={FORMAT_VORSCHLAEGE.filter(v => !v.value.startsWith('@')).map(v => ({
          links: v.value,
          rechts: v.label,
        }))}
      />
    </>
  );
}
