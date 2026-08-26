import type {
  Berechnet,
  ListenPlatz,
  OpName,
  Spalte,
  TabellenDef,
  ZeilenBerechnet,
  ZeilenOpName,
  ZeilenOperand,
} from '@otto-kirchheim/nebengeld-shared';
import { gruppiere, katalogZeilenFelder, type FormularCode, type KatalogEintrag } from './datenKatalog';

/**
 * Berechnete/Ankreuz-Spalten als Katalogeinträge -- `mitBerechnetenSpalten()` in `shared` trägt
 * ihren Wert schon unter `key` in die Zeile ein, andere Rechnungen können sie also direkt
 * referenzieren, statt dieselbe Rechnung ein zweites Mal aufzubauen. Gemeinsam genutzt von der
 * Feldliste (alle Tabellen) und je einer einzelnen `TabellenBlock` (nur deren eigene Spalten).
 */
export function berechneteEintraege(spalten: Spalte[], gruppe: string): KatalogEintrag[] {
  return spalten
    .filter(sp => (sp.berechnet || sp.wenn) && sp.key)
    .map(sp => ({ pfad: sp.key, label: sp.label ?? sp.key, gruppe }));
}

/**
 * Alle berechneten/Ankreuz-Spalten über SÄMTLICHE Tabellen, per `pfad` dedupliziert (bei
 * Namensgleichheit gewinnt die zuletzt iterierte Tabelle, andere gehen verloren) -- nur der
 * Fallback für eine NICHT auf eine Tabelle eingegrenzte Aggregation (`Berechnet.tabelle` unset).
 * Bei Namenskollisionen zwischen Tabellen (z.B. gleicher Spalten-Key in zwei Tabellen) gezielt über
 * die Tabellenauswahl in `AggregationEditor` eingrenzen, statt sich auf diese Dedup-Reihenfolge zu
 * verlassen.
 */
export function alleBerechneteEintraege(tabellen: Record<string, TabellenDef>): KatalogEintrag[] {
  return [
    ...new Map(
      Object.values(tabellen)
        .flatMap(t => berechneteEintraege(t.spalten, 'Berechnete/Ankreuz-Spalten'))
        .map(e => [e.pfad, e]),
    ).values(),
  ];
}

const AGGREGATIONS_OPS: { wert: OpName; label: string }[] = [
  { wert: 'summe', label: 'Summe' },
  { wert: 'anzahl', label: 'Anzahl' },
  { wert: 'max', label: 'Maximum' },
  { wert: 'letztesDatum', label: 'Letztes Datum' },
];

/** Berechnete/Zeilenfelder EINER Tabelle -- Baustein für die Feld-Auswahl in `AggregationEditor`. */
function feldOptionenFuerTabelle(formular: FormularCode, tabelle: TabellenDef): KatalogEintrag[] {
  return [
    ...katalogZeilenFelder(formular, tabelle.quelle),
    ...berechneteEintraege(tabelle.spalten, 'Berechnete/Ankreuz-Spalten'),
  ];
}

type ListenOption = { key: string; label: string; liste: NonNullable<Berechnet['liste']> };

/**
 * Summenfeld-Optionen je dynamischem Spaltenplatz einer Tabelle (EZ) -- eine normale (Minuten/
 * Stück) und eine "(€)"-Variante je konfiguriertem Platz, siehe `Berechnet.liste`. Bewusst NICHT
 * je Code (aus `ListenGruppe.auswahl`): welcher Code an einem Platz landet, steht erst mit den
 * Daten des Monats fest (`schluesselAufPlatz()`) -- die Summe muss demselben Platz folgen wie die
 * Spaltenüberschrift, nicht einem beim Konfigurieren fest gewählten Code. Plätze kommen deshalb aus
 * den TATSÄCHLICH angelegten Spalten (`Spalte.listenPlatz`), nicht aus der maximal möglichen
 * Codezahl der Gruppe. Label übernimmt den Spalten-`label`, damit Summenfeld und Datenspalte im
 * Dropdown erkennbar zusammengehören.
 */
/** Suffix je `art` -- `summe` bleibt ohne Suffix (bestehender Key-Bestand bliebe sonst mehrdeutig). */
const LISTE_ART_SUFFIX: Record<NonNullable<Berechnet['liste']>['art'] & string, string> = {
  summe: '',
  bereinigt: ':bereinigt',
  summeGeld: ':geld',
};
const LISTE_ART_LABEL: Record<NonNullable<Berechnet['liste']>['art'] & string, string> = {
  summe: '',
  bereinigt: ' (bereinigt, Std.)',
  summeGeld: ' (€)',
};

