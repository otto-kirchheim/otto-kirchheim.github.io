import { pruefeFormat } from '@otto-kirchheim/nebengeld-shared';
import { DbFeld } from '@/shared/ui/form/DbFeld';
import { FORMAT_VORSCHLAEGE } from './datenKatalog';

/**
 * Format als Freitext mit Vorschlägen (Muster wie `DD.MM.YYYY`, `#.##0,00 €` oder `@liste`). Ein
 * ungültiges Format wird trotzdem übernommen, damit die Fehlerliste vor dem Speichern es kennt; die
 * Meldung steht sofort unter dem Feld.
 *
 * @param props - `wert` das Format (leer = unverändert), `onChange` mit dem neuen Format,
 *   `beschriftung` optional abweichend.
 */
export function FormatEingabe({
  wert,
  onChange,
  beschriftung = 'Format',
}: {
  wert: string | undefined;
  onChange: (format: string | undefined) => void;
  beschriftung?: string;
}) {
  const fehler = wert ? pruefeFormat(wert).fehler : undefined;
  return (
    <DbFeld
      beschriftung={beschriftung}
      dicht
      type="text"
      placeholder="unverändert"
      title="Format: Datum wie DD.MM.YYYY, Zahl wie #.##0,00 €, oder @liste / @jaNein / @oe / @grossbuchstaben"
      value={wert ?? ''}
      dataList={FORMAT_VORSCHLAEGE}
      ungueltig={fehler !== undefined}
      // Nur mit Fehler überschreiben: `undefined` ersetzte DbFelds Standardmeldung durch DBs "TODO"-Platzhalter.
      {...(fehler ? { invalidMessage: fehler } : {})}
      onChange={e => onChange(e.target.value || undefined)}
    />
  );
}
