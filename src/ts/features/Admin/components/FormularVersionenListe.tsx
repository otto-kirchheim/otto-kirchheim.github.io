import type { VersionUebersicht } from './formularVersionenApi';

type Props = {
  versionen: VersionUebersicht[];
  bearbeiteId: string | null;
  laedt: boolean;
  onBearbeiten: (version: VersionUebersicht) => void;
  onLoeschen: (version: VersionUebersicht) => void;
};

/**
 * Bestandsliste der gespeicherten Versionen eines Formulars mit den beiden Reparaturwegen:
 * Bearbeiten lädt Konfiguration und PDF zurück in den Editor, Löschen entfernt die Version samt
 * ihrer PDF-Vorlage. Ohne die Liste wäre eine einmal falsch angelegte Version nicht mehr
 * korrigierbar — und eine zweite Version gar nicht anlegbar, da dafür erst die Vorgängerin
 * geschlossen (also bearbeitet) werden muss.
 */
export function FormularVersionenListe({ versionen, bearbeiteId, laedt, onBearbeiten, onLoeschen }: Props) {
  if (laedt) return <p class="small text-body-secondary mb-0">Versionen werden geladen…</p>;
  if (versionen.length === 0)
    return <p class="small text-body-secondary mb-0">Für dieses Formular gibt es noch keine Version.</p>;

  return (
    <div class="table-responsive">
      <table class="table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th scope="col">Version</th>
            <th scope="col">Gültig ab</th>
            <th scope="col">Gültig bis</th>
            <th scope="col" class="text-end">
              Aktion
            </th>
          </tr>
        </thead>
        <tbody>
          {versionen.map(v => (
            <tr key={v.id} class={v.id === bearbeiteId ? 'table-active' : undefined}>
              <td>{v.version}</td>
              <td>{v.gueltigVon}</td>
              <td>{v.gueltigBis ?? <span class="text-body-secondary">offen</span>}</td>
              <td class="text-end">
                <div class="btn-group btn-group-sm">
                  <button type="button" class="btn btn-outline-secondary" onClick={() => onBearbeiten(v)}>
                    Bearbeiten
                  </button>
                  <button type="button" class="btn btn-outline-danger" onClick={() => onLoeschen(v)}>
                    Löschen
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
