import type { ListenGruppe, TabellenDef } from '@otto-kirchheim/nebengeld-shared';
import {
  LISTEN_VORLAGEN,
  VORLAGEN_KATEGORIE,
  katalogZeilenFelder,
  zulagenKurztexte,
  type FormularCode,
} from './datenKatalog';

type Props = {
  tabelle: TabellenDef;
  formular: FormularCode;
  onChange: (tabelle: TabellenDef) => void;
  /** Legt zusätzlich die Spaltenplätze an, sobald eine Vorlage übernommen wird. */
  onVorlage: (name: string, gruppe: ListenGruppe, plaetze: number) => void;
};

/**
 * Verwaltung der dynamischen Spaltengruppen einer Tabelle. Gebraucht für EZ: eine Zeile trägt unter
 * `Zulagen` eine Liste, im Formular stehen dafür feste Spaltenplätze, und welcher Code über welcher
 * Spalte landet, ergibt sich erst aus den Daten des Monats. Statt jede Zulage einzeln zu
 * konfigurieren, legt eine Vorlage Gruppe und Spaltenplätze in einem Zug an.
 */
export function ListenGruppen({ tabelle, formular, onChange, onVorlage }: Props) {
  const gruppen = Object.entries(tabelle.listen ?? {});
  const vorlagen = LISTEN_VORLAGEN[formular].filter(v => !(v.name in (tabelle.listen ?? {})));
  const zeilenFelder = katalogZeilenFelder(formular);

  function setzeGruppe(name: string, gruppe: ListenGruppe | undefined): void {
    const rest = { ...(tabelle.listen ?? {}) };
    if (gruppe) rest[name] = gruppe;
    else delete rest[name];
    onChange({ ...tabelle, listen: Object.keys(rest).length > 0 ? rest : undefined });
  }

  if (gruppen.length === 0 && vorlagen.length === 0) return null;

  return (
    <div className="mb-2">
      <div className="small fw-semibold mb-1">Dynamische Spalten</div>

      {gruppen.map(([name, gruppe]) => {
        const kategorie = VORLAGEN_KATEGORIE[name];
        const kurztexte = Boolean(gruppe.beschriftungen);
        return (
          <div key={name} className="border rounded p-2 mb-1 bg-body">
            <div className="d-flex align-items-center gap-1 mb-1">
              <span className="small fw-semibold flex-grow-1">
                {name} <span className="text-body-secondary">— {gruppe.auswahl?.length ?? 0} mögliche Schlüssel</span>
              </span>
              <button
                type="button"
                className="db-button py-0"
                data-variant="outlined"
                data-color="critical"
                data-size="small"
                onClick={() => setzeGruppe(name, undefined)}
                title="Gruppe löschen"
              >
                <span className="db-icon db-font-size-xs" data-icon="bin" style={{ verticalAlign: 'middle' }} />
              </button>
            </div>

            <div className="raster mb-1 abstand-1">
              <div className="sp-6">
                <select
                  className="form-select form-select-sm"
                  title="Zeilenfeld mit der Liste"
                  value={gruppe.quelle}
                  onChange={e => setzeGruppe(name, { ...gruppe, quelle: (e.target as HTMLSelectElement).value })}
                >
                  {zeilenFelder.map(f => (
                    <option key={f.pfad} value={f.pfad}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sp-3">
                <input
                  className="form-control form-control-sm font-monospace"
                  title="Feld im Listeneintrag, das den Schlüssel trägt"
                  value={gruppe.schluessel}
                  onChange={e => setzeGruppe(name, { ...gruppe, schluessel: (e.target as HTMLInputElement).value })}
                />
              </div>
              <div className="sp-3">
                <input
                  className="form-control form-control-sm font-monospace"
                  title="Feld im Listeneintrag mit dem anzuzeigenden Wert"
                  value={gruppe.wert}
                  onChange={e => setzeGruppe(name, { ...gruppe, wert: (e.target as HTMLInputElement).value })}
                />
              </div>
            </div>

            <input
              className="form-control form-control-sm font-monospace mb-1"
              title="Erlaubte Schlüssel, durch Komma getrennt — diese Reihenfolge bestimmt die Platzvergabe"
              placeholder="Schlüssel, durch Komma getrennt"
              value={(gruppe.auswahl ?? []).join(', ')}
              onChange={e => {
                const auswahl = (e.target as HTMLInputElement).value
                  .split(',')
                  .map(t => t.trim())
                  .filter(Boolean);
                setzeGruppe(name, { ...gruppe, auswahl: auswahl.length > 0 ? auswahl : undefined });
              }}
            />

            {kategorie && (
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={kurztexte}
                  onChange={e =>
                    setzeGruppe(name, {
                      ...gruppe,
                      beschriftungen: (e.target as HTMLInputElement).checked ? zulagenKurztexte(kategorie) : undefined,
                    })
                  }
                />
                <label className="form-check-label small">Kurztext statt Code als Überschrift</label>
              </div>
            )}
          </div>
        );
      })}

      {vorlagen.map(v => (
        <button
          key={v.name}
          type="button"
          className="db-button me-1"
          data-variant="outlined"
          data-size="small"
          title={`Legt die Gruppe „${v.name}" plus ${v.plaetze} Spaltenplätze an`}
          onClick={() => onVorlage(v.name, v.gruppe, v.plaetze)}
        >
          + {v.label}
        </button>
      ))}
    </div>
  );
}
