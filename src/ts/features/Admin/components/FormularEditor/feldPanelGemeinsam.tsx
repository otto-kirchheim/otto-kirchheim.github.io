import { useState } from 'react';

import type { Ausrichtung, Drehung, Feld, FormatName } from '@otto-kirchheim/nebengeld-shared';
import { FORMATE } from './datenKatalog';
import type { Armed } from './feldPanelTypen';

export function istGleich(a: Armed | null, b: Armed): boolean {
  if (!a || a.bereich !== b.bereich) return false;
  if (a.bereich === 'feld') return a.key === (b as { key: string }).key;
  if (a.bereich === 'spalte')
    return a.tabelle === (b as { tabelle: string }).tabelle && a.index === (b as { index: number }).index;
  if (a.bereich === 'tabelle' || a.bereich === 'letzteZeile') return a.tabelle === (b as { tabelle: string }).tabelle;
  return true;
}

export function ScharfButton({ aktiv, onClick, titel }: { aktiv: boolean; onClick: () => void; titel?: string }) {
  return (
    <button
      type="button"
      className={`btn btn-sm py-0 ${aktiv ? 'btn-danger' : 'btn-outline-primary'}`}
      onClick={onClick}
      title={titel ?? 'Rechteck auf dem PDF aufziehen, um Position und Zellbreite zu setzen'}
    >
      <span
        className="db-icon db-font-size-xs"
        data-icon={aktiv ? 'location_crosshairs' : 'resize'}
        style={{ verticalAlign: 'middle' }}
      />
    </button>
  );
}

/**
 * Zahleneingabe. `step="any"` ist Absicht: Koordinaten entstehen beim Ziehen als Kommazahlen, und
 * ein festes Raster (früher `0.5`) ließ das Formular beim Absenden alles dazwischen als ungültig
 * abweisen. Zählwerte wie „Zeilen" setzen dagegen `ganzzahl`, damit dort keine halbe oder negative
 * Angabe entsteht -- die wäre als Kapazität sinnlos und der Server lehnt sie ab.
 */
