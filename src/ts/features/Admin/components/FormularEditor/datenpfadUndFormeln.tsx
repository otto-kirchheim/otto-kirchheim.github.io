import type { Feld } from '@otto-kirchheim/nebengeld-shared';
import { gruppiere, katalogFelder, type FormularCode, type KatalogEintrag } from './datenKatalog';
import { DBButton, DBStack } from '@db-ux/react-core-components';
import { DbAuswahl, DbFeld } from '@/components';

/**
 * Wählt EINEN Datenpfad -- für Kopf-/Fuß-Felder im "Datenfeld"-Modus ist der Objekt-Schlüssel
 * selbst der Pfad (siehe `umbenennen()` in `FeldListe`), dort kann ein Pfad also nur von EINEM
 * Feld gleichzeitig belegt sein. `belegt` (Pfade anderer Felder, das eigene ausgenommen) markiert
 * bereits vergebene Optionen als `disabled` -- ohne das wählt man scheinbar folgenlos einen
 * belegten Pfad aus (`umbenennen()` bricht still ab, `felder[neu]` existiert schon), ohne zu
 * verstehen, warum sich der Titel des Feldes nicht ändert. Denselben Wert an zwei Positionen
 * zeigen: stattdessen "Text"-Modus mit `{Pfad}`-Platzhalter verwenden. Andere Aufrufer (Spalten-
 * Schlüssel, `Feld.quellen`) kennen diese Einschränkung nicht -- dort bleibt `belegt` leer.
 */
export function DatenpfadWahl({
  wert,
  eintraege,
  belegt = new Set(),
  onChange,
}: {
  wert: string;
  eintraege: KatalogEintrag[];
  belegt?: Set<string>;
  onChange: (pfad: string) => void;
}) {
  const bekannt = eintraege.some(e => e.pfad === wert);
  return (
    <div>
      <DBStack direction="row" alignment="end" gap="x-small" className="feldgruppe">
        <DbAuswahl
          beschriftung="Datenfeld"
          dicht
          value={bekannt ? wert : '__frei'}
          onChange={e => onChange(e.target.value)}
        >
          {gruppiere(eintraege).map(([gruppe, felder]) => (
            <optgroup key={gruppe} label={gruppe}>
              {felder.map(f => (
                <option key={f.pfad} value={f.pfad} disabled={belegt.has(f.pfad)}>
                  {f.label}
                  {belegt.has(f.pfad) ? ' (bereits von einem anderen Feld verwendet)' : ''}
                </option>
              ))}
            </optgroup>
          ))}
          <option value="__frei">Freier Datenpfad…</option>
        </DbAuswahl>
        {!bekannt && (
          <DbFeld
            beschriftung="Freier Datenpfad"
            dicht
            feldKlasse="font-monospace"
            ungueltig={belegt.has(wert)}
            placeholder="Datenpfad"
            value={wert === '__frei' ? '' : wert}
            onChange={e => onChange(e.target.value)}
          />
        )}
      </DBStack>
      {!bekannt && belegt.has(wert) && (
        <div className="small text-danger">Dieser Datenpfad wird schon von einem anderen Feld verwendet.</div>
      )}
    </div>
  );
}

const TRENNER: { wert: string; label: string }[] = [
  { wert: ' ', label: 'Leerzeichen' },
  { wert: ', ', label: 'Komma  ( , )' },
  { wert: ' / ', label: 'Schrägstrich  ( / )' },
  { wert: '; ', label: 'Semikolon  ( ; )' },
  { wert: ' - ', label: 'Bindestrich  ( - )' },
  { wert: ' | ', label: 'Senkrechter Strich  ( | )' },
  { wert: '\n', label: 'Neue Zeile (braucht Zeilenumbruch)' },
];

/** Mehrere Datenpfade in eine Zelle, verbunden mit einem frei wählbaren Trennzeichen -- im
 * Unterschied zu Text+Platzhaltern (`PlatzhalterPicker`) werden leere/fehlende Teile automatisch
 * übersprungen statt eine Trennzeichen-Lücke zu hinterlassen (z.B. optionales `Adress2`). */
