import type { ListenGruppe, TabellenDef } from '@otto-kirchheim/nebengeld-shared';
import { Gruppe } from '@/shared/ui/gruppe/Gruppe';
import {
  listenVorlagen,
  vorlagenKategorie,
  katalogZeilenFelder,
  zulagenKurztexte,
  type FormularCode,
} from './datenKatalog';
import { DBButton, DBCheckbox, DBTooltip, DBStack } from '@db-ux/react-core-components';
import { DbAuswahl, DbFeld } from '@/shared/ui/form/DbFeld';

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
 *
 * @param props - Tabelle, Formular, `onChange` für die geänderte Tabelle und `onVorlage` für das Anlegen einer Vorlage samt Spaltenplätzen.
 */
export function ListenGruppen({ tabelle, formular, onChange, onVorlage }: Props) {
  const gruppen = Object.entries(tabelle.listen ?? {});
  const vorlagen = listenVorlagen(formular).filter(v => !(v.name in (tabelle.listen ?? {})));
  const zeilenFelder = katalogZeilenFelder(formular);

  /**
   * Setzt oder löscht eine Listen-Gruppe der Tabelle; ohne verbleibende Gruppen wird `listen` entfernt.
   *
   * @param name - Name der Gruppe.
   * @param gruppe - Neue Gruppe; `undefined` löscht sie.
   */
  function setzeGruppe(name: string, gruppe: ListenGruppe | undefined): void {
    const rest = { ...(tabelle.listen ?? {}) };
    if (gruppe) rest[name] = gruppe;
    else delete rest[name];
    onChange({ ...tabelle, listen: Object.keys(rest).length > 0 ? rest : undefined });
  }

  if (gruppen.length === 0 && vorlagen.length === 0) return null;

  return (
    <div className="luft-unten-xs">
      <div className="zelle-klein fett luft-unten-2xs">Dynamische Spalten</div>

      {gruppen.map(([name, gruppe]) => {
        const kategorie = vorlagenKategorie(name);
        const kurztexte = Boolean(gruppe.beschriftungen);
        return (
          <Gruppe key={name} className="hinterlegt-1 luft-unten-2xs">
            <DBStack direction="row" gap="2x-small" alignment="center" className="luft-unten-2xs">
              <span className="zelle-klein fett waechst">
                {name} <span className="farbe-gedaempft">— {gruppe.auswahl?.length ?? 0} mögliche Schlüssel</span>
              </span>
              <DBButton
                type="button"

                variant="outlined"
                data-color="critical"
                size="small"
                icon="bin"
                noText
                onClick={() => setzeGruppe(name, undefined)}
              >
                <DBTooltip>Gruppe löschen</DBTooltip>
              </DBButton>
            </DBStack>

            <div className="raster luft-unten-2xs abstand-1">
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
                  feldKlasse="schrift-mono"
                  title="Feld im Listeneintrag, das den Schlüssel trägt"
                  value={gruppe.schluessel}
                  onChange={e => setzeGruppe(name, { ...gruppe, schluessel: (e.target as HTMLInputElement).value })}
                />
              </div>
              <div className="sp-3">
                <DbFeld
                  beschriftung="Feld im Listeneintrag mit dem anzuzeigenden Wert"
                  dicht
                  feldKlasse="schrift-mono"
                  title="Feld im Listeneintrag mit dem anzuzeigenden Wert"
                  value={gruppe.wert}
                  onChange={e => setzeGruppe(name, { ...gruppe, wert: (e.target as HTMLInputElement).value })}
                />
              </div>
            </div>

            <DbFeld
              beschriftung="Schlüssel, durch Komma getrennt"
              dicht
              className="luft-unten-2xs"
              feldKlasse="schrift-mono"
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
          </Gruppe>
        );
      })}

      {vorlagen.map(v => (
        <DBButton
          key={v.name}
          type="button"
          className="luft-rechts-2xs"
          variant="outlined"
          size="small"
          title={`Legt die Gruppe „${v.name}" plus ${v.plaetze} Spaltenplätze an`}
          onClick={() => onVorlage(v.name, v.gruppe, v.plaetze)}
        >
          + {v.label}
        </DBButton>
      ))}
    </div>
  );
}