function listenOptionenFuerTabelle(name: string, tabelle: TabellenDef): ListenOption[] {
  const arten = ['summe', 'bereinigt', 'summeGeld'] as const;
  const jePlatz = tabelle.spalten
    .filter((sp): sp is Spalte & { listenPlatz: ListenPlatz } => sp.listenPlatz !== undefined)
    .flatMap(sp => {
      const { gruppe, index } = sp.listenPlatz;
      const bezeichnung = sp.label ?? `${gruppe} ${index + 1}`;
      return arten.map(art => ({
        key: `liste:${name}:${gruppe}:${index}${LISTE_ART_SUFFIX[art]}`,
        label: `${bezeichnung}${LISTE_ART_LABEL[art]}`,
        liste: { tabelle: name, gruppe, index, art },
      }));
    });
  // Gesamtsumme über ALLE Einträge einer Gruppe (jeder mit seinem eigenen Code, nicht an einen
  // Platz gebunden) -- ohne `index`.
  const gesamt = Object.keys(tabelle.listen ?? {}).flatMap(gruppe =>
    arten.map(art => ({
      key: `liste:${name}:${gruppe}:gesamt${LISTE_ART_SUFFIX[art]}`,
      label: `${gruppe} — Gesamtsumme${LISTE_ART_LABEL[art] || ' (roh)'}`,
      liste: { tabelle: name, gruppe, art },
    })),
  );
  return [...jePlatz, ...gesamt];
}

/**
 * Aggregation über Zeilen (`Berechnet`): Op, Zeilenbezug (`$seite`/`$bisher`/`$laufend`/`$alle`),
 * optionale Eingrenzung auf eine oder mehrere Tabellen (`Berechnet.tabellen`) und das aggregierte
 * Zeilenfeld. Genutzt für Kopf-/Fuß-Summen UND für die "Berechnung"-Variante einer Feld-Bedingung
 * (z.B. "Gesamtsumme > 0") -- beide teilen sich dieselbe Rechnung, nur der Vergleich danach
 * unterscheidet sich.
 *
 * Ohne Tabellenauswahl ("alle Tabellen") laufen Zeilenfelder aller Quellen zusammen
 * (`katalogZeilenFelder(formular)` ohne `quelle`) und berechnete/Ankreuz-Spalten werden über
 * `alleBerechneteEintraege()` per `pfad` dedupliziert -- bei zwei Tabellen mit gleichnamiger Spalte
 * (z.B. `Dauer`) verschwindet eine davon aus der Auswahl. Mit EINER ODER MEHREREN ausgewählten
 * Tabellen kommen nur deren eigene Felder (`quelle`-gefiltert plus ihre eigenen berechneten
 * Spalten), über alle ausgewählten Tabellen vereinigt und per `pfad` dedupliziert -- löst sowohl
 * Namenskollisionen als auch "Summe über zwei von drei Teiltabellen" (z.B. LRE1/2 + LRE3, ohne die
 * BZ-Haupttabelle).
 */
