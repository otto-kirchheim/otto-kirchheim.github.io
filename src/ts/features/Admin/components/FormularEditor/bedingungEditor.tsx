import type { Bedingung, Feld, FeldBedingung, Spalte, TabellenDef } from '@otto-kirchheim/nebengeld-shared';
import { AggregationEditor, Rechnung } from './aggregationUndRechnung';
import { gruppiere, istBooleanFeld, katalogFelder, werteAuswahl, type FormularCode, type KatalogEintrag } from './datenKatalog';

/** Form, die sich `Bedingung` (Zeile) und `FeldBedingung` (Dokument) exakt teilen -- nur der
 * GEPRÜFTE Wert davor unterscheidet sich, der Vergleich danach ist identisch. */
interface VergleichsTeil {
  werte?: (string | number | boolean)[];
  bereich?: { von: string | number; bis: string | number };
  dann: string;
}

/**
 * Vergleich einer Bedingung: Werte-Liste (Mitgliedschaft, mit Checkboxen bei bekannter Auswahl aus
 * `werteAuswahl()`) ODER Wertebereich (`von` einschließlich, `bis` ausschließlich — z.B. Einsatzdauer
 * ab 8:00 bis vor 14:00), plus das anzuzeigende Zeichen. Bei `istBoolean` (echtes `boolean`-Feld,
 * z.B. `Wohnung8bis14`) entfällt die Werte-Liste/Wertebereich-Wahl zugunsten einer einfachen
 * Ja/Nein-Auswahl -- vorher musste ein Boolean über `bereich: { von: 1, bis: 2 }` erzwungen werden
 * (`alsVergleichswert(true) === 1`), was unintuitiv war und in der Editor-Vorschau leicht als „geht
 * nicht" missverstanden wurde. Gemeinsam genutzt von `AnkreuzBedingung` (Spalte) und
 * `FeldAnkreuzBedingung` (Feld).
 */
