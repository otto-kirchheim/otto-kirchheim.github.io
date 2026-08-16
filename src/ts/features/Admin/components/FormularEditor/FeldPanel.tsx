import { useState } from 'preact/hooks';
import type { Ausrichtung, Feld, FormatName, OpName, SeitenDef, Spalte, TabellenDef, ZeilenOpName } from '@otto-kirchheim/nebengeld-shared';
import { ZEILEN_QUELLEN, gruppiere, katalogFelder, katalogZeilenFelder, werteAuswahl, type FormularCode, type KatalogEintrag } from './datenKatalog';

export type Armed =
  | { bereich: 'feld'; key: string }
  | { bereich: 'spalte'; tabelle: string; index: number }
  | { bereich: 'tabelle'; tabelle: string }
  | { bereich: 'signaturBild' };

type Props = {
  formular: FormularCode;
  seite: SeitenDef;
  onSeiteChange: (seite: SeitenDef) => void;
  tabellen: Record<string, TabellenDef>;
  onTabellenChange: (tabellen: Record<string, TabellenDef>) => void;
  armed: Armed | null;
  onArm: (armed: Armed | null) => void;
};

const FORMATE: { wert: FormatName | ''; label: string }[] = [
  { wert: '', label: 'unverändert' },
  { wert: 'waehrung', label: 'Währung (1.234,50)' },
  { wert: 'zahl', label: 'Zahl (1.234,57)' },
  { wert: 'ganzzahl', label: 'Ganzzahl (1.235)' },
  { wert: 'datum', label: 'Datum (15.03.2026)' },
  { wert: 'datumKurz', label: 'Datum kurz (15.03.)' },
  { wert: 'tag', label: 'Tag (15)' },
  { wert: 'wochentag', label: 'Wochentag (So)' },
  { wert: 'monatJahr', label: 'Monat/Jahr (03/2026)' },
  { wert: 'uhrzeit', label: 'Uhrzeit (07:05)' },
  { wert: 'stunden', label: 'Zeitspanne (2:30)' },
  { wert: 'liste', label: 'Liste zusammenfügen (I / IW)' },
  { wert: 'grossbuchstaben', label: 'GROSSBUCHSTABEN' },
];

