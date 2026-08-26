import type { ListenGruppe, Spalte, Zeile } from '@otto-kirchheim/nebengeld-shared';
import { spaltenWert } from '@/infrastructure/pdf/spaltenWert';
import { Rechnung } from './aggregationUndRechnung';
import { AnkreuzBedingung } from './bedingungEditor';
import { istBooleanFeld, katalogZeilenFelder, type FormularCode, type KatalogEintrag } from './datenKatalog';
import { DatenpfadWahl } from './datenpfadUndFormeln';
import { DarstellungsFelder, ScharfButton, Zellkoordinaten, istGleich } from './feldPanelGemeinsam';
import type { Armed, Vorschau } from './feldPanelTypen';
import { WertVorschau } from './WertVorschau';

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
  return (
    <div class="border rounded p-2 mb-1">
      <div class="d-flex align-items-center flex-wrap gap-1 mb-1">
        <ScharfButton
          aktiv={istGleich(armed, { bereich: 'spalte', tabelle: tabellenName, index })}
          onClick={onArm}
          titel="Auf dem PDF die Spaltenbreite markieren — nur die x-Kanten werden übernommen"
        />
        <span class="small text-truncate flex-grow-1">{spalte.label ?? (spalte.key || '(ohne Feld)')}</span>
        <Zellkoordinaten wert={spalte} onChange={onChange} nurX />
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary py-0"
          onClick={() => onMove(-1)}
          title="Nach oben"
        >
          ↑
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary py-0"
          onClick={() => onMove(1)}
          title="Nach unten"
        >
          ↓
        </button>
        <button type="button" class="btn btn-sm btn-outline-danger py-0" onClick={onDelete} title="Spalte löschen">
          <span class="material-icons-round" style="font-size:0.85rem;vertical-align:middle">
            delete
          </span>
        </button>
      </div>

      <div class="btn-group btn-group-sm w-100 mb-1">
        <button
          type="button"
          class={`btn ${modus === 'daten' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => onChange({ ...spalte, berechnet: undefined, wenn: undefined, listenPlatz: undefined })}
        >
          Datenfeld
        </button>
        <button
          type="button"
          class={`btn ${modus === 'berechnet' ? 'btn-primary' : 'btn-outline-secondary'}`}
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
        </button>
        <button
          type="button"
          class={`btn ${modus === 'wenn' ? 'btn-primary' : 'btn-outline-secondary'}`}
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
        </button>
        {gruppen.length > 0 && (
          <button
            type="button"
            class={`btn ${modus === 'liste' ? 'btn-primary' : 'btn-outline-secondary'}`}
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
          </button>
        )}
      </div>

      {(modus === 'berechnet' || modus === 'wenn') && (
        <div class="input-group input-group-sm mb-1">
          <span
            class="input-group-text px-1 small"
            title="Schlüssel, unter dem der Wert dieser Spalte in die Zeile geschrieben wird -- darüber ist er in Ankreuz-Bedingungen und Summenfeldern anderer Spalten wiederverwendbar. Muss sich von anderen Spalten unterscheiden, sonst überschreiben sie sich gegenseitig."
          >
            Schlüssel
          </span>
          <input
            class="form-control font-monospace"
            placeholder="z.B. dauer"
            value={spalte.key}
            // Leerer Schlüssel macht die Spalte für berechneteEintraege() (Feld-Dropdown in
            // Summenfeldern) unsichtbar und wird von mitBerechnetenSpalten() in `shared` unter
            // `zeile['']` geschrieben -- niemals speichern, Eingabe bei leerem Wert verwerfen statt
            // den Schlüssel zu löschen.
            onInput={e => {
              const wert = (e.target as HTMLInputElement).value;
              if (wert !== '') onChange({ ...spalte, key: wert });
            }}
          />
        </div>
      )}

      {spalte.listenPlatz ? (
        <div class="row g-1 mb-1">
          <div class="col-8">
            <select
              class="form-select form-select-sm"
              value={spalte.listenPlatz.gruppe}
              onChange={e =>
                onChange({
                  ...spalte,
                  listenPlatz: { ...spalte.listenPlatz!, gruppe: (e.target as HTMLSelectElement).value },
                })
              }
            >
              {gruppen.map(g => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div class="col-4">
            <div class="input-group input-group-sm">
              <span class="input-group-text px-1 small">Platz</span>
              <input
                type="number"
                min={1}
                step={1}
                class="form-control"
                value={spalte.listenPlatz.index + 1}
                onInput={e =>
                  onChange({
                    ...spalte,
                    listenPlatz: {
                      ...spalte.listenPlatz!,
                      index: Math.max(0, Math.round(Number((e.target as HTMLInputElement).value)) - 1),
                    },
                  })
                }
              />
            </div>
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
        <div class="mb-1">
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

      <input
        class="form-control form-control-sm mb-1"
        placeholder="Anzeigename (nur für diese Liste)"
        value={spalte.label ?? ''}
        onInput={e => onChange({ ...spalte, label: (e.target as HTMLInputElement).value || undefined })}
      />
      <DarstellungsFelder wert={spalte} onChange={onChange} />
      <WertVorschau text={spaltenWert(spalte, beispielZeile, vorschau.kontext.listen[tabellenName])} />
    </div>
  );
}
