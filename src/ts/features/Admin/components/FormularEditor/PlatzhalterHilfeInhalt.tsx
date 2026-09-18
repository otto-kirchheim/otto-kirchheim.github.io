import { FORMATE } from './datenKatalog';

const PLATZHALTER_BEISPIELE: { platzhalter: string; beschreibung: string }[] = [
  {
    platzhalter: '{Datenpfad}',
    beschreibung:
      'Beliebiger Datenpfad, z.B. {Nachname} -- ohne Format greift der Standard-Fallback (Text/Zahl unverändert, Array als Liste ` / `, Boolean als Ja/Nein). Für VorgabenU.Pers.OE reicht das NICHT -- dafür immer explizit :oe angeben (siehe unten).',
  },
  {
    platzhalter: '{Datenpfad:Format}',
    beschreibung:
      'Erzwingt eines der Formate unten, z.B. {VorgabenU.Pers.OE:oe} oder {Betrag:waehrung}. Unbekannter Formatname wird ignoriert, der Pfad bleibt über den Standard-Fallback nutzbar.',
  },
  { platzhalter: '{seite} / {seiten}', beschreibung: 'Aktuelle Seitenzahl / Gesamtseitenzahl dieses Dokuments.' },
  {
    platzhalter: '{seite-1} / {seite+1}',
    beschreibung:
      'Seitenzahl mit ganzzahligem Versatz, z.B. "Übertrag von Seite {seite-1}". Gilt genauso für {seiten-1} etc.',
  },
  { platzhalter: '{heute}', beschreibung: 'Erzeugungsdatum des PDFs, Format datum (15.03.2026).' },
  {
    platzhalter: '{heute:Format}',
    beschreibung: 'Erzeugungsdatum mit anderem Format, z.B. {heute:datumKurz} (15.03.).',
  },
  { platzhalter: '{A}, {B}', beschreibung: 'Mehrere Platzhalter gemischt im selben Text, z.B. {Nachname}, {Vorname}.' },
];

export function PlatzhalterHilfeInhalt() {
  return (
    <>
      <div className="db-table mb-3" data-width="full" data-size="small" data-divider="both">
        <table>
          <thead>
            <tr>
              <th>Platzhalter</th>
              <th>Bedeutung</th>
            </tr>
          </thead>
          <tbody>
            {PLATZHALTER_BEISPIELE.map(b => (
              <tr key={b.platzhalter}>
                <td className="font-monospace text-nowrap">{b.platzhalter}</td>
                <td>{b.beschreibung}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="small fw-semibold mb-1">Verfügbare Formate (für das Feld-Format und {'{Pfad:Format}'})</div>
      <div className="db-table" data-width="full" data-size="small" data-divider="both">
        <table>
          <tbody>
            {FORMATE.filter(f => f.wert !== '').map(f => (
              <tr key={f.wert}>
                <td className="font-monospace text-nowrap">{f.wert}</td>
                <td>{f.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
