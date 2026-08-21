import Modal from 'bootstrap/js/dist/modal';
import { render } from 'preact';
import { useRef, useState } from 'preact/hooks';
import type { Ausrichtung, Bedingung, Berechnet, Daten, Drehung, Feld, FeldBedingung, FormatName, ListenGruppe, OpName, SeitenDef, Spalte, TabellenBereich, TabellenDef, Zeile, ZeilenBerechnet, ZeilenOperand, ZeilenOpName } from '@otto-kirchheim/nebengeld-shared';
import { wert, type Kontext } from '@/infrastructure/pdf/wert';
import { spaltenWert } from '@/infrastructure/pdf/spaltenWert';
import { istBooleanFeld, ZEILEN_QUELLEN, gruppiere, katalogFelder, katalogZeilenFelder, werteAuswahl, type FormularCode, type KatalogEintrag } from './datenKatalog';
import { ListenGruppen } from './ListenGruppen';

export type Armed =
  | { bereich: 'feld'; key: string }
  | { bereich: 'spalte'; tabelle: string; index: number }
  | { bereich: 'tabelle'; tabelle: string }
  | { bereich: 'letzteZeile'; tabelle: string }
  | { bereich: 'signaturBild' };

type Props = {
  formular: FormularCode;
  seite: SeitenDef;
  onSeiteChange: (seite: SeitenDef) => void;
  tabellen: Record<string, TabellenDef>;
  onTabellenChange: (tabellen: Record<string, TabellenDef>) => void;
  armed: Armed | null;
  onArm: (armed: Armed | null) => void;
  vorschau: Vorschau;
};

/**
 * Beispieldaten samt Renderer-Kontext. Damit zeigt die Feldliste denselben Wert, den das erzeugte
 * PDF zeigen wuerde -- Summen und Uebertrag eingeschlossen, die sonst nur ueber die PDF-Vorschau
 * pruefbar waeren.
 */
export interface Vorschau {
  daten: Daten;
  kontext: Kontext;
}

/** Gerenderter Beispielwert unter einem Eintrag; leere Werte werden als solche kenntlich gemacht. */
function WertVorschau({ text }: { text: string }) {
  return (
    <div class="form-text small mb-0">
      Vorschau: {text === '' ? <em class="text-body-secondary">(leer)</em> : <span class="font-monospace">{text}</span>}
    </div>
  );
}

const FORMATE: { wert: FormatName | ''; label: string }[] = [
  { wert: '', label: 'unverändert' },
  { wert: 'waehrung', label: 'Währung (1.234,50)' },
  { wert: 'zahl', label: 'Zahl (1.234,57)' },
  { wert: 'ganzzahl', label: 'Ganzzahl (1.235)' },
  { wert: 'datum', label: 'Datum (15.03.2026)' },
  { wert: 'datumKurz', label: 'Datum kurz (15.03.)' },
  { wert: 'tag', label: 'Tag (15)' },
  { wert: 'tagZweistellig', label: 'Tag zweistellig (05)' },
  { wert: 'wochentag', label: 'Wochentag (So)' },
  { wert: 'monatJahr', label: 'Monat/Jahr (03/2026)' },
  { wert: 'monatName', label: 'Monatsname (März)' },
  { wert: 'monatNameKurz', label: 'Monatsname kurz (Mär)' },
  { wert: 'uhrzeit', label: 'Uhrzeit (07:05)' },
  { wert: 'stunden', label: 'Zeitspanne (2:30)' },
  { wert: 'liste', label: 'Liste zusammenfügen (I / IW)' },
  { wert: 'grossbuchstaben', label: 'GROSSBUCHSTABEN' },
  { wert: 'jaNein', label: 'Ja/Nein' },
  { wert: 'oe', label: 'Organisationseinheit (V.IW-MI-N-KSL-IL 03)' },
];

const DREHUNGEN: { wert: Drehung; label: string }[] = [
  { wert: 0, label: 'waagerecht' },
  { wert: 90, label: '90° (von unten nach oben)' },
  { wert: 270, label: '270° (von oben nach unten)' },
  { wert: 180, label: '180° (auf dem Kopf)' },
];

/** Schriftgröße, Auto-Verkleinerung, Umbruch, Ausrichtung, Format und Drehung -- Felder wie Spalten. */
function DarstellungsFelder<
  T extends { size: number; autoGroesse?: boolean; umbruch?: boolean; align?: Ausrichtung; format?: FormatName; drehung?: Drehung },
