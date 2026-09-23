import type { ListenGruppe, Spalte, Zeile } from '@otto-kirchheim/nebengeld-shared';
import { spaltenWert } from '@/shared/lib/pdf/spaltenWert';
import { Rechnung } from './aggregationUndRechnung';
import { AnkreuzBedingung } from './bedingungEditor';
import { istBooleanFeld, katalogZeilenFelder, type FormularCode, type KatalogEintrag } from './datenKatalog';
import { DatenpfadWahl } from './datenpfadUndFormeln';
import { DarstellungsFelder, KlappZeile, ScharfButton, Zellkoordinaten } from './feldPanelGemeinsam';
import { istGleich } from './feldPanelHelfer';
import type { Armed, Vorschau } from './feldPanelTypen';
import { WertVorschau } from './WertVorschau';
import { DBButton, DBStack, DBTooltip } from '@db-ux/react-core-components';
import { DbAuswahl, DbFeld } from '@/components';

/**
 * Aufklappbare Zeile für eine Tabellenspalte: x-Kanten, Art des Inhalts (Datenfeld, Berechnet, Ankreuzen, Listen-Platz), Anzeigename, Darstellung und Beispielwert.
 *
 * @param props - Spalte mit Tabellenname und Index, Formular, Zeilenquelle, berechneten Nachbarspalten (`andereBerechnete`), Beispielzeile, Listen-Gruppen, Scharfschalt-Zustand (`armed`), Vorschau und Callbacks (Scharfschalten, Ändern, Löschen, Verschieben).
 */
