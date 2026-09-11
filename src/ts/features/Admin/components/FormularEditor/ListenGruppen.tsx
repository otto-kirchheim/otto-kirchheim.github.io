import type { ListenGruppe, TabellenDef } from '@otto-kirchheim/nebengeld-shared';
import {
  LISTEN_VORLAGEN,
  VORLAGEN_KATEGORIE,
  katalogZeilenFelder,
  zulagenKurztexte,
  type FormularCode,
} from './datenKatalog';
import { DBButton, DBCheckbox, DBTooltip } from '@db-ux/react-core-components';
import { DbAuswahl, DbFeld } from '@/components';

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
          <div key={name} className="border p-2 mb-1 bg-body">
            <div className="d-flex align-items-center gap-1 mb-1">
              <span className="small fw-semibold flex-grow-1">
                {name} <span className="text-body-secondary">— {gruppe.auswahl?.length ?? 0} mögliche Schlüssel</span>
              </span>
              <DBButton
                type="button"
                className="py-0"
                variant="outlined"
                data-color="critical"
                size="small"
                icon="bin"
                noText
                onClick={() => setzeGruppe(name, undefined)}
              >
                <DBTooltip>Gruppe löschen</DBTooltip>
              </DBButton>
            </div>

            <div className="raster mb-1 abstand-1">
              <div className="sp-6">
                <DbAuswahl
                  beschriftung="Zeilenfeld mit der Liste"
                  dicht
                  title="Zeilenfeld mit der Liste"
                  value={gruppe.quelle}
                  onChange={e => setzeGruppe(name, { ...gruppe, quelle: (e.target as HTMLSelectElement).value })}
                >
                  {zeilenFelder.map(f => (
                    <option key={f.pfad} value={f.pfad}>
                      {f.label}
                    </option>
                  ))}
                </DbAuswahl>
              </div>
              <div className="sp-3">
                <DbFeld
                  beschriftung="Feld im Listeneintrag, das den Schlüssel trägt"
                  dicht
                  feldKlasse="font-monospace"
                  title="Feld im Listeneintrag, das den Schlüssel trägt"
                  value={gruppe.schluessel}
                  onChange={e => setzeGruppe(name, { ...gruppe, schluessel: (e.target as HTMLInputElement).value })}
                />
              </div>
              <div className="sp-3">
                <DbFeld
                  beschriftung="Feld im Listeneintrag mit dem anzuzeigenden Wert"
                  dicht
                  feldKlasse="font-monospace"
                  title="Feld im Listeneintrag mit dem anzuzeigenden Wert"
                  value={gruppe.wert}
                  onChange={e => setzeGruppe(name, { ...gruppe, wert: (e.target as HTMLInputElement).value })}
                />
              </div>
            </div>

            <DbFeld
              beschriftung="Schlüssel, durch Komma getrennt"
              dicht
              className="mb-1"
              feldKlasse="font-monospace"
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
              <div>
                <DBCheckbox
                  size="small"
                  label="Kurztext statt Code als Überschrift"
                  checked={kurztexte}
                  onChange={e =>
                    setzeGruppe(name, {
                      ...gruppe,
                      beschriftungen: (e.target as HTMLInputElement).checked ? zulagenKurztexte(kategorie) : undefined,
                    })
                  }
                />
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