export function AggregationEditor({
  wert,
  formular,
  tabellen,
  onChange,
}: {
  wert: Berechnet;
  formular: FormularCode;
  tabellen: Record<string, TabellenDef>;
  onChange: (wert: Berechnet) => void;
}) {
  const gewaehlt = wert.tabellen ?? [];
  const feldOptionen =
    gewaehlt.length > 0
      ? [
          ...new Map(
            gewaehlt
              .flatMap(name => (tabellen[name] ? feldOptionenFuerTabelle(formular, tabellen[name]) : []))
              .map(e => [e.pfad, e]),
          ).values(),
        ]
      : [...katalogZeilenFelder(formular), ...alleBerechneteEintraege(tabellen)];
  // Zulagen-Platz-Summen nur bei op "summe" -- eine Anzahl/ein Maximum "je Platz" hat hier keine
  // eindeutige Bedeutung, siehe Berechnet.liste-Kommentar.
  const relevanteTabellen: [string, TabellenDef][] =
    gewaehlt.length > 0
      ? gewaehlt.flatMap(name => (tabellen[name] ? [[name, tabellen[name]] as [string, TabellenDef]] : []))
      : Object.entries(tabellen);
  const listenOptionen =
    wert.op === 'summe' ? relevanteTabellen.flatMap(([name, t]) => listenOptionenFuerTabelle(name, t)) : [];

  function schalteTabelle(name: string) {
    const naechste = gewaehlt.includes(name) ? gewaehlt.filter(t => t !== name) : [...gewaehlt, name];
    onChange({ ...wert, tabellen: naechste.length > 0 ? naechste : undefined, feld: undefined, liste: undefined });
  }

  return (
    <div class="row g-1 mb-1">
      <div class="col-3">
        <select
          class="form-select form-select-sm"
          value={wert.op}
          onChange={e => onChange({ ...wert, op: (e.target as HTMLSelectElement).value as OpName })}
        >
          {AGGREGATIONS_OPS.map(o => (
            <option key={o.wert} value={o.wert}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div class="col-4">
        <select
          class="form-select form-select-sm"
          value={wert.ueber}
          onChange={e => onChange({ ...wert, ueber: (e.target as HTMLSelectElement).value })}
        >
          <option value="$alle">alle Zeilen (Gesamtsumme)</option>
          <option value="$seite">nur diese Seite</option>
          <option value="$bisher">alle Vorseiten (Übertrag)</option>
          <option value="$laufend">bis hierher (Übertrag + diese Seite)</option>
        </select>
      </div>
      <div class="col-5">
        <select
          class="form-select form-select-sm"
          value={
            wert.liste
              ? `liste:${wert.liste.tabelle}:${wert.liste.gruppe}:${wert.liste.index ?? 'gesamt'}${LISTE_ART_SUFFIX[wert.liste.art ?? 'summe']}`
              : (wert.feld ?? '')
          }
          onChange={e => {
            const v = (e.target as HTMLSelectElement).value;
            if (v.startsWith('liste:')) {
              const treffer = listenOptionen.find(o => o.key === v);
              onChange({ ...wert, feld: undefined, liste: treffer?.liste });
            } else {
              onChange({ ...wert, feld: v || undefined, liste: undefined });
            }
          }}
        >
          <option value="">(Feld wählen)</option>
          {gruppiere(feldOptionen).map(([gruppe, felder]) => (
            <optgroup key={gruppe} label={gruppe}>
              {felder.map(f => (
                // Key aus pfad+label statt nur pfad: ohne Tabellenauswahl mischt `feldOptionen`
                // Einträge mehrerer Zeilenquellen (z.B. "Dauer" aus Daten.BZ UND Daten.BE) --
                // gleicher Pfad, aber unterschiedliches Label, sonst React-Key-Kollision.
                <option key={`${f.pfad}|${f.label}`} value={f.pfad}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          ))}
          {listenOptionen.filter(o => o.liste.index !== undefined).length > 0 && (
            <optgroup label="Zulagen-Spaltenplätze (Summe je Platz)">
              {listenOptionen
                .filter(o => o.liste.index !== undefined)
                .map(o => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
            </optgroup>
          )}
          {listenOptionen.filter(o => o.liste.index === undefined).length > 0 && (
            <optgroup label="Zulagen-Gruppen (Gesamtsumme über alle Plätze)">
              {listenOptionen
                .filter(o => o.liste.index === undefined)
                .map(o => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
            </optgroup>
          )}
        </select>
      </div>
      <div class="col-12 d-flex flex-wrap align-items-center gap-2">
        <span
          class="small text-body-secondary"
          title="Grenzt die Aggregation auf eine oder mehrere Teiltabellen ein -- ohne Auswahl laufen alle Tabellen zusammen"
        >
          Tabellen:
        </span>
        {Object.keys(tabellen).map(name => (
          <div key={name} class="form-check form-check-inline m-0">
            <input
              class="form-check-input"
              type="checkbox"
              checked={gewaehlt.includes(name)}
              onChange={() => schalteTabelle(name)}
            />
            <label class="form-check-label small">{name}</label>
          </div>
        ))}
      </div>
      {wert.op === 'letztesDatum' && (
        <div class="col-12 d-flex align-items-center gap-2">
          <input
            type="number"
            min="0"
            class="form-control form-control-sm"
            style="max-width:6rem"
            placeholder="Tage"
            value={wert.maxTage ?? ''}
            onInput={e => {
              const roh = (e.target as HTMLInputElement).value;
              onChange({ ...wert, maxTage: roh === '' ? undefined : Number(roh) });
            }}
          />
          <span class="small text-body-secondary">
            Tage Frist — liegt der letzte Eintrag länger zurück (oder fehlt er), wird das heutige Datum gesetzt. Leer
            lassen: immer der letzte Eintrag.
          </span>
        </div>
      )}
    </div>
  );
}

const ZEILEN_OPS_AUSWAHL: { wert: ZeilenOpName; text: string }[] = [
  { wert: 'produkt', text: 'Produkt (×)' },
  { wert: 'summe', text: 'Summe (+)' },
  { wert: 'differenz', text: 'Differenz (−)' },
  { wert: 'quotient', text: 'Quotient (÷)' },
  { wert: 'zeitdifferenz', text: 'Dauer aus Uhrzeiten (ein Tag, über Mitternacht)' },
  { wert: 'zeitspanne', text: 'Zeitspanne aus Zeitstempeln (über mehrere Tage)' },
];

/**
 * Rechnung einer berechneten Spalte. Ruft sich für geklammerte Zwischenrechnungen selbst auf —
 * damit sind gemischte Rechnungen wie Ende − Beginn + Pause abbildbar, ohne eine Vorrangregel
 * einzuführen: die Klammerung steht sichtbar in der Struktur.
 */
export function Rechnung({
  wert,
  zeilenFelder,
  onChange,
  onEntfernen,
}: {
  wert: ZeilenBerechnet;
  zeilenFelder: KatalogEintrag[];
  onChange: (wert: ZeilenBerechnet) => void;
  onEntfernen?: () => void;
}) {
  function setzeOperand(index: number, operand: ZeilenOperand) {
    onChange({ ...wert, operanden: wert.operanden.map((o, j) => (j === index ? operand : o)) });
  }

  function entferneOperand(index: number) {
    onChange({ ...wert, operanden: wert.operanden.filter((_, j) => j !== index) });
  }

  return (
    <div class="mb-1">
      <div class="input-group input-group-sm mb-1">
        <select
          class="form-select"
          value={wert.op}
          onChange={e => onChange({ ...wert, op: (e.target as HTMLSelectElement).value as ZeilenOpName })}
        >
          {ZEILEN_OPS_AUSWAHL.map(o => (
            <option key={o.wert} value={o.wert}>
              {o.text}
            </option>
          ))}
        </select>
        {onEntfernen && (
          <button type="button" class="btn btn-outline-danger" title="Zwischenrechnung entfernen" onClick={onEntfernen}>
            ×
          </button>
        )}
      </div>
      <div class="small text-body-secondary mb-1">
        Operanden der Reihe nach verrechnet — für gemischte Rechnungen eine Zwischenrechnung einsetzen.
      </div>

      {wert.operanden.map((operand, i) =>
        typeof operand === 'object' ? (
          // Index als Key: Operanden haben keine eigene ID, ihre Reihenfolge ist Teil der Rechnung.
          <div key={i} class="border-start border-2 ps-2 ms-1 mb-1">
            <Rechnung
              wert={operand}
              zeilenFelder={zeilenFelder}
              onChange={b => setzeOperand(i, b)}
              onEntfernen={() => entferneOperand(i)}
            />
          </div>
        ) : (
          // Index als Key, siehe oben.
          <div key={i} class="input-group input-group-sm mb-1">
            <select
              class="form-select"
              value={typeof operand === 'number' ? '__zahl' : operand}
              onChange={e => {
                const v = (e.target as HTMLSelectElement).value;
                if (v === '__zahl') setzeOperand(i, 0);
                else if (v === '__rechnung') setzeOperand(i, { op: 'differenz', operanden: [] });
                else setzeOperand(i, v);
              }}
            >
              {zeilenFelder.map(f => (
                <option key={f.pfad} value={f.pfad}>
                  {f.label}
                </option>
              ))}
              <option value="__zahl">Fester Zahlenwert…</option>
              <option value="__rechnung">Zwischenrechnung (Klammer)…</option>
            </select>
            {typeof operand === 'number' && (
              <input
                type="number"
                step="any"
                class="form-control"
                value={operand}
                onInput={e => setzeOperand(i, Number((e.target as HTMLInputElement).value))}
              />
            )}
            <button type="button" class="btn btn-outline-danger" onClick={() => entferneOperand(i)}>
              ×
            </button>
          </div>
        ),
      )}

      <div class="d-flex gap-1">
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          onClick={() => onChange({ ...wert, operanden: [...wert.operanden, zeilenFelder[0]?.pfad ?? ''] })}
        >
          + Operand
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          title="Geklammerte Zwischenrechnung als weiteren Operanden anhängen"
          onClick={() => onChange({ ...wert, operanden: [...wert.operanden, { op: 'differenz', operanden: [] }] })}
        >
          + Zwischenrechnung
        </button>
      </div>
    </div>
  );
}