>({
  wert,
  onChange,
}: {
  wert: T;
  onChange: (next: T) => void;
}) {
  return (
    <>
      <div class="row g-1">
        <div class="col-3">
          <input
            type="number"
            class="form-control form-control-sm"
            title={wert.autoGroesse ? 'Maximale Schriftgröße' : 'Schriftgröße'}
            value={wert.size}
            onInput={e => onChange({ ...wert, size: Number((e.target as HTMLInputElement).value) })}
          />
        </div>
        <div class="col-4">
          <select class="form-select form-select-sm" value={wert.align ?? 'links'} onChange={e => onChange({ ...wert, align: (e.target as HTMLSelectElement).value as Ausrichtung })}>
            <option value="links">links</option>
            <option value="zentriert">zentriert</option>
            <option value="rechts">rechts</option>
          </select>
        </div>
        <div class="col-5">
          <select class="form-select form-select-sm" value={wert.format ?? ''} onChange={e => onChange({ ...wert, format: ((e.target as HTMLSelectElement).value || undefined) as FormatName | undefined })}>
            {FORMATE.map(f => (
              <option key={f.wert} value={f.wert}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div class="row g-1 mt-0">
        <div class="col-12">
          <select
            class="form-select form-select-sm"
            title="Textrichtung in der Zelle — 90° für schmale, hochkant beschriftete Felder"
            value={String(wert.drehung ?? 0)}
            onChange={e => {
              const grad = Number((e.target as HTMLSelectElement).value) as Drehung;
              onChange({ ...wert, drehung: grad === 0 ? undefined : grad });
            }}
          >
            {DREHUNGEN.map(d => (
              <option key={d.wert} value={String(d.wert)}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div class="d-flex gap-3 mt-1">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" checked={Boolean(wert.autoGroesse)} onChange={e => onChange({ ...wert, autoGroesse: (e.target as HTMLInputElement).checked || undefined })} />
          <label class="form-check-label small">Schrift automatisch verkleinern</label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" checked={Boolean(wert.umbruch)} onChange={e => onChange({ ...wert, umbruch: (e.target as HTMLInputElement).checked || undefined })} />
          <label class="form-check-label small">Zeilenumbruch</label>
        </div>
      </div>
    </>
  );
}

function istGleich(a: Armed | null, b: Armed): boolean {
  if (!a || a.bereich !== b.bereich) return false;
  if (a.bereich === 'feld') return a.key === (b as { key: string }).key;
  if (a.bereich === 'spalte') return a.tabelle === (b as { tabelle: string }).tabelle && a.index === (b as { index: number }).index;
  if (a.bereich === 'tabelle' || a.bereich === 'letzteZeile') return a.tabelle === (b as { tabelle: string }).tabelle;
  return true;
}

function ScharfButton({ aktiv, onClick, titel }: { aktiv: boolean; onClick: () => void; titel?: string }) {
  return (
    <button
      type="button"
      class={`btn btn-sm py-0 ${aktiv ? 'btn-danger' : 'btn-outline-primary'}`}
      onClick={onClick}
      title={titel ?? 'Rechteck auf dem PDF aufziehen, um Position und Zellbreite zu setzen'}
    >
      <span class="material-icons-round" style="font-size:0.85rem;vertical-align:middle">
        {aktiv ? 'highlight_alt' : 'crop_free'}
      </span>
    </button>
  );
}

function DatenpfadWahl({ wert, eintraege, onChange }: { wert: string; eintraege: KatalogEintrag[]; onChange: (pfad: string) => void }) {
  const bekannt = eintraege.some(e => e.pfad === wert);
  return (
    <div class="input-group input-group-sm">
      <select class="form-select" value={bekannt ? wert : '__frei'} onChange={e => onChange((e.target as HTMLSelectElement).value)}>
        {gruppiere(eintraege).map(([gruppe, felder]) => (
          <optgroup key={gruppe} label={gruppe}>
            {felder.map(f => (
              <option key={f.pfad} value={f.pfad}>
                {f.label}
              </option>
            ))}
          </optgroup>
        ))}
        <option value="__frei">Freier Datenpfad…</option>
      </select>
      {!bekannt && (
        <input
          class="form-control font-monospace"
          placeholder="Datenpfad"
          value={wert === '__frei' ? '' : wert}
          onInput={e => onChange((e.target as HTMLInputElement).value)}
        />
      )}
    </div>
  );
}

const TRENNER: { wert: string; label: string }[] = [
  { wert: ' ', label: 'Leerzeichen' },
  { wert: ', ', label: 'Komma  ( , )' },
  { wert: ' / ', label: 'Schrägstrich  ( / )' },
  { wert: '; ', label: 'Semikolon  ( ; )' },
  { wert: ' - ', label: 'Bindestrich  ( - )' },
  { wert: ' | ', label: 'Senkrechter Strich  ( | )' },
  { wert: '\n', label: 'Neue Zeile (braucht Zeilenumbruch)' },
];

/** Mehrere Datenpfade in eine Zelle, verbunden mit einem frei wählbaren Trennzeichen -- im
 * Unterschied zu Text+Platzhaltern (`PlatzhalterPicker`) werden leere/fehlende Teile automatisch
 * übersprungen statt eine Trennzeichen-Lücke zu hinterlassen (z.B. optionales `Adress2`). */
function ZusammengesetzteQuellen({ feld, formular, onChange }: { feld: Feld; formular: FormularCode; onChange: (feld: Feld) => void }) {
  const quellen = feld.quellen ?? [];
  const eintraege = katalogFelder(formular);
  const bekannterTrenner = TRENNER.some(t => t.wert === (feld.trenner ?? ' '));

  return (
    <div class="mb-1">
      {quellen.map((pfad, i) => (
        <div key={i} class="d-flex gap-1 mb-1">
          <div class="flex-grow-1">
            <DatenpfadWahl wert={pfad} eintraege={eintraege} onChange={neu => onChange({ ...feld, quellen: quellen.map((p, j) => (j === i ? neu : p)) })} />
          </div>
          <button type="button" class="btn btn-sm btn-outline-danger py-0" onClick={() => onChange({ ...feld, quellen: quellen.filter((_, j) => j !== i) })} title="Teil entfernen">
            ×
          </button>
        </div>
      ))}
      <div class="d-flex gap-1 align-items-center">
        <button type="button" class="btn btn-sm btn-outline-secondary" onClick={() => onChange({ ...feld, quellen: [...quellen, eintraege[0]?.pfad ?? ''] })}>
          + Teil
        </button>
        <span class="small text-muted">getrennt durch</span>
        <select
          class="form-select form-select-sm w-auto"
          value={bekannterTrenner ? (feld.trenner ?? ' ') : '__frei'}
          onChange={e => {
            const v = (e.target as HTMLSelectElement).value;
            onChange({ ...feld, trenner: v === '__frei' ? '' : v });
          }}
        >
          {TRENNER.map(t => (
            <option key={t.wert} value={t.wert}>
              {t.label}
            </option>
          ))}
          <option value="__frei">eigenes…</option>
        </select>
        {!bekannterTrenner && (
          <input
            class="form-control form-control-sm font-monospace w-auto"
            style="max-width:6rem"
            placeholder="Zeichen"
            value={feld.trenner ?? ''}
            onInput={e => onChange({ ...feld, trenner: (e.target as HTMLInputElement).value })}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Fügt einen Datenpfad als `{pfad}`-Platzhalter an der Cursorposition eines Textfelds ein -- per
 * Klick statt Freihand-Tippen (tippfehleranfällig, ein falscher Pfad liefert still einen leeren
 * Wert).
 */
function PlatzhalterPicker({
  formular,
  inputRef,
  wert,
  onEinfuegen,
}: {
  formular: FormularCode;
  inputRef: { current: HTMLInputElement | null };
  wert: string;
  onEinfuegen: (neuerText: string) => void;
}) {
  function einfuegen(pfad: string) {
    if (!pfad) return;
    const einfuegung = `{${pfad}}`;
    const el = inputRef.current;
    const start = el?.selectionStart ?? wert.length;
    const end = el?.selectionEnd ?? wert.length;
    const neu = wert.slice(0, start) + einfuegung + wert.slice(end);
    onEinfuegen(neu);
    // Cursor hinter die Einfügung setzen, nach dem Re-Render mit dem neuen Wert.
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + einfuegung.length, start + einfuegung.length);
    });
  }

  return (
    <select class="form-select form-select-sm mb-1" value="" title="Datenpfad an der Cursorposition einfügen" onChange={e => { einfuegen((e.target as HTMLSelectElement).value); (e.target as HTMLSelectElement).value = ''; }}>
      <option value="">− Datenpfad einfügen −</option>
      {gruppiere(katalogFelder(formular)).map(([gruppe, felder]) => (
        <optgroup key={gruppe} label={gruppe}>
          {felder.map(f => (
            <option key={f.pfad} value={f.pfad}>
              {f.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

const PLATZHALTER_BEISPIELE: { platzhalter: string; beschreibung: string }[] = [
  { platzhalter: '{Datenpfad}', beschreibung: 'Beliebiger Datenpfad, z.B. {Nachname} -- ohne Format greift der Standard-Fallback (Text/Zahl unverändert, Array als Liste ` / `, Boolean als Ja/Nein). Für VorgabenU.Pers.OE reicht das NICHT -- dafür immer explizit :oe angeben (siehe unten).' },
  { platzhalter: '{Datenpfad:Format}', beschreibung: 'Erzwingt eines der Formate unten, z.B. {VorgabenU.Pers.OE:oe} oder {Betrag:waehrung}. Unbekannter Formatname wird ignoriert, der Pfad bleibt über den Standard-Fallback nutzbar.' },
  { platzhalter: '{seite} / {seiten}', beschreibung: 'Aktuelle Seitenzahl / Gesamtseitenzahl dieses Dokuments.' },
  { platzhalter: '{seite-1} / {seite+1}', beschreibung: 'Seitenzahl mit ganzzahligem Versatz, z.B. "Übertrag von Seite {seite-1}". Gilt genauso für {seiten-1} etc.' },
  { platzhalter: '{heute}', beschreibung: 'Erzeugungsdatum des PDFs, Format datum (15.03.2026).' },
  { platzhalter: '{heute:Format}', beschreibung: 'Erzeugungsdatum mit anderem Format, z.B. {heute:datumKurz} (15.03.).' },
  { platzhalter: '{A}, {B}', beschreibung: 'Mehrere Platzhalter gemischt im selben Text, z.B. {Nachname}, {Vorname}.' },
];

function PlatzhalterHilfeInhalt() {
  return (
    <>
      <table class="table table-sm mb-3">
        <thead>
          <tr>
            <th>Platzhalter</th>
            <th>Bedeutung</th>
          </tr>
        </thead>
        <tbody>
          {PLATZHALTER_BEISPIELE.map(b => (
            <tr key={b.platzhalter}>
              <td class="font-monospace text-nowrap">{b.platzhalter}</td>
              <td>{b.beschreibung}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div class="small fw-semibold mb-1">Verfügbare Formate (für das Feld-Format und {'{Pfad:Format}'})</div>
      <table class="table table-sm mb-0">
        <tbody>
          {FORMATE.filter(f => f.wert !== '').map(f => (
            <tr key={f.wert}>
              <td class="font-monospace text-nowrap">{f.wert}</td>
              <td>{f.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/**
 * Eigenständiges, dynamisch erzeugtes Modal statt des geteilten `#modal`-Elements (siehe
 * `openHelpModal.tsx`) -- der FormularEditor läuft selbst schon in einem Admin-Tab, ein zweites
 * Modal darf ein eventuell gerade offenes nicht verdrängen.
 */
function openPlatzhalterHilfe(): void {
  const container = document.createElement('div');
  container.className = 'modal fade';
  container.setAttribute('tabindex', '-1');
  document.body.appendChild(container);

  render(
    <div class="modal-dialog modal-dialog-scrollable modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Platzhalter &amp; Formate</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" />
        </div>
        <div class="modal-body">
          <PlatzhalterHilfeInhalt />
        </div>
      </div>
    </div>,
    container,
  );

  const bsModal = new Modal(container);
  container.addEventListener(
    'hidden.bs.modal',
    () => {
      render(null, container);
      bsModal.dispose();
      container.remove();
    },
    { once: true },
  );
  bsModal.show();
}

/**
 * Zahleneingabe. `step="any"` ist Absicht: Koordinaten entstehen beim Ziehen als Kommazahlen, und
 * ein festes Raster (früher `0.5`) ließ das Formular beim Absenden alles dazwischen als ungültig
 * abweisen. Zählwerte wie „Zeilen" setzen dagegen `ganzzahl`, damit dort keine halbe oder negative
 * Angabe entsteht -- die wäre als Kapazität sinnlos und der Server lehnt sie ab.
 */
function ZahlFeld({
  label,
  wert,
  onChange,
  ganzzahl,
  min,
}: {
  label: string;
  wert: number | undefined;
  onChange: (v: number | undefined) => void;
  ganzzahl?: boolean;
  min?: number;
}) {
  const begrenzt = (v: number): number => {
    const gerundet = ganzzahl ? Math.round(v) : v;
    return min === undefined ? gerundet : Math.max(gerundet, min);
  };

  return (
    <div class="col">
      <div class="input-group input-group-sm">
        <span class="input-group-text px-1 small">{label}</span>
        <input
          type="number"
          step={ganzzahl ? 1 : 'any'}
          min={min}
          class="form-control px-1"
          value={wert === undefined ? '' : Number(wert.toFixed(2))}
          onInput={e => {
            const v = (e.target as HTMLInputElement).value;
            onChange(v === '' ? undefined : begrenzt(Number(v)));
          }}
        />
      </div>
    </div>
  );
}

/**
 * Nachjustieren der gezogenen Zelle -- freihändig gezogene Rechtecke treffen selten exakt dieselbe
 * Höhe wie das Feld daneben, deshalb sind alle vier Kanten auch direkt eingebbar.
 */
function Zellkoordinaten<T extends { x: number; y?: number; x2?: number; y2?: number }>({
  wert,
  onChange,
  nurX,
}: {
  wert: T;
  onChange: (next: T) => void;
  /** Spalten haben keine eigene y-Lage -- die kommt aus dem Zeilenraster. */
  nurX?: boolean;
}) {
  const [offen, setOffen] = useState(false);
  const breite = wert.x2 === undefined ? null : Math.abs(wert.x2 - wert.x);
  const hoehe = wert.y === undefined || wert.y2 === undefined ? null : Math.abs(wert.y2 - wert.y);

  return (
    <>
      <button type="button" class="btn btn-sm btn-link p-0 small text-muted text-nowrap text-decoration-none" onClick={() => setOffen(o => !o)} title="Koordinaten bearbeiten">
        x={wert.x.toFixed(0)}
        {wert.y !== undefined && `, y=${wert.y.toFixed(0)}`}
        {breite !== null && `, ${breite.toFixed(0)}${hoehe === null ? ' br.' : `×${hoehe.toFixed(0)}`}`}
        <span class="material-icons-round" style="font-size:0.8rem;vertical-align:middle">
          {offen ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {offen && (
        <div class="row g-1 w-100 mt-1">
          <ZahlFeld label="x" wert={wert.x} onChange={v => onChange({ ...wert, x: v ?? 0 })} />
          <ZahlFeld label="x2" wert={wert.x2} onChange={v => onChange({ ...wert, x2: v })} />
          {!nurX && (
            <>
              <ZahlFeld label="y" wert={wert.y} onChange={v => onChange({ ...wert, y: v ?? 0 })} />
              <ZahlFeld label="y2" wert={wert.y2} onChange={v => onChange({ ...wert, y2: v })} />
            </>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Berechnete/Ankreuz-Spalten als Katalogeinträge -- `mitBerechnetenSpalten()` in `shared` trägt
 * ihren Wert schon unter `key` in die Zeile ein, andere Rechnungen können sie also direkt
 * referenzieren, statt dieselbe Rechnung ein zweites Mal aufzubauen. Gemeinsam genutzt von der
 * Feldliste (alle Tabellen) und je einer einzelnen `TabellenBlock` (nur deren eigene Spalten).
 */
function berechneteEintraege(spalten: Spalte[], gruppe: string): KatalogEintrag[] {
  return spalten.filter(sp => (sp.berechnet || sp.wenn) && sp.key).map(sp => ({ pfad: sp.key, label: sp.label ?? sp.key, gruppe }));
}

const AGGREGATIONS_OPS: { wert: OpName; label: string }[] = [
  { wert: 'summe', label: 'Summe' },
  { wert: 'anzahl', label: 'Anzahl' },
  { wert: 'max', label: 'Maximum' },
  { wert: 'letztesDatum', label: 'Letztes Datum' },
];

/**
 * Aggregation über Zeilen (`Berechnet`): Op, Zeilenbezug (`$seite`/`$bisher`/`$laufend`/`$alle`) und
 * das aggregierte Zeilenfeld. Genutzt für Kopf-/Fuß-Summen UND für die "Berechnung"-Variante einer
 * Feld-Bedingung (z.B. "Gesamtsumme > 0") -- beide teilen sich dieselbe Rechnung, nur der Vergleich
 * danach unterscheidet sich.
 */
function AggregationEditor({
  wert,
  formular,
  andereBerechnete,
  onChange,
}: {
  wert: Berechnet;
  formular: FormularCode;
  andereBerechnete: KatalogEintrag[];
  onChange: (wert: Berechnet) => void;
}) {
  return (
    <div class="row g-1 mb-1">
      <div class="col-3">
        <select class="form-select form-select-sm" value={wert.op} onChange={e => onChange({ ...wert, op: (e.target as HTMLSelectElement).value as OpName })}>
          {AGGREGATIONS_OPS.map(o => (
            <option key={o.wert} value={o.wert}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div class="col-4">
        <select class="form-select form-select-sm" value={wert.ueber} onChange={e => onChange({ ...wert, ueber: (e.target as HTMLSelectElement).value })}>
          <option value="$alle">alle Zeilen (Gesamtsumme)</option>
          <option value="$seite">nur diese Seite</option>
          <option value="$bisher">alle Vorseiten (Übertrag)</option>
          <option value="$laufend">bis hierher (Übertrag + diese Seite)</option>
        </select>
      </div>
      <div class="col-5">
        <select class="form-select form-select-sm" value={wert.feld ?? ''} onChange={e => onChange({ ...wert, feld: (e.target as HTMLSelectElement).value || undefined })}>
          <option value="">(Feld wählen)</option>
          {gruppiere([...katalogZeilenFelder(formular), ...andereBerechnete]).map(([gruppe, felder]) => (
            <optgroup key={gruppe} label={gruppe}>
              {felder.map(f => (
                <option key={f.pfad} value={f.pfad}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
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
            Tage Frist — liegt der letzte Eintrag länger zurück (oder fehlt er), wird das heutige Datum gesetzt.
            Leer lassen: immer der letzte Eintrag.
          </span>
        </div>
      )}
    </div>
  );
}

function FeldZeile({
  keyName,
  feld,
  formular,
  armed,
  tabellen,
  onArm,
  onChange,
  onRename,
  onDelete,
  vorschau,
}: {
  keyName: string;
  feld: Feld;
  formular: FormularCode;
  tabellen: Record<string, TabellenDef>;
  armed: Armed | null;
  onArm: () => void;
  onChange: (feld: Feld) => void;
  onRename: (neuerKey: string) => void;
  onDelete: () => void;
  vorschau: Vorschau;
}) {
  const festerText = feld.text !== undefined;
  const textRef = useRef<HTMLInputElement>(null);
  // Tabellen mit dynamischen Spalten -- nur dafür gibt es überhaupt Überschriften zu setzen.
  const mitListen = Object.entries(tabellen).filter(([, t]) => t.listen && Object.keys(t.listen).length > 0);
  // Berechnete und Ankreuz-Spalten aller Tabellen -- `mitBerechnetenSpalten()` in `shared` trägt
  // ihren Wert schon unter `key` in die Zeile ein, eine Summe/Anzahl/Maximum kann sie also direkt
  // referenzieren. `Berechnet.tabelle` grenzt nicht auf eine Tabelle ein (in diesem Editor noch
  // nicht gesetzt), deshalb hier über alle Tabellen, per `pfad` dedupliziert.
  const andereBerechnete = [...new Map(berechneteEintraege(Object.values(tabellen).flatMap(t => t.spalten), 'Berechnete/Ankreuz-Spalten').map(e => [e.pfad, e])).values()];
  return (
    <div class="border rounded p-2 mb-1">
      <div class="d-flex align-items-center flex-wrap gap-1 mb-1">
        <ScharfButton aktiv={istGleich(armed, { bereich: 'feld', key: keyName })} onClick={onArm} />
        <span class="font-monospace small text-truncate flex-grow-1" title={keyName}>
          {feld.label ?? keyName}
        </span>
        <Zellkoordinaten wert={feld} onChange={onChange} />
        <button type="button" class="btn btn-sm btn-outline-danger py-0" onClick={onDelete} title="Feld löschen">
          <span class="material-icons-round" style="font-size:0.85rem;vertical-align:middle">
            delete
          </span>
        </button>
      </div>

      <div class="btn-group btn-group-sm w-100 mb-1">
        <button
          type="button"
          class={`btn ${!festerText && !feld.berechnet && !feld.wenn && !feld.quellen && !feld.listenKopf ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => onChange({ ...feld, text: undefined, berechnet: undefined, wenn: undefined, quellen: undefined, listenKopf: undefined })}
        >
          Datenfeld
        </button>
        <button
          type="button"
          class={`btn ${festerText ? 'btn-primary' : 'btn-outline-secondary'}`}
          title="Fester Text, wahlweise mit eingefügten Datenpfaden"
          onClick={() => onChange({ ...feld, berechnet: undefined, wenn: undefined, quellen: undefined, listenKopf: undefined, text: feld.text ?? '' })}
        >
          Text
        </button>
        <button
          type="button"
          class={`btn ${feld.quellen ? 'btn-primary' : 'btn-outline-secondary'}`}
          title="Mehrere Werte in eine Zelle, ohne Trennzeichen-Lücke bei leeren/optionalen Teilen (z.B. Adress2)"
          onClick={() => onChange({ ...feld, text: undefined, berechnet: undefined, wenn: undefined, listenKopf: undefined, quellen: feld.quellen ?? [keyName], trenner: feld.trenner ?? ', ' })}
        >
          Mehrere
        </button>
        <button
          type="button"
          class={`btn ${feld.berechnet ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => onChange({ ...feld, text: undefined, wenn: undefined, quellen: undefined, listenKopf: undefined, berechnet: feld.berechnet ?? { op: 'summe', ueber: '$seite' } })}
        >
          Summe
        </button>
        <button
          type="button"
          class={`btn ${feld.wenn ? 'btn-primary' : 'btn-outline-secondary'}`}
          title="Zeigt ein Zeichen nur, wenn eine Bedingung zutrifft, z.B. bei Gesamtsumme > 0"
          onClick={() => {
            const startPfad = katalogFelder(formular)[0]?.pfad ?? '';
            onChange({
              ...feld,
              text: undefined,
              berechnet: undefined,
              quellen: undefined,
              listenKopf: undefined,
              wenn: feld.wenn ?? { feld: startPfad, werte: istBooleanFeld(startPfad) ? [true] : [], dann: 'X' },
            });
          }}
        >
          Ankreuzen
        </button>
        {mitListen.length > 0 && (
          <button
            type="button"
            class={`btn ${feld.listenKopf ? 'btn-primary' : 'btn-outline-secondary'}`}
            title="Überschrift über einem dynamischen Spaltenplatz — zeigt den Schlüssel, der dort gelandet ist"
            onClick={() => {
              const [tabellenName, tabelle] = mitListen[0]!;
              onChange({
                ...feld,
                text: undefined,
                berechnet: undefined,
                wenn: undefined,
                quellen: undefined,
                listenKopf: feld.listenKopf ?? { tabelle: tabellenName, gruppe: Object.keys(tabelle.listen!)[0]!, index: 0 },
              });
            }}
          >
            Überschrift
          </button>
        )}
      </div>

      {feld.listenKopf ? (
        <div class="row g-1 mb-1">
          <div class="col-4">
            <select
              class="form-select form-select-sm"
              value={feld.listenKopf.tabelle}
              onChange={e => {
                const tabellenName = (e.target as HTMLSelectElement).value;
                const gruppe = Object.keys(tabellen[tabellenName]?.listen ?? {})[0] ?? '';
                onChange({ ...feld, listenKopf: { ...feld.listenKopf!, tabelle: tabellenName, gruppe } });
              }}
            >
              {mitListen.map(([name]) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div class="col-5">
            <select
              class="form-select form-select-sm"
              value={feld.listenKopf.gruppe}
              onChange={e => onChange({ ...feld, listenKopf: { ...feld.listenKopf!, gruppe: (e.target as HTMLSelectElement).value } })}
            >
              {Object.keys(tabellen[feld.listenKopf.tabelle]?.listen ?? {}).map(g => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div class="col-3">
            <div class="input-group input-group-sm">
              <span class="input-group-text px-1 small">Platz</span>
              <input
                type="number"
                min={1}
                step={1}
                class="form-control"
                value={feld.listenKopf.index + 1}
                onInput={e =>
                  onChange({
                    ...feld,
                    listenKopf: { ...feld.listenKopf!, index: Math.max(0, Math.round(Number((e.target as HTMLInputElement).value)) - 1) },
                  })
                }
              />
            </div>
          </div>
        </div>
      ) : feld.wenn ? (
        <FeldAnkreuzBedingung feld={feld} formular={formular} andereBerechnete={andereBerechnete} onChange={onChange} />
      ) : feld.quellen ? (
        <ZusammengesetzteQuellen feld={feld} formular={formular} onChange={onChange} />
      ) : festerText ? (
        <div class="mb-1">
          <PlatzhalterPicker formular={formular} inputRef={textRef} wert={feld.text ?? ''} onEinfuegen={neu => onChange({ ...feld, text: neu })} />
          <input
            ref={textRef}
            class="form-control form-control-sm"
            placeholder="z.B. Übertrag  oder  Seite {seite} von {seiten}"
            value={feld.text}
            onInput={e => onChange({ ...feld, text: (e.target as HTMLInputElement).value })}
          />
          <div class="form-text small">
            Platzhalter in <code>{'{ }'}</code>: <code>{'{seite}'}</code>, <code>{'{seiten}'}</code>,{' '}
            <code>{'{heute}'}</code> oder jeder Datenpfad (z.B. <code>{'{Monat}'}</code>, oder oben aus der Liste
            einfügen) -- auch mehrere gemischt, z.B. <code>{'{Nachname}, {Vorname}'}</code>. Für Trennzeichen, die
            bei leeren/optionalen Werten automatisch wegfallen (z.B. Adress2), stattdessen den Modus „Mehrere"
            nutzen. Format erzwingen mit <code>{'{Pfad:Format}'}</code>, z.B. <code>{'{heute:datumKurz}'}</code>.{' '}
            <button type="button" class="btn btn-link btn-sm p-0 align-baseline" onClick={openPlatzhalterHilfe}>
              Alle Platzhalter &amp; Formate…
            </button>
          </div>
        </div>
      ) : feld.berechnet ? (
        <AggregationEditor wert={feld.berechnet} formular={formular} andereBerechnete={andereBerechnete} onChange={berechnet => onChange({ ...feld, berechnet })} />
      ) : (
        <div class="mb-1">
          <DatenpfadWahl wert={keyName} eintraege={katalogFelder(formular)} onChange={onRename} />
        </div>
      )}

      <input class="form-control form-control-sm mb-1" placeholder="Anzeigename (nur für diese Liste)" value={feld.label ?? ''} onInput={e => onChange({ ...feld, label: (e.target as HTMLInputElement).value || undefined })} />
      <DarstellungsFelder wert={feld} onChange={onChange} />
      <WertVorschau text={wert(feld, keyName, vorschau.daten, vorschau.kontext)} />
    </div>
  );
}

const VORLAGEN: { label: string; key: string; feld: Feld }[] = [
  { label: '+ Feld', key: 'feld', feld: { x: 50, y: 50, size: 10, align: 'zentriert' } },
  {
    label: '+ Gesamtsumme',
    key: 'summe',
    feld: { x: 50, y: 50, size: 10, align: 'rechts', format: 'waehrung', berechnet: { op: 'summe', ueber: '$alle' } },
  },
  {
    label: '+ Übertrag',
    key: 'uebertrag',
    feld: { x: 50, y: 50, size: 10, align: 'rechts', format: 'waehrung', berechnet: { op: 'summe', ueber: '$bisher' } },
  },
  { label: '+ Seitenzahl', key: 'seitenzahl', feld: { x: 50, y: 50, size: 8, align: 'rechts', text: 'Seite {seite} von {seiten}' } },
  {
    label: '+ Datum (Unterschrift)',
    key: 'unterschriftsdatum',
    // Frist 14 Tage: unterschrieben wird am Tag der letzten Leistung, sofern die noch nicht lange
    // zurueckliegt -- sonst heute. `feld` muss der Admin noch waehlen (je Ressource anders).
    feld: { x: 50, y: 50, size: 10, align: 'zentriert', format: 'datum', berechnet: { op: 'letztesDatum', ueber: '$alle', maxTage: 14 } },
  },
];

function FeldListe({
  felder,
  formular,
  tabellen,
  armed,
  onArm,
  onChange,
  vorschau,
}: {
  felder: Record<string, Feld>;
  formular: FormularCode;
  tabellen: Record<string, TabellenDef>;
  armed: Armed | null;
  onArm: (armed: Armed | null) => void;
  onChange: (felder: Record<string, Feld>) => void;
  vorschau: Vorschau;
}) {
  function umbenennen(alt: string, neu: string) {
    if (!neu || neu === alt || felder[neu]) return;
    // Format-Vorschlag aus dem Katalog übernehmen, aber nur wenn das Feld noch keins hat --
    // verhindert Bugs wie bei OE (Array ohne `liste`-Format), ohne eine bewusste Wahl zu überschreiben.
    const vorschlag = katalogFelder(formular).find(e => e.pfad === neu)?.format;
    const naechste: Record<string, Feld> = {};
    for (const [k, v] of Object.entries(felder)) naechste[k === alt ? neu : k] = k === alt && !v.format && vorschlag ? { ...v, format: vorschlag } : v;
    onChange(naechste);
    if (istGleich(armed, { bereich: 'feld', key: alt })) onArm({ bereich: 'feld', key: neu });
  }

  function hinzufuegen(basis: string, feld: Feld) {
    let key = basis;
    for (let i = 2; felder[key]; i++) key = `${basis}${i}`;
    onChange({ ...felder, [key]: feld });
    onArm({ bereich: 'feld', key });
  }

  return (
    <div class="mb-3">
      <div class="small fw-semibold">Felder</div>
      <div class="small text-body-secondary mb-1">
        Alles außerhalb der Datentabelle — Kopfangaben, Summen, Übertrag, Seitenzahl. Die Position bestimmt allein die Zelle,
        bei Summen der gewählte Bezug (diese Seite / Vorseiten / alle Zeilen).
      </div>
      {Object.entries(felder).map(([key, feld]) => (
        <FeldZeile
          key={key}
          keyName={key}
          feld={feld}
          formular={formular}
          tabellen={tabellen}
          armed={armed}
          vorschau={vorschau}
          onArm={() => onArm(istGleich(armed, { bereich: 'feld', key }) ? null : { bereich: 'feld', key })}
          onChange={next => onChange({ ...felder, [key]: next })}
          onRename={neu => umbenennen(key, neu)}
          onDelete={() => {
            const rest = { ...felder };
            delete rest[key];
            onChange(rest);
            if (istGleich(armed, { bereich: 'feld', key })) onArm(null);
          }}
        />
      ))}
      <div class="d-flex flex-wrap gap-1">
        {VORLAGEN.map(v => (
          <button key={v.key} type="button" class="btn btn-sm btn-outline-secondary" onClick={() => hinzufuegen(v.key, { ...v.feld })}>
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}

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
          <select class="form-select form-select-sm" value={String(aktuell)} onChange={e => onChange({ werte: [(e.target as HTMLSelectElement).value === 'true'], bereich: undefined })}>
            <option value="true">Ja (zutreffend)</option>
            <option value="false">Nein (nicht zutreffend)</option>
          </select>
        </div>
        <div class="col-4">
          <input class="form-control form-control-sm" placeholder="Zeichen" value={wenn.dann} onInput={e => onChange({ dann: (e.target as HTMLInputElement).value })} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div class="row g-1 mb-1">
        <div class="col-8">
          <div class="btn-group btn-group-sm w-100">
            <button type="button" class={`btn ${!wenn.bereich ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => onChange({ bereich: undefined, werte: wenn.werte ?? [] })}>
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
          <input class="form-control form-control-sm" placeholder="Zeichen" value={wenn.dann} onInput={e => onChange({ dann: (e.target as HTMLInputElement).value })} />
        </div>
      </div>

      {wenn.bereich ? (
        <div class="input-group input-group-sm">
          <span class="input-group-text px-1 small">ab</span>
          <input class="form-control" placeholder="z.B. 8:00 oder 5" value={wenn.bereich.von} onInput={e => onChange({ bereich: { ...wenn.bereich!, von: (e.target as HTMLInputElement).value } })} />
          <span class="input-group-text px-1 small">bis vor</span>
          <input class="form-control" placeholder="z.B. 14:00 oder 20" value={wenn.bereich.bis} onInput={e => onChange({ bereich: { ...wenn.bereich!, bis: (e.target as HTMLInputElement).value } })} />
        </div>
      ) : auswahl.length > 0 ? (
        <div class="d-flex flex-wrap gap-2">
          {auswahl.map(wert => (
            <div key={wert} class="form-check">
              <input class="form-check-input" type="checkbox" checked={(wenn.werte ?? []).includes(wert)} onChange={e => schalte(wert, (e.target as HTMLInputElement).checked)} />
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
function AnkreuzBedingung({
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
          <Rechnung wert={wenn.berechnet} zeilenFelder={zeilenFelder} onChange={berechnet => setzeWenn({ berechnet })} />
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
            onChange({ ...spalte, label: vorschlag ?? spalte.label, wenn: { ...wenn, feld, werte: istBooleanFeld(feld) ? [true] : [] } });
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
function FeldAnkreuzBedingung({
  feld,
  formular,
  andereBerechnete,
  onChange,
}: {
  feld: Feld;
  formular: FormularCode;
  andereBerechnete: KatalogEintrag[];
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
          <AggregationEditor wert={wenn.berechnet} formular={formular} andereBerechnete={andereBerechnete} onChange={berechnet => setzeWenn({ berechnet })} />
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
            onChange({ ...feld, label: vorschlag ?? feld.label, wenn: { ...wenn, feld: pfad, werte: istBooleanFeld(pfad) ? [true] : [] } });
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

function SpalteZeile({
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
        <button type="button" class="btn btn-sm btn-outline-secondary py-0" onClick={() => onMove(-1)} title="Nach oben">
          ↑
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary py-0" onClick={() => onMove(1)} title="Nach unten">
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
          onClick={() => onChange({ ...spalte, wenn: undefined, listenPlatz: undefined, berechnet: spalte.berechnet ?? { op: 'produkt', operanden: [] } })}
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
          <input class="form-control font-monospace" placeholder="z.B. dauer" value={spalte.key} onInput={e => onChange({ ...spalte, key: (e.target as HTMLInputElement).value })} />
        </div>
      )}

      {spalte.listenPlatz ? (
        <div class="row g-1 mb-1">
          <div class="col-8">
            <select
              class="form-select form-select-sm"
              value={spalte.listenPlatz.gruppe}
              onChange={e => onChange({ ...spalte, listenPlatz: { ...spalte.listenPlatz!, gruppe: (e.target as HTMLSelectElement).value } })}
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
                    listenPlatz: { ...spalte.listenPlatz!, index: Math.max(0, Math.round(Number((e.target as HTMLInputElement).value)) - 1) },
                  })
                }
              />
            </div>
          </div>
        </div>
      ) : spalte.wenn ? (
        <AnkreuzBedingung spalte={spalte} zeilenFelder={zeilenFelder} andereBerechnete={andereBerechnete} onChange={onChange} />
      ) : spalte.berechnet ? (
        <Rechnung wert={spalte.berechnet} zeilenFelder={zeilenFelder} onChange={berechnet => onChange({ ...spalte, berechnet })} />
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

      <input class="form-control form-control-sm mb-1" placeholder="Anzeigename (nur für diese Liste)" value={spalte.label ?? ''} onInput={e => onChange({ ...spalte, label: (e.target as HTMLInputElement).value || undefined })} />
      <DarstellungsFelder wert={spalte} onChange={onChange} />
      <WertVorschau text={spaltenWert(spalte, beispielZeile, vorschau.kontext.listen[tabellenName])} />
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
function Rechnung({
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
        <select class="form-select" value={wert.op} onChange={e => onChange({ ...wert, op: (e.target as HTMLSelectElement).value as ZeilenOpName })}>
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
      <div class="small text-body-secondary mb-1">Operanden der Reihe nach verrechnet — für gemischte Rechnungen eine Zwischenrechnung einsetzen.</div>

      {wert.operanden.map((operand, i) =>
        typeof operand === 'object' ? (
          // Index als Key: Operanden haben keine eigene ID, ihre Reihenfolge ist Teil der Rechnung.
          <div key={i} class="border-start border-2 ps-2 ms-1 mb-1">
            <Rechnung wert={operand} zeilenFelder={zeilenFelder} onChange={b => setzeOperand(i, b)} onEntfernen={() => entferneOperand(i)} />
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
              <input type="number" step="any" class="form-control" value={operand} onInput={e => setzeOperand(i, Number((e.target as HTMLInputElement).value))} />
            )}
            <button type="button" class="btn btn-outline-danger" onClick={() => entferneOperand(i)}>
              ×
            </button>
          </div>
        ),
      )}

      <div class="d-flex gap-1">
        <button type="button" class="btn btn-sm btn-outline-secondary" onClick={() => onChange({ ...wert, operanden: [...wert.operanden, zeilenFelder[0]?.pfad ?? ''] })}>
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

/**
 * Schlüssel für eine neu angelegte Spalte, ohne eine bestehende Spalte derselben Tabelle zu
 * überschreiben -- ohne das würde eine zweite frisch angelegte Spalte denselben Default-Schlüssel
 * bekommen (immer `zeilenFelder[0]?.pfad`) und in Bedingungen/Summen die erste stillschweigend
 * verdrängen (siehe `mitBerechnetenSpalten()` in `shared`: gleicher Schlüssel = überschrieben).
 */
function eindeutigerSpaltenSchluessel(basis: string, spalten: Spalte[]): string {
  if (!spalten.some(sp => sp.key === basis)) return basis;
  let n = 2;
  while (spalten.some(sp => sp.key === `${basis}${n}`)) n++;
  return `${basis}${n}`;
}

/** Eine Datentabelle: Quelle, Filter, Platz auf DIESER Seite und ihre Spalten. */
function TabellenBlock({
  name,
  tabelle,
  seite,
  onSeiteChange,
  formular,
  armed,
  onArm,
  onChange,
  onDelete,
  vorschau,
}: {
  name: string;
  tabelle: TabellenDef;
  seite: SeitenDef;
  onSeiteChange: (seite: SeitenDef) => void;
  formular: FormularCode;
  armed: Armed | null;
  onArm: (armed: Armed | null) => void;
  onChange: (tabelle: TabellenDef) => void;
  onDelete: () => void;
  vorschau: Vorschau;
}) {
  const zeilenFelder = katalogZeilenFelder(formular, tabelle.quelle);
  // Bereits konfigurierte berechnete UND Ankreuz-Spalten dieser Tabelle -- der Renderer trägt ihren
  // Wert (Rechenergebnis bzw. das gedruckte Zeichen, sonst leer) schon unter `key` in die Zeile ein
  // (`mitBerechnetenSpalten()` in `shared`, sonst liefe eine Bedingung/Summe darüber ins Leere), eine
  // Ankreuz-Bedingung kann sie also per `feld` direkt wiederverwenden, statt dieselbe Rechnung ein
  // zweites Mal aufzubauen. Bewusst aus `tabelle.spalten`, nicht dem seitenspezifischen `spalten`
  // unten: `mitBerechnetenSpalten()` kennt nur die Tabellen-Spalten, eine NUR auf einer Seite
  // gesetzte Spalte würde also nie befüllt.
  const andereBerechnete = berechneteEintraege(tabelle.spalten, 'Berechnete/Ankreuz-Spalten dieser Tabelle');
  // Erste Beispielzeile dieser Tabelle -- der Filter ist darin schon angewandt.
  const beispielZeile: Zeile = vorschau.kontext.$alle[name]?.[0] ?? {};
  const bereich = seite.bereiche.find(b => b.tabelle === name);
  const aktiv = istGleich(armed, { bereich: 'tabelle', tabelle: name });
  const letzteAktiv = istGleich(armed, { bereich: 'letzteZeile', tabelle: name });
  const filterWerte = tabelle.filter ? werteAuswahl(tabelle.filter.feld) : [];

  function setzeBereich(next: Partial<Pick<TabellenBereich, 'startY' | 'maxZeilen' | 'spalten'>>) {
    const bestehend: TabellenBereich = bereich ?? { tabelle: name, startY: 700, maxZeilen: 10 };
    const ersetzt = { ...bestehend, ...next };
    onSeiteChange({ ...seite, bereiche: bereich ? seite.bereiche.map(b => (b.tabelle === name ? ersetzt : b)) : [...seite.bereiche, ersetzt] });
  }

  // Spalten kommen entweder aus der Tabelle (gelten dann für alle Seiten) oder aus diesem
  // Seitenbereich -- Bereitschaft und ähnliche Formulare haben je Seite ein anderes Raster.
  const eigeneSpalten = bereich?.spalten !== undefined;
  const spalten = bereich && bereich.spalten ? bereich.spalten : tabelle.spalten;

  function setzeSpalten(next: Spalte[]) {
    if (eigeneSpalten) setzeBereich({ spalten: next });
    else onChange({ ...tabelle, spalten: next });
  }

  return (
    <div class="border rounded p-2 mb-2 bg-body-tertiary">
      <div class="d-flex align-items-center gap-1 mb-1">
        <span class="fw-semibold small flex-grow-1">Tabelle „{name}"</span>
        <button type="button" class="btn btn-sm btn-outline-danger py-0" onClick={onDelete} title="Tabelle löschen">
          <span class="material-icons-round" style="font-size:0.85rem;vertical-align:middle">
            delete
          </span>
        </button>
      </div>

      <div class="row g-1 mb-1">
        <div class="col-7">
          <select class="form-select form-select-sm" value={tabelle.quelle} onChange={e => onChange({ ...tabelle, quelle: (e.target as HTMLSelectElement).value })}>
            {ZEILEN_QUELLEN[formular].map(q => (
              <option key={q.pfad} value={q.pfad}>
                {q.label}
              </option>
            ))}
          </select>
        </div>
        <div class="col-5">
          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              checked={Boolean(tabelle.filter)}
              onChange={e => onChange({ ...tabelle, filter: (e.target as HTMLInputElement).checked ? { feld: zeilenFelder[0]?.pfad ?? '', werte: [] } : undefined })}
            />
            <label class="form-check-label small">Nur bestimmte Zeilen</label>
          </div>
        </div>
      </div>

      {tabelle.filter && (
        <div class="mb-1 ps-2 border-start">
          <select
            class="form-select form-select-sm mb-1"
            value={tabelle.filter.feld}
            onChange={e => onChange({ ...tabelle, filter: { feld: (e.target as HTMLSelectElement).value, werte: [] } })}
          >
            {zeilenFelder.map(f => (
              <option key={f.pfad} value={f.pfad}>
                {f.label}
              </option>
            ))}
          </select>
          {filterWerte.length > 0 ? (
            <div class="d-flex flex-wrap gap-2">
              {filterWerte.map(wert => (
                <div key={wert} class="form-check">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    checked={tabelle.filter!.werte.includes(wert)}
                    onChange={e => {
                      const an = (e.target as HTMLInputElement).checked;
                      const werte = an ? [...tabelle.filter!.werte, wert] : tabelle.filter!.werte.filter(w => w !== wert);
                      onChange({ ...tabelle, filter: { ...tabelle.filter!, werte } });
                    }}
                  />
                  <label class="form-check-label small">{wert}</label>
                </div>
              ))}
            </div>
          ) : (
            <input
              class="form-control form-control-sm font-monospace"
              placeholder="Werte, durch Komma getrennt"
              value={tabelle.filter.werte.join(', ')}
              onInput={e =>
                onChange({
                  ...tabelle,
                  filter: {
                    ...tabelle.filter!,
                    werte: (e.target as HTMLInputElement).value
                      .split(',')
                      .map(t => t.trim())
                      .filter(Boolean),
                  },
                })
              }
            />
          )}
        </div>
      )}

      <div class="d-flex align-items-center gap-2 mb-1">
        <ScharfButton
          aktiv={aktiv}
          onClick={() => onArm(aktiv ? null : { bereich: 'tabelle', tabelle: name })}
          titel="Auf dem PDF die erste Datenzeile dieser Tabelle markieren — setzt Startposition und Zeilenhöhe"
        />
        <span class="small">erste Datenzeile auf dieser Seite</span>
      </div>
      {bereich && bereich.maxZeilen > 1 && (
        <div class="d-flex align-items-center gap-2 mb-1">
          <ScharfButton
            aktiv={letzteAktiv}
            onClick={() => onArm(letzteAktiv ? null : { bereich: 'letzteZeile', tabelle: name })}
            titel="Letzte Datenzeile markieren — daraus wird die Zeilenhöhe über alle Zeilen gemittelt"
          />
          <span class="small">
            letzte Datenzeile <span class="text-body-secondary">— misst die Höhe genauer</span>
          </span>
        </div>
      )}
      <div class="row g-1 mb-2">
        <ZahlFeld label="startY" wert={bereich?.startY} onChange={v => setzeBereich({ startY: v ?? 0 })} />
        <ZahlFeld label="Höhe" wert={tabelle.hoehe} min={0.1} onChange={v => onChange({ ...tabelle, hoehe: v ?? 1 })} />
        <ZahlFeld label="Zeilen" wert={bereich?.maxZeilen} ganzzahl min={1} onChange={v => setzeBereich({ maxZeilen: v ?? 1 })} />
      </div>
      {!bereich && <div class="small text-body-secondary mb-2">Auf dieser Seite noch kein Platz — Startposition setzen, um sie hier zu zeigen.</div>}

      <ListenGruppen
        tabelle={tabelle}
        formular={formular}
        onChange={onChange}
        onVorlage={(name, gruppe, plaetze) => {
          // Gruppe UND ihre Spaltenplätze in einem Zug: einzeln angelegt müsste der Admin für jede
          // Zulage dieselbe Konfiguration wiederholen, und die Zahl der Plätze steht ohnehin fest.
          const neue: Spalte[] = Array.from({ length: plaetze }, (_, i) => ({
            key: '',
            x: 50 + i * 30,
            x2: 75 + i * 30,
            size: 8,
            align: 'zentriert',
            listenPlatz: { gruppe: name, index: i },
            label: `${name} ${i + 1}`,
          }));
          onChange({ ...tabelle, listen: { ...(tabelle.listen ?? {}), [name]: gruppe }, spalten: [...tabelle.spalten, ...neue] });
        }}
      />

      <div class="d-flex align-items-center gap-2 mb-1">
        <span class="small fw-semibold flex-grow-1">Spalten {eigeneSpalten ? '(nur diese Seite)' : ''}</span>
        {bereich && (
          <div class="form-check mb-0">
            <input
              class="form-check-input"
              type="checkbox"
              checked={eigeneSpalten}
              title="Eigenes Spaltenraster nur für diese Seite — beim Einschalten werden die Spalten der Tabelle als Ausgangspunkt kopiert, beim Ausschalten gelten wieder die der Tabelle"
              onChange={e =>
                setzeBereich({ spalten: (e.target as HTMLInputElement).checked ? structuredClone(spalten) : undefined })
              }
            />
            <label class="form-check-label small">eigene je Seite</label>
          </div>
        )}
      </div>
      {spalten.map((spalte, index) => (
        <SpalteZeile
          key={index}
          spalte={spalte}
          tabellenName={name}
          formular={formular}
          quelle={tabelle.quelle}
          andereBerechnete={andereBerechnete}
          armed={armed}
          index={index}
          beispielZeile={beispielZeile}
          listen={tabelle.listen}
          vorschau={vorschau}
          onArm={() => onArm(istGleich(armed, { bereich: 'spalte', tabelle: name, index }) ? null : { bereich: 'spalte', tabelle: name, index })}
          onChange={next => setzeSpalten(spalten.map((s, i) => (i === index ? next : s)))}
          onDelete={() => setzeSpalten(spalten.filter((_, i) => i !== index))}
          onMove={richtung => {
            const ziel = index + richtung;
            if (ziel < 0 || ziel >= spalten.length) return;
            const kopie = [...spalten];
            [kopie[index], kopie[ziel]] = [kopie[ziel]!, kopie[index]!];
            setzeSpalten(kopie);
          }}
        />
      ))}
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary"
        onClick={() => setzeSpalten([...spalten, { key: eindeutigerSpaltenSchluessel(zeilenFelder[0]?.pfad ?? '', spalten), x: 50, size: 10, align: 'zentriert' }])}
      >
        + Spalte
      </button>
    </div>
  );
}

export function FeldPanel({ formular, seite, onSeiteChange, tabellen, onTabellenChange, armed, onArm, vorschau }: Props) {
  const [neuerName, setNeuerName] = useState('');
  const signaturAktiv = istGleich(armed, { bereich: 'signaturBild' });

  function tabelleAnlegen() {
    const name = neuerName.trim() || `tabelle${Object.keys(tabellen).length + 1}`;
    if (tabellen[name]) return;
    onTabellenChange({ ...tabellen, [name]: { quelle: ZEILEN_QUELLEN[formular][0]?.pfad ?? '', hoehe: 14, spalten: [] } });
    setNeuerName('');
  }

  return (
    <div>
      <FeldListe felder={seite.felder} formular={formular} tabellen={tabellen} armed={armed} onArm={onArm} vorschau={vorschau} onChange={felder => onSeiteChange({ ...seite, felder })} />

      <div class="mb-3">
        <div class="small fw-semibold">Datentabellen</div>
        <div class="small text-body-secondary mb-1">
          Mehrere Tabellen dürfen dieselbe Quelle nutzen und sich nur im Filter unterscheiden (z.B. Einsätze getrennt nach LRE).
          Startposition und Zeilenzahl gelten je Seite, Zeilenhöhe und Spalten für die Tabelle insgesamt.
        </div>
        {Object.entries(tabellen).map(([name, tabelle]) => (
          <TabellenBlock
            key={name}
            name={name}
            tabelle={tabelle}
            seite={seite}
            onSeiteChange={onSeiteChange}
            formular={formular}
            armed={armed}
            onArm={onArm}
            vorschau={vorschau}
            onChange={next => onTabellenChange({ ...tabellen, [name]: next })}
            onDelete={() => {
              const rest = { ...tabellen };
              delete rest[name];
              onTabellenChange(rest);
              onSeiteChange({ ...seite, bereiche: seite.bereiche.filter(b => b.tabelle !== name) });
            }}
          />
        ))}
        <div class="input-group input-group-sm">
          <input class="form-control" placeholder="Name der neuen Tabelle" value={neuerName} onInput={e => setNeuerName((e.target as HTMLInputElement).value)} />
          <button type="button" class="btn btn-outline-secondary" onClick={tabelleAnlegen}>
            + Tabelle
          </button>
        </div>
      </div>

      <div class="mb-3">
        <div class="small fw-semibold mb-1">Signatur-Fläche</div>
        <div class="d-flex align-items-center gap-2">
          <ScharfButton aktiv={signaturAktiv} onClick={() => onArm(signaturAktiv ? null : { bereich: 'signaturBild' })} />
          <span class="small flex-grow-1">{seite.signaturBild ? 'Fläche gesetzt' : 'nicht gesetzt'}</span>
          {seite.signaturBild && (
            <button type="button" class="btn btn-sm btn-outline-danger py-0" onClick={() => onSeiteChange({ ...seite, signaturBild: undefined })}>
              Löschen
            </button>
          )}
        </div>
        {seite.signaturBild && (
          <div class="row g-1 mt-1">
            <ZahlFeld label="x" wert={seite.signaturBild.x} onChange={v => onSeiteChange({ ...seite, signaturBild: { ...seite.signaturBild!, x: v ?? 0 } })} />
            <ZahlFeld label="y" wert={seite.signaturBild.y} onChange={v => onSeiteChange({ ...seite, signaturBild: { ...seite.signaturBild!, y: v ?? 0 } })} />
            <ZahlFeld label="B" wert={seite.signaturBild.w} onChange={v => onSeiteChange({ ...seite, signaturBild: { ...seite.signaturBild!, w: v ?? 0 } })} />
            <ZahlFeld label="H" wert={seite.signaturBild.h} onChange={v => onSeiteChange({ ...seite, signaturBild: { ...seite.signaturBild!, h: v ?? 0 } })} />
          </div>
        )}
      </div>
    </div>
  );
}
