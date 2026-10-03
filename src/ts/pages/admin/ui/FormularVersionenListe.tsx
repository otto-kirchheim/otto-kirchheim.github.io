import type { VersionUebersicht } from '../api/formularVersionenApi';
import { DBButton, DBStack } from '@db-ux/react-core-components';

type Props = {
  versionen: VersionUebersicht[];
  bearbeiteId: string | null;
  laedt: boolean;
  onBearbeiten: (version: VersionUebersicht) => void;
  onLoeschen: (version: VersionUebersicht) => void;
};

/**
 * Bestandsliste der gespeicherten Versionen eines Formulars mit Bearbeiten (lädt Konfiguration und
 * PDF zurück in den Editor) und Löschen. Nur so lässt sich eine falsch angelegte Version korrigieren
 * oder die Vorgängerversion schließen, bevor eine neue angelegt wird.
 *
 * @param props - Versionen, Id der gerade bearbeiteten Version, Ladezustand und die Handler
 *   `onBearbeiten`/`onLoeschen`.
 */
export function FormularVersionenListe({ versionen, bearbeiteId, laedt, onBearbeiten, onLoeschen }: Props) {
  if (laedt) return <p className="zelle-klein farbe-gedaempft ohne-luft-unten">Versionen werden geladen…</p>;
  if (versionen.length === 0)
    return (
      <p className="zelle-klein farbe-gedaempft ohne-luft-unten">Für dieses Formular gibt es noch keine Version.</p>
    );

  return (
    <div className="db-table" data-width="full" data-size="small" data-divider="both">
      <table className="ohne-luft-unten">
        <thead>
          <tr>
            <th scope="col">Version</th>
            <th scope="col">Gültig ab</th>
            <th scope="col">Gültig bis</th>
            <th scope="col" className="zelle-rechts">
              Aktion
            </th>
          </tr>
        </thead>
        <tbody>
          {versionen.map(v => (
            <tr key={v.id} className={v.id === bearbeiteId ? 'table-active' : undefined}>
              <td>{v.version}</td>
              <td>{v.gueltigVon}</td>
              <td>{v.gueltigBis ?? <span className="farbe-gedaempft">offen</span>}</td>
              <td className="zelle-rechts">
                <DBStack direction="row" wrap={false} gap="2x-small">
                  <DBButton type="button" variant="outlined" onClick={() => onBearbeiten(v)}>
                    Bearbeiten
                  </DBButton>
                  <DBButton type="button" variant="outlined" data-color="critical" onClick={() => onLoeschen(v)}>
                    Löschen
                  </DBButton>
                </DBStack>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