export function SpalteZeile({
  spalte,
  tabellenName,
  formular,
  quelle,
  andereBerechnete,
  armed,
  index,
  onArm,
  onChange,
  onDelete,
  onMove,
  beispielZeile,
  listen,
  vorschau,
}: {
  spalte: Spalte;
  tabellenName: string;
  formular: FormularCode;
  quelle: string;
  andereBerechnete: KatalogEintrag[];
  armed: Armed | null;
  index: number;
  onArm: () => void;
  onChange: (spalte: Spalte) => void;
  onDelete: () => void;
  onMove: (richtung: -1 | 1) => void;
  beispielZeile: Zeile;
  listen: Record<string, ListenGruppe> | undefined;
  vorschau: Vorschau;
}) {
  const zeilenFelder = katalogZeilenFelder(formular, quelle);
  const gruppen = Object.keys(listen ?? {});
  const modus = spalte.listenPlatz ? 'liste' : spalte.wenn ? 'wenn' : spalte.berechnet ? 'berechnet' : 'daten';
  const aktiv = istGleich(armed, { bereich: 'spalte', tabelle: tabellenName, index });
  return (
    <KlappZeile
      offen={aktiv}
      titel={spalte.label ?? (spalte.key || '(ohne Feld)')}
      aktionen={
        <>
          <ScharfButton
            aktiv={aktiv}
            onClick={onArm}
            titel="Auf dem PDF die Spaltenbreite markieren — nur die x-Kanten werden übernommen"
          />
          <DBButton
            type="button"
            className="py-0"
            variant="outlined"
            size="small"
            icon="arrow_up"
            noText
            onClick={() => onMove(-1)}
          >
            <DBTooltip>Nach oben</DBTooltip>
          </DBButton>
          <DBButton
            type="button"
            className="py-0"
            variant="outlined"
            size="small"
            icon="arrow_down"
            noText
            onClick={() => onMove(1)}
          >
            <DBTooltip>Nach unten</DBTooltip>
          </DBButton>
          <DBButton
            type="button"
            className="py-0"
            variant="outlined"
            data-color="critical"
            size="small"
            icon="bin"
            noText
            onClick={onDelete}
          >
            <DBTooltip>Spalte löschen</DBTooltip>
          </DBButton>
        </>
      }
    >
      <div className="mb-1">
        <Zellkoordinaten wert={spalte} onChange={onChange} nurX />
      </div>

      <DBStack direction="row" wrap gap="2x-small" className="w-100 mb-1">
        <DBButton
          type="button"
          variant={modus === 'daten' ? 'brand' : 'outlined'}
          onClick={() => onChange({ ...spalte, berechnet: undefined, wenn: undefined, listenPlatz: undefined })}
        >
          Datenfeld
        </DBButton>
        <DBButton
          type="button"
          variant={modus === 'berechnet' ? 'brand' : 'outlined'}
          onClick={() =>
            onChange({
              ...spalte,
              wenn: undefined,
              listenPlatz: undefined,
              berechnet: spalte.berechnet ?? { op: 'produkt', operanden: [] },
            })
          }
        >
          Berechnet
        </DBButton>
        <DBButton
          type="button"
          variant={modus === 'wenn' ? 'brand' : 'outlined'}
          onClick={() => {
            const startPfad = zeilenFelder[0]?.pfad ?? '';
            onChange({
              ...spalte,
              berechnet: undefined,
              listenPlatz: undefined,
              wenn: spalte.wenn ?? { feld: startPfad, werte: istBooleanFeld(startPfad) ? [true] : [], dann: 'X' },
            });
          }}
          title="Nur ein Kreuz setzen, wenn ein Feld einen bestimmten Wert hat"
        >
          Ankreuzen
        </DBButton>
        {gruppen.length > 0 && (
          <DBButton
            type="button"
            variant={modus === 'liste' ? 'brand' : 'outlined'}
            onClick={() =>
              onChange({
                ...spalte,
                berechnet: undefined,
                wenn: undefined,
                listenPlatz: spalte.listenPlatz ?? { gruppe: gruppen[0]!, index: 0 },
              })
            }
            title="Ein Platz einer dynamischen Spaltengruppe — welcher Schlüssel dort steht, entscheiden die Daten"
          >
            Listen-Platz
          </DBButton>
        )}
      </DBStack>

      {(modus === 'berechnet' || modus === 'wenn') && (
        <DbFeld
          beschriftung="Schlüssel"
          beschriftungZeigen
          dicht
          className="mb-1"
          feldKlasse="font-monospace"
          title="Schlüssel, unter dem der Wert dieser Spalte in die Zeile geschrieben wird -- darüber ist er in Ankreuz-Bedingungen und Summenfeldern anderer Spalten wiederverwendbar. Muss sich von anderen Spalten unterscheiden, sonst überschreiben sie sich gegenseitig."
          placeholder="z.B. dauer"
          value={spalte.key}
          // Ein leerer Schlüssel macht die Spalte für `berechneteEintraege()` (Feld-Dropdown in Summenfeldern)
          // unsichtbar, und `mitBerechnetenSpalten()` (`shared/lib/pdf/tabellenZeilen.ts`) würde ihren Wert
          // unter `zeile['']` ablegen -- deshalb nie speichern: leere Eingaben verwerfen, den Schlüssel nicht löschen.
          onChange={e => {
            const wert = e.target.value;
            if (wert !== '') onChange({ ...spalte, key: wert });
          }}
        />
      )}

      {spalte.listenPlatz ? (
        <div className="raster mb-1 abstand-1">
          <div className="sp-8">
            <DbAuswahl
              beschriftung="Listen-Gruppe"
              dicht
              value={spalte.listenPlatz.gruppe}
              onChange={e =>
                onChange({
                  ...spalte,
                  listenPlatz: { ...spalte.listenPlatz!, gruppe: e.target.value },
                })
              }
            >
              {gruppen.map(g => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </DbAuswahl>
          </div>
          <div className="sp-4">
            <DbFeld
              beschriftung="Platz"
              beschriftungZeigen
              dicht
              type="number"
              min={1}
              step={1}
              value={spalte.listenPlatz.index + 1}
              onChange={e =>
                onChange({
                  ...spalte,
                  listenPlatz: {
                    ...spalte.listenPlatz!,
                    index: Math.max(0, Math.round(Number(e.target.value)) - 1),
                  },
                })
              }
            />
          </div>
        </div>
      ) : spalte.wenn ? (
        <AnkreuzBedingung
          spalte={spalte}
          zeilenFelder={zeilenFelder}
          andereBerechnete={andereBerechnete}
          onChange={onChange}
        />
      ) : spalte.berechnet ? (
        <Rechnung
          wert={spalte.berechnet}
          zeilenFelder={zeilenFelder}
          onChange={berechnet => onChange({ ...spalte, berechnet })}
        />
      ) : (
        <div className="mb-1">
          <DatenpfadWahl
            wert={spalte.key}
            eintraege={zeilenFelder}
            onChange={key => {
              // Gleicher Format-Vorschlag wie bei Feldern (`umbenennen()` in `FeldListe`) -- nur
              // übernehmen, wenn die Spalte noch kein eigenes Format hat.
              const vorschlag = zeilenFelder.find(e => e.pfad === key)?.format;
              onChange({ ...spalte, key, format: spalte.format ?? vorschlag });
            }}
          />
        </div>
      )}

      <DbFeld
        beschriftung="Anzeigename (nur für diese Liste)"
        dicht
        className="mb-1"
        placeholder="Anzeigename (nur für diese Liste)"
        value={spalte.label ?? ''}
        onChange={e => onChange({ ...spalte, label: (e.target as HTMLInputElement).value || undefined })}
      />
      <DarstellungsFelder wert={spalte} onChange={onChange} />
      <WertVorschau text={spaltenWert(spalte, beispielZeile, vorschau.kontext.listen[tabellenName])} />
    </KlappZeile>
  );
}