export function ZusammengesetzteQuellen({
  feld,
  formular,
  onChange,
}: {
  feld: Feld;
  formular: FormularCode;
  onChange: (feld: Feld) => void;
}) {
  const quellen = feld.quellen ?? [];
  const eintraege = katalogFelder(formular);
  const bekannterTrenner = TRENNER.some(t => t.wert === (feld.trenner ?? ' '));

  return (
    <div className="mb-1">
      {quellen.map((pfad, i) => (
        <DBStack key={i} direction="row" gap="2x-small" className="mb-1">
          <div className="flex-grow-1">
            <DatenpfadWahl
              wert={pfad}
              eintraege={eintraege}
              onChange={neu => onChange({ ...feld, quellen: quellen.map((p, j) => (j === i ? neu : p)) })}
            />
          </div>
          <DBButton
            type="button"
            className="py-0"
            variant="outlined"
            data-color="critical"
            size="small"
            onClick={() => onChange({ ...feld, quellen: quellen.filter((_, j) => j !== i) })}
            title="Teil entfernen"
          >
            ×
          </DBButton>
        </DBStack>
      ))}
      <DBStack direction="row" alignment="center" gap="2x-small">
        <DBButton
          type="button"
          variant="outlined"
          size="small"
          onClick={() => onChange({ ...feld, quellen: [...quellen, eintraege[0]?.pfad ?? ''] })}
        >
          + Teil
        </DBButton>
        <span className="small text-muted">getrennt durch</span>
        <DbAuswahl
          beschriftung="Trennzeichen"
          dicht
          className="w-auto"
          value={bekannterTrenner ? (feld.trenner ?? ' ') : '__frei'}
          onChange={e => {
            const v = e.target.value;
            onChange({ ...feld, trenner: v === '__frei' ? '' : v });
          }}
        >
          {TRENNER.map(t => (
            <option key={t.wert} value={t.wert}>
              {t.label}
            </option>
          ))}
          <option value="__frei">eigenes…</option>
        </DbAuswahl>
        {!bekannterTrenner && (
          <DbFeld
            beschriftung="Zeichen"
            dicht
            className="w-auto"
            feldKlasse="font-monospace"
            huelleStyle={{ maxWidth: '6rem' }}
            placeholder="Zeichen"
            value={feld.trenner ?? ''}
            onChange={e => onChange({ ...feld, trenner: (e.target as HTMLInputElement).value })}
          />
        )}
      </DBStack>
    </div>
  );
}

/**
 * Fügt einen Datenpfad als `{pfad}`-Platzhalter an der Cursorposition eines Textfelds ein -- per
 * Klick statt Freihand-Tippen (tippfehleranfällig, ein falscher Pfad liefert still einen leeren
 * Wert).
 */
export function PlatzhalterPicker({
  formular,
  inputRef,
  wert,
  onEinfuegen,
}: {
  formular: FormularCode;
  inputRef: { current: HTMLInputElement | null };
  wert: string;
  onEinfuegen: (neuerText: string) => void;
}) {
  function einfuegen(pfad: string) {
    if (!pfad) return;
    const einfuegung = `{${pfad}}`;
    const el = inputRef.current;
    const start = el?.selectionStart ?? wert.length;
    const end = el?.selectionEnd ?? wert.length;
    const neu = wert.slice(0, start) + einfuegung + wert.slice(end);
    onEinfuegen(neu);
    // Cursor hinter die Einfügung setzen, nach dem Re-Render mit dem neuen Wert.
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + einfuegung.length, start + einfuegung.length);
    });
  }

  return (
    <DbAuswahl
      beschriftung="Datenpfad an der Cursorposition einfügen"
      dicht
      className="mb-1"
      value=""
      title="Datenpfad an der Cursorposition einfügen"
      onChange={e => {
        einfuegen((e.target as HTMLSelectElement).value);
        (e.target as HTMLSelectElement).value = '';
      }}
    >
      <option value="">− Datenpfad einfügen −</option>
      {gruppiere(katalogFelder(formular)).map(([gruppe, felder]) => (
        <optgroup key={gruppe} label={gruppe}>
          {felder.map(f => (
            <option key={f.pfad} value={f.pfad}>
              {f.label}
            </option>
          ))}
        </optgroup>
      ))}
    </DbAuswahl>
  );
}