function VergleichWahl({
  wenn,
  auswahl,
  istBoolean,
  onChange,
}: {
  wenn: VergleichsTeil;
  auswahl: string[];
  istBoolean?: boolean;
  onChange: (next: Partial<VergleichsTeil>) => void;
}) {
  function schalte(wert: string, an: boolean) {
    const werte = an ? [...(wenn.werte ?? []), wert] : (wenn.werte ?? []).filter(w => w !== wert);
    onChange({ werte });
  }

  if (istBoolean) {
    const aktuell = wenn.werte?.[0] !== false;
    return (
      <div class="row g-1 mb-1">
        <div class="col-8">
          <select
            class="form-select form-select-sm"
            value={String(aktuell)}
            onChange={e => onChange({ werte: [(e.target as HTMLSelectElement).value === 'true'], bereich: undefined })}
          >
            <option value="true">Ja (zutreffend)</option>
            <option value="false">Nein (nicht zutreffend)</option>
          </select>
        </div>
        <div class="col-4">
          <input
            class="form-control form-control-sm"
            placeholder="Zeichen"
            value={wenn.dann}
            onInput={e => onChange({ dann: (e.target as HTMLInputElement).value })}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div class="row g-1 mb-1">
        <div class="col-8">
          <div class="btn-group btn-group-sm w-100">
            <button
              type="button"
              class={`btn ${!wenn.bereich ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => onChange({ bereich: undefined, werte: wenn.werte ?? [] })}
            >
              Werte-Liste
            </button>
            <button
              type="button"
              class={`btn ${wenn.bereich ? 'btn-primary' : 'btn-outline-secondary'}`}
              title="Kreuz nur, wenn der Wert in diesem Bereich liegt (von einschließlich, bis ausschließlich) -- Zahl, Uhrzeit oder Datum, je nachdem was das Feld liefert"
              onClick={() => onChange({ bereich: wenn.bereich ?? { von: '', bis: '' }, werte: undefined })}
            >
              Wertebereich
            </button>
          </div>
        </div>
        <div class="col-4">
          <input
            class="form-control form-control-sm"
            placeholder="Zeichen"
            value={wenn.dann}
            onInput={e => onChange({ dann: (e.target as HTMLInputElement).value })}
          />
        </div>
      </div>

      {wenn.bereich ? (
        <div class="input-group input-group-sm">
          <span class="input-group-text px-1 small">ab</span>
          <input
            class="form-control"
            placeholder="z.B. 8:00 oder 5"
            value={wenn.bereich.von}
            onInput={e => onChange({ bereich: { ...wenn.bereich!, von: (e.target as HTMLInputElement).value } })}
          />
          <span class="input-group-text px-1 small">bis vor</span>
          <input
            class="form-control"
            placeholder="z.B. 14:00 oder 20"
            value={wenn.bereich.bis}
            onInput={e => onChange({ bereich: { ...wenn.bereich!, bis: (e.target as HTMLInputElement).value } })}
          />
        </div>
      ) : auswahl.length > 0 ? (
        <div class="d-flex flex-wrap gap-2">
          {auswahl.map(wert => (
            <div key={wert} class="form-check">
              <input
                class="form-check-input"
                type="checkbox"
                checked={(wenn.werte ?? []).includes(wert)}
                onChange={e => schalte(wert, (e.target as HTMLInputElement).checked)}
              />
              <label class="form-check-label small">{wert}</label>
            </div>
          ))}
        </div>
      ) : (
        <input
          class="form-control form-control-sm font-monospace"
          placeholder="Werte, durch Komma getrennt"
          value={(wenn.werte ?? []).join(', ')}
          onInput={e =>
            onChange({
              werte: (e.target as HTMLInputElement).value
                .split(',')
                .map(t => t.trim())
                .filter(Boolean),
            })
          }
        />
      )}
    </>
  );
}

/**
 * Ankreuz-Spalte: trägt `dann` nur ein, wenn das Feld einen der gewählten Werte hat. Bei
 * Bereitschaft je eine Spalte pro LRE-Stufe — Zeilen mit einer anderen (oder gar keiner) Stufe
 * bleiben in dieser Spalte leer.
 *
 * Geprüfter Wert kommt aus einem Feld ODER einer Rechnung (z.B. eine Dauer aus zwei Uhrzeiten
 * derselben Zeile) -- der Vergleich danach (`VergleichWahl`) ist identisch zu `FeldAnkreuzBedingung`.
 * Das Feld darf auch eine bereits in dieser Tabelle angelegte berechnete Spalte sein
 * (`andereBerechnete`) — der Renderer trägt deren Wert schon in die Zeile ein, eine zweite Rechnung
 * ist dann unnötig.
 */
export function AnkreuzBedingung({
  spalte,
  zeilenFelder,
  andereBerechnete,
  onChange,
}: {
  spalte: Spalte;
  zeilenFelder: KatalogEintrag[];
  andereBerechnete: KatalogEintrag[];
  onChange: (spalte: Spalte) => void;
}) {
  const wenn = spalte.wenn!;
  const auswahl = wenn.feld ? werteAuswahl(wenn.feld) : [];
  const istBoolean = wenn.feld !== undefined && istBooleanFeld(wenn.feld);
  const feldOptionen = [...zeilenFelder, ...andereBerechnete];

  function setzeWenn(next: Partial<Bedingung>) {
    onChange({ ...spalte, wenn: { ...wenn, ...next } });
  }

  return (
    <div class="mb-1">
      <div class="btn-group btn-group-sm w-100 mb-1">
        <button
          type="button"
          class={`btn ${!wenn.berechnet ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setzeWenn({ feld: wenn.feld ?? zeilenFelder[0]?.pfad ?? '', berechnet: undefined })}
        >
          Feld
        </button>
        <button
          type="button"
          class={`btn ${wenn.berechnet ? 'btn-primary' : 'btn-outline-secondary'}`}
          title="Prüft einen berechneten Wert dieser Zeile, z.B. eine Dauer aus Beginn/Ende"
          onClick={() =>
            setzeWenn({
              berechnet: wenn.berechnet ?? { op: 'zeitdifferenz', operanden: [] },
              feld: undefined,
              bereich: wenn.bereich ?? { von: '', bis: '' },
              werte: undefined,
            })
          }
        >
          Berechnung
        </button>
      </div>

      {wenn.berechnet ? (
        <div class="border rounded p-2 mb-1">
          <Rechnung
            wert={wenn.berechnet}
            zeilenFelder={zeilenFelder}
            onChange={berechnet => setzeWenn({ berechnet })}
          />
        </div>
      ) : (
        <select
          class="form-select form-select-sm mb-1"
          value={wenn.feld ?? ''}
          onChange={e => {
            const feld = (e.target as HTMLSelectElement).value;
            // Titel folgt dem geprüften Feld -- anders als der Format-Vorschlag (der eine bewusste
            // Wahl nie überschreibt) IST der Titel hier direkt an die Bedingung gekoppelt: wechselt
            // das geprüfte Feld, beschreibt ein stehen gelassener alter Titel die falsche Bedingung.
            // Diese Auswahl ist immer ein reiner Dropdown aus `feldOptionen`, `vorschlag` also immer
            // gesetzt. Wer einen abweichenden Titel will, tippt ihn danach im Anzeigename-Feld ein.
            const vorschlag = feldOptionen.find(o => o.pfad === feld)?.label;
            onChange({
              ...spalte,
              label: vorschlag ?? spalte.label,
              wenn: { ...wenn, feld, werte: istBooleanFeld(feld) ? [true] : [] },
            });
          }}
        >
          {gruppiere(feldOptionen).map(([gruppe, felder]) => (
            <optgroup key={gruppe} label={gruppe}>
              {felder.map(f => (
                <option key={f.pfad} value={f.pfad}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      )}

      <VergleichWahl wenn={wenn} auswahl={auswahl} istBoolean={istBoolean} onChange={setzeWenn} />
    </div>
  );
}

/**
 * Bedingter Feld-Inhalt (`FeldBedingung`): das Gegenstück zu `AnkreuzBedingung` auf Dokument- statt
 * Zeilenebene. Geprüfter Wert kommt aus einem Datenpfad (`katalogFelder`, z.B. ein Personenfeld)
 * ODER einer Aggregation über Zeilen (`AggregationEditor`, z.B. die Gesamtsumme).
 */
export function FeldAnkreuzBedingung({
  feld,
  formular,
  tabellen,
  onChange,
}: {
  feld: Feld;
  formular: FormularCode;
  tabellen: Record<string, TabellenDef>;
  onChange: (feld: Feld) => void;
}) {
  const wenn = feld.wenn!;
  const feldOptionen = katalogFelder(formular);
  const auswahl = wenn.feld ? werteAuswahl(wenn.feld) : [];
  const istBoolean = wenn.feld !== undefined && istBooleanFeld(wenn.feld);

  function setzeWenn(next: Partial<FeldBedingung>) {
    onChange({ ...feld, wenn: { ...wenn, ...next } });
  }

  return (
    <div class="mb-1">
      <div class="btn-group btn-group-sm w-100 mb-1">
        <button
          type="button"
          class={`btn ${!wenn.berechnet ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setzeWenn({ feld: wenn.feld ?? feldOptionen[0]?.pfad ?? '', berechnet: undefined })}
        >
          Feld
        </button>
        <button
          type="button"
          class={`btn ${wenn.berechnet ? 'btn-primary' : 'btn-outline-secondary'}`}
          title="Prüft eine Aggregation über Zeilen, z.B. die Gesamtsumme"
          onClick={() =>
            setzeWenn({
              berechnet: wenn.berechnet ?? { op: 'summe', ueber: '$alle' },
              feld: undefined,
              bereich: wenn.bereich ?? { von: '', bis: '' },
              werte: undefined,
            })
          }
        >
          Berechnung
        </button>
      </div>

      {wenn.berechnet ? (
        <div class="border rounded p-2 mb-1">
          <AggregationEditor
            wert={wenn.berechnet}
            formular={formular}
            tabellen={tabellen}
            onChange={berechnet => setzeWenn({ berechnet })}
          />
        </div>
      ) : (
        <select
          class="form-select form-select-sm mb-1"
          value={wenn.feld ?? ''}
          onChange={e => {
            const pfad = (e.target as HTMLSelectElement).value;
            // Gleicher Titel wie in `AnkreuzBedingung` -- folgt dem geprüften Feld statt nur einmal
            // vorbelegt zu werden, sonst beschreibt ein stehen gelassener Titel nach einem
            // Feld-Wechsel die falsche Bedingung.
            const vorschlag = feldOptionen.find(o => o.pfad === pfad)?.label;
            onChange({
              ...feld,
              label: vorschlag ?? feld.label,
              wenn: { ...wenn, feld: pfad, werte: istBooleanFeld(pfad) ? [true] : [] },
            });
          }}
        >
          {gruppiere(feldOptionen).map(([gruppe, felder]) => (
            <optgroup key={gruppe} label={gruppe}>
              {felder.map(f => (
                <option key={f.pfad} value={f.pfad}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      )}

      <VergleichWahl wenn={wenn} auswahl={auswahl} istBoolean={istBoolean} onChange={setzeWenn} />
    </div>
  );
}