export function ZahlFeld({
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
    <div className="col">
      <div className="input-group input-group-sm">
        <span className="input-group-text px-1 small">{label}</span>
        <input
          type="number"
          step={ganzzahl ? 1 : 'any'}
          min={min}
          className="form-control px-1"
          value={wert === undefined ? '' : Number(wert.toFixed(2))}
          onChange={e => {
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
export function Zellkoordinaten<T extends { x: number; y?: number; x2?: number; y2?: number }>({
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
      <button
        type="button"
        className="btn btn-sm btn-link p-0 small text-muted text-nowrap text-decoration-none"
        onClick={() => setOffen(o => !o)}
        title="Koordinaten bearbeiten"
      >
        x={wert.x.toFixed(0)}
        {wert.y !== undefined && `, y=${wert.y.toFixed(0)}`}
        {breite !== null && `, ${breite.toFixed(0)}${hoehe === null ? ' br.' : `×${hoehe.toFixed(0)}`}`}
        <span
          className="db-icon db-font-size-2xs"
          data-icon={offen ? 'chevron_up' : 'chevron_down'}
          style={{ verticalAlign: 'middle' }}
        />
      </button>
      {offen && (
        <div className="row g-1 w-100 mt-1">
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

const DREHUNGEN: { wert: Drehung; label: string }[] = [
  { wert: 0, label: 'waagerecht' },
  { wert: 90, label: '90° (von unten nach oben)' },
  { wert: 270, label: '270° (von oben nach unten)' },
  { wert: 180, label: '180° (auf dem Kopf)' },
];

/** Schriftgröße, Auto-Verkleinerung, Umbruch, Ausrichtung, Format, Drehung und Schriftschnitt -- Felder wie Spalten. */
export function DarstellungsFelder<
  T extends {
    size: number;
    autoGroesse?: boolean;
    umbruch?: boolean;
    align?: Ausrichtung;
    format?: FormatName;
    drehung?: Drehung;
    fett?: boolean;
    kursiv?: boolean;
    unterstrichen?: boolean;
  },
>({ wert, onChange }: { wert: T; onChange: (next: T) => void }) {
  return (
    <>
      {/* Schrift: Größe direkt neben Fett/Kursiv/Unterstrichen -- alles Schriftschnitt-Optik. */}
      <div className="row g-1 align-items-center">
        <div className="col-3">
          <input
            type="number"
            className="form-control form-control-sm"
            title={wert.autoGroesse ? 'Maximale Schriftgröße' : 'Schriftgröße'}
            value={wert.size}
            onChange={e => onChange({ ...wert, size: Number((e.target as HTMLInputElement).value) })}
          />
        </div>
        <div className="col-3 form-check mb-0">
          <input
            className="form-check-input"
            type="checkbox"
            checked={Boolean(wert.fett)}
            onChange={e => onChange({ ...wert, fett: (e.target as HTMLInputElement).checked || undefined })}
          />
          <label className="form-check-label small">Fett</label>
        </div>
        <div className="col-3 form-check mb-0">
          <input
            className="form-check-input"
            type="checkbox"
            checked={Boolean(wert.kursiv)}
            onChange={e => onChange({ ...wert, kursiv: (e.target as HTMLInputElement).checked || undefined })}
          />
          <label className="form-check-label small">Kursiv</label>
        </div>
        <div className="col-3 form-check mb-0">
          <input
            className="form-check-input"
            type="checkbox"
            checked={Boolean(wert.unterstrichen)}
            onChange={e => onChange({ ...wert, unterstrichen: (e.target as HTMLInputElement).checked || undefined })}
          />
          <label className="form-check-label small">Unterstr.</label>
        </div>
      </div>
      {/* Ausrichtung: Textausrichtung und Drehung gehören zusammen (beide steuern die Textrichtung in der Zelle). */}
      <div className="row g-1 mt-1">
        <div className="col-5">
          <select
            className="form-select form-select-sm"
            value={wert.align ?? 'links'}
            onChange={e => onChange({ ...wert, align: (e.target as HTMLSelectElement).value as Ausrichtung })}
          >
            <option value="links">links</option>
            <option value="zentriert">zentriert</option>
            <option value="rechts">rechts</option>
          </select>
        </div>
        <div className="col-7">
          <select
            className="form-select form-select-sm"
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
      {/* Format: eigene Zeile, unabhängig von Ausrichtung/Drehung. */}
      <div className="row g-1 mt-1">
        <div className="col-12">
          <select
            className="form-select form-select-sm"
            value={wert.format ?? ''}
            onChange={e =>
              onChange({
                ...wert,
                format: ((e.target as HTMLSelectElement).value || undefined) as FormatName | undefined,
              })
            }
          >
            {FORMATE.map(f => (
              <option key={f.wert} value={f.wert}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Verhalten: Auto-Verkleinerung und Umbruch steuern beide, wie der Text in die Zelle passt. */}
      <div className="d-flex gap-3 mt-1">
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            checked={Boolean(wert.autoGroesse)}
            onChange={e => onChange({ ...wert, autoGroesse: (e.target as HTMLInputElement).checked || undefined })}
          />
          <label className="form-check-label small">Schrift automatisch verkleinern</label>
        </div>
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            checked={Boolean(wert.umbruch)}
            onChange={e => onChange({ ...wert, umbruch: (e.target as HTMLInputElement).checked || undefined })}
          />
          <label className="form-check-label small">Zeilenumbruch</label>
        </div>
      </div>
    </>
  );
}

/** Nächster freie Feld-Key ab `basis` -- `basis` selbst, sonst `basis2`, `basis3`, ... */
export function naechsterFreierSchluessel(felder: Record<string, Feld>, basis: string): string {
  let key = basis;
  for (let i = 2; felder[key]; i++) key = `${basis}${i}`;
  return key;
}