/** Schriftgröße, Auto-Verkleinerung, Umbruch, Ausrichtung und Format -- für Felder wie für Spalten. */
function DarstellungsFelder<T extends { size: number; autoGroesse?: boolean; umbruch?: boolean; align?: Ausrichtung; format?: FormatName }>({
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
  if (a.bereich === 'tabelle') return a.tabelle === (b as { tabelle: string }).tabelle;
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

/** Mehrere Datenpfade in eine Zelle, verbunden mit einem frei wählbaren Trennzeichen. */
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

function ZahlFeld({ label, wert, onChange }: { label: string; wert: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <div class="col">
      <div class="input-group input-group-sm">
        <span class="input-group-text px-1 small">{label}</span>
        <input
          type="number"
          step="0.5"
          class="form-control px-1"
          value={wert === undefined ? '' : Number(wert.toFixed(1))}
          onInput={e => {
            const v = (e.target as HTMLInputElement).value;
            onChange(v === '' ? undefined : Number(v));
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

function FeldZeile({
  keyName,
  feld,
  formular,
  armed,
  onArm,
  onChange,
  onRename,
  onDelete,
}: {
  keyName: string;
  feld: Feld;
  formular: FormularCode;
  armed: Armed | null;
  onArm: () => void;
  onChange: (feld: Feld) => void;
  onRename: (neuerKey: string) => void;
  onDelete: () => void;
}) {
  const festerText = feld.text !== undefined;
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
          class={`btn ${!festerText && !feld.berechnet && !feld.quellen ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => onChange({ ...feld, text: undefined, berechnet: undefined, quellen: undefined })}
        >
          Datenfeld
        </button>
        <button
          type="button"
          class={`btn ${feld.quellen ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => onChange({ ...feld, text: undefined, berechnet: undefined, quellen: feld.quellen ?? [keyName], trenner: feld.trenner ?? ', ' })}
          title="Mehrere Werte in eine Zelle, z.B. Nachname, Vorname"
        >
          Mehrere
        </button>
        <button
          type="button"
          class={`btn ${feld.berechnet ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => onChange({ ...feld, text: undefined, quellen: undefined, berechnet: { op: 'summe', ueber: '$seite' } })}
        >
          Summe
        </button>
        <button
          type="button"
          class={`btn ${festerText ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => onChange({ ...feld, berechnet: undefined, quellen: undefined, text: feld.text ?? '' })}
        >
          Fester Text
        </button>
      </div>

      {feld.quellen ? (
        <ZusammengesetzteQuellen feld={feld} formular={formular} onChange={onChange} />
      ) : festerText ? (
        <div class="mb-1">
          <input class="form-control form-control-sm" placeholder="z.B. Übertrag  oder  Seite {seite} von {seiten}" value={feld.text} onInput={e => onChange({ ...feld, text: (e.target as HTMLInputElement).value })} />
          <div class="form-text small">
            Platzhalter in <code>{'{ }'}</code>: <code>{'{seite}'}</code>, <code>{'{seiten}'}</code> oder jeder Datenpfad (z.B.{' '}
            <code>{'{Monat}'}</code>).
          </div>
        </div>
      ) : feld.berechnet ? (
        <div class="row g-1 mb-1">
          <div class="col-3">
            <select class="form-select form-select-sm" value={feld.berechnet.op} onChange={e => onChange({ ...feld, berechnet: { ...feld.berechnet!, op: (e.target as HTMLSelectElement).value as OpName } })}>
              <option value="summe">Summe</option>
              <option value="anzahl">Anzahl</option>
              <option value="max">Maximum</option>
            </select>
          </div>
          <div class="col-4">
            <select class="form-select form-select-sm" value={feld.berechnet.ueber} onChange={e => onChange({ ...feld, berechnet: { ...feld.berechnet!, ueber: (e.target as HTMLSelectElement).value } })}>
              <option value="$alle">alle Zeilen (Gesamtsumme)</option>
              <option value="$seite">nur diese Seite</option>
              <option value="$bisher">alle Vorseiten (Übertrag)</option>
            </select>
          </div>
          <div class="col-5">
            <select class="form-select form-select-sm" value={feld.berechnet.feld ?? ''} onChange={e => onChange({ ...feld, berechnet: { ...feld.berechnet!, feld: (e.target as HTMLSelectElement).value || undefined } })}>
              <option value="">(Feld wählen)</option>
              {katalogZeilenFelder(formular).map(f => (
                <option key={f.pfad} value={f.pfad}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div class="mb-1">
          <DatenpfadWahl wert={keyName} eintraege={katalogFelder(formular)} onChange={onRename} />
        </div>
      )}

      <input class="form-control form-control-sm mb-1" placeholder="Anzeigename (nur für diese Liste)" value={feld.label ?? ''} onInput={e => onChange({ ...feld, label: (e.target as HTMLInputElement).value || undefined })} />
      <DarstellungsFelder wert={feld} onChange={onChange} />
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
];

function FeldListe({
  felder,
  formular,
  armed,
  onArm,
  onChange,
}: {
  felder: Record<string, Feld>;
  formular: FormularCode;
  armed: Armed | null;
  onArm: (armed: Armed | null) => void;
  onChange: (felder: Record<string, Feld>) => void;
}) {
  function umbenennen(alt: string, neu: string) {
    if (!neu || neu === alt || felder[neu]) return;
    const naechste: Record<string, Feld> = {};
    for (const [k, v] of Object.entries(felder)) naechste[k === alt ? neu : k] = v;
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
          armed={armed}
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

/**
 * Ankreuz-Spalte: trägt `dann` nur ein, wenn das Feld einen der gewählten Werte hat. Bei
 * Bereitschaft je eine Spalte pro LRE-Stufe — Zeilen mit einer anderen (oder gar keiner) Stufe
 * bleiben in dieser Spalte leer.
 */
function AnkreuzBedingung({ spalte, zeilenFelder, onChange }: { spalte: Spalte; zeilenFelder: KatalogEintrag[]; onChange: (spalte: Spalte) => void }) {
  const wenn = spalte.wenn!;
  const auswahl = werteAuswahl(wenn.feld);

  function schalte(wert: string, an: boolean) {
    const werte = an ? [...wenn.werte, wert] : wenn.werte.filter(w => w !== wert);
    onChange({ ...spalte, wenn: { ...wenn, werte } });
  }

  return (
    <div class="mb-1">
      <div class="row g-1 mb-1">
        <div class="col-8">
          <select class="form-select form-select-sm" value={wenn.feld} onChange={e => onChange({ ...spalte, wenn: { ...wenn, feld: (e.target as HTMLSelectElement).value, werte: [] } })}>
            {zeilenFelder.map(f => (
              <option key={f.pfad} value={f.pfad}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div class="col-4">
          <input class="form-control form-control-sm" placeholder="Zeichen" value={wenn.dann} onInput={e => onChange({ ...spalte, wenn: { ...wenn, dann: (e.target as HTMLInputElement).value } })} />
        </div>
      </div>
      {auswahl.length > 0 ? (
        <div class="d-flex flex-wrap gap-2">
          {auswahl.map(wert => (
            <div key={wert} class="form-check">
              <input class="form-check-input" type="checkbox" checked={wenn.werte.includes(wert)} onChange={e => schalte(wert, (e.target as HTMLInputElement).checked)} />
              <label class="form-check-label small">{wert}</label>
            </div>
          ))}
        </div>
      ) : (
        <input
          class="form-control form-control-sm font-monospace"
          placeholder="Werte, durch Komma getrennt"
          value={wenn.werte.join(', ')}
          onInput={e =>
            onChange({
              ...spalte,
              wenn: {
                ...wenn,
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
  );
}

function SpalteZeile({
  spalte,
  tabellenName,
  formular,
  armed,
  index,
  onArm,
  onChange,
  onDelete,
  onMove,
}: {
  spalte: Spalte;
  tabellenName: string;
  formular: FormularCode;
  armed: Armed | null;
  index: number;
  onArm: () => void;
  onChange: (spalte: Spalte) => void;
  onDelete: () => void;
  onMove: (richtung: -1 | 1) => void;
}) {
  const zeilenFelder = katalogZeilenFelder(formular);
  const modus = spalte.wenn ? 'wenn' : spalte.berechnet ? 'berechnet' : 'daten';
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
        <button type="button" class={`btn ${modus === 'daten' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => onChange({ ...spalte, berechnet: undefined, wenn: undefined })}>
          Datenfeld
        </button>
        <button
          type="button"
          class={`btn ${modus === 'berechnet' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => onChange({ ...spalte, wenn: undefined, berechnet: spalte.berechnet ?? { op: 'produkt', operanden: [] } })}
        >
          Berechnet
        </button>
        <button
          type="button"
          class={`btn ${modus === 'wenn' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => onChange({ ...spalte, berechnet: undefined, wenn: spalte.wenn ?? { feld: zeilenFelder[0]?.pfad ?? '', werte: [], dann: 'X' } })}
          title="Nur ein Kreuz setzen, wenn ein Feld einen bestimmten Wert hat"
        >
          Ankreuzen
        </button>
      </div>

      {spalte.wenn ? (
        <AnkreuzBedingung spalte={spalte} zeilenFelder={zeilenFelder} onChange={onChange} />
      ) : spalte.berechnet ? (
        <div class="mb-1">
          <div class="row g-1 mb-1">
            <div class="col-4">
              <select class="form-select form-select-sm" value={spalte.berechnet.op} onChange={e => onChange({ ...spalte, berechnet: { ...spalte.berechnet!, op: (e.target as HTMLSelectElement).value as ZeilenOpName } })}>
                <option value="produkt">Produkt (×)</option>
                <option value="summe">Summe (+)</option>
                <option value="differenz">Differenz (−)</option>
                <option value="quotient">Quotient (÷)</option>
                <option value="zeitdifferenz">Dauer (Uhrzeit − Uhrzeit)</option>
              </select>
            </div>
            <div class="col-8 small text-body-secondary align-self-center">Operanden der Reihe nach verrechnet</div>
          </div>
          {spalte.berechnet.operanden.map((op, i) => (
            <div key={i} class="input-group input-group-sm mb-1">
              <select
                class="form-select"
                value={typeof op === 'number' ? '__zahl' : op}
                onChange={e => {
                  const v = (e.target as HTMLSelectElement).value;
                  const operanden = [...spalte.berechnet!.operanden];
                  operanden[i] = v === '__zahl' ? 0 : v;
                  onChange({ ...spalte, berechnet: { ...spalte.berechnet!, operanden } });
                }}
              >
                {zeilenFelder.map(f => (
                  <option key={f.pfad} value={f.pfad}>
                    {f.label}
                  </option>
                ))}
                <option value="__zahl">Fester Zahlenwert…</option>
              </select>
              {typeof op === 'number' && (
                <input
                  type="number"
                  step="any"
                  class="form-control"
                  value={op}
                  onInput={e => {
                    const operanden = [...spalte.berechnet!.operanden];
                    operanden[i] = Number((e.target as HTMLInputElement).value);
                    onChange({ ...spalte, berechnet: { ...spalte.berechnet!, operanden } });
                  }}
                />
              )}
              <button
                type="button"
                class="btn btn-outline-danger"
                onClick={() => onChange({ ...spalte, berechnet: { ...spalte.berechnet!, operanden: spalte.berechnet!.operanden.filter((_, j) => j !== i) } })}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            onClick={() => onChange({ ...spalte, berechnet: { ...spalte.berechnet!, operanden: [...spalte.berechnet!.operanden, zeilenFelder[0]?.pfad ?? ''] } })}
          >
            + Operand
          </button>
        </div>
      ) : (
        <div class="mb-1">
          <DatenpfadWahl wert={spalte.key} eintraege={zeilenFelder} onChange={key => onChange({ ...spalte, key })} />
        </div>
      )}

      <input class="form-control form-control-sm mb-1" placeholder="Anzeigename (nur für diese Liste)" value={spalte.label ?? ''} onInput={e => onChange({ ...spalte, label: (e.target as HTMLInputElement).value || undefined })} />
      <DarstellungsFelder wert={spalte} onChange={onChange} />
    </div>
  );
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
}) {
  const zeilenFelder = katalogZeilenFelder(formular);
  const bereich = seite.bereiche.find(b => b.tabelle === name);
  const aktiv = istGleich(armed, { bereich: 'tabelle', tabelle: name });
  const filterWerte = tabelle.filter ? werteAuswahl(tabelle.filter.feld) : [];

  function setzeBereich(next: Partial<{ startY: number; maxZeilen: number }>) {
    const bestehend = bereich ?? { tabelle: name, startY: 700, maxZeilen: 10 };
    const ersetzt = { ...bestehend, ...next };
    onSeiteChange({ ...seite, bereiche: bereich ? seite.bereiche.map(b => (b.tabelle === name ? ersetzt : b)) : [...seite.bereiche, ersetzt] });
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
      <div class="row g-1 mb-2">
        <ZahlFeld label="startY" wert={bereich?.startY} onChange={v => setzeBereich({ startY: v ?? 0 })} />
        <ZahlFeld label="Höhe" wert={tabelle.hoehe} onChange={v => onChange({ ...tabelle, hoehe: v ?? 1 })} />
        <ZahlFeld label="Zeilen" wert={bereich?.maxZeilen} onChange={v => setzeBereich({ maxZeilen: v ?? 1 })} />
      </div>
      {!bereich && <div class="small text-body-secondary mb-2">Auf dieser Seite noch kein Platz — Startposition setzen, um sie hier zu zeigen.</div>}

      <div class="small fw-semibold mb-1">Spalten</div>
      {tabelle.spalten.map((spalte, index) => (
        <SpalteZeile
          key={index}
          spalte={spalte}
          tabellenName={name}
          formular={formular}
          armed={armed}
          index={index}
          onArm={() => onArm(istGleich(armed, { bereich: 'spalte', tabelle: name, index }) ? null : { bereich: 'spalte', tabelle: name, index })}
          onChange={next => onChange({ ...tabelle, spalten: tabelle.spalten.map((s, i) => (i === index ? next : s)) })}
          onDelete={() => onChange({ ...tabelle, spalten: tabelle.spalten.filter((_, i) => i !== index) })}
          onMove={richtung => {
            const ziel = index + richtung;
            if (ziel < 0 || ziel >= tabelle.spalten.length) return;
            const kopie = [...tabelle.spalten];
            [kopie[index], kopie[ziel]] = [kopie[ziel]!, kopie[index]!];
            onChange({ ...tabelle, spalten: kopie });
          }}
        />
      ))}
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary"
        onClick={() => onChange({ ...tabelle, spalten: [...tabelle.spalten, { key: zeilenFelder[0]?.pfad ?? '', x: 50, size: 10, align: 'zentriert' }] })}
      >
        + Spalte
      </button>
    </div>
  );
}

export function FeldPanel({ formular, seite, onSeiteChange, tabellen, onTabellenChange, armed, onArm }: Props) {
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
      <FeldListe felder={seite.felder} formular={formular} armed={armed} onArm={onArm} onChange={felder => onSeiteChange({ ...seite, felder })} />

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
