import { useState, type ReactNode } from 'react';

import type { Ausrichtung, Drehung, Feld, FormatName } from '@otto-kirchheim/nebengeld-shared';
import { FORMATE } from './datenKatalog';
import type { Armed } from './feldPanelTypen';
import { DBButton, DBCheckbox, DBTooltip } from '@db-ux/react-core-components';
import { DbAuswahl, DbFeld } from '@/components';

/**
 * Ausklappbarer Abschnitt (natives `<details>`, kein State) -- hält die lange Editor-Spalte
 * (Felder / Spalten / Sonderzeilen …) übersichtlich. `titel` steht in der `<summary>`, optional
 * mit `zusatz` rechts (z.B. Anzahl oder ein „+"-Knopf). `offen` = anfangs aufgeklappt.
 */
export function Abschnitt({
  titel,
  zusatz,
  offen,
  children,
}: {
  titel: ReactNode;
  zusatz?: ReactNode;
  offen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="klapp-abschnitt border p-2 mb-2 bg-body" open={offen}>
      <summary className="small fw-semibold d-flex align-items-center gap-2" style={{ cursor: 'pointer' }}>
        <span className="klapp-pfeil" aria-hidden="true">
          ▸
        </span>
        <span className="flex-grow-1">{titel}</span>
        {zusatz}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

/**
 * Ein einzelner ausklappbarer Eintrag (Feld / Spalte): zugeklappt nur `titel`, aufgeklappt der
 * ganze Editor darunter. `aktionen` (Scharf-Knopf, Löschen …) stehen rechts in der `<summary>` und
 * bleiben immer sichtbar/bedienbar. Ihr Klick klappt NICHT um: der Wrapper ruft `preventDefault()`,
 * das die Standardaktion des `<summary>`-Klicks (das Umklappen) unterdrückt -- Reacts
 * `stopPropagation` reicht dafür nicht, weil das native Toggle nicht über einen Listener läuft.
 * Deshalb gehören in `aktionen` nur `<button>`s, KEINE `<input>`s (preventDefault schluckt dort den
 * Fokus-Klick) -- Koordinatenfelder o.ä. in `children` an den Anfang setzen.
 * `offen` erzwingt aufgeklappt (z.B. wenn der Eintrag gerade scharf geschaltet ist); ist es
 * `false`/`undefined`, entscheidet der Nutzer per Klick.
 */
export function KlappZeile({
  titel,
  aktionen,
  offen,
  children,
}: {
  titel: ReactNode;
  aktionen?: ReactNode;
  offen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="klapp-zeile border p-2 mb-1" open={offen || undefined}>
      <summary className="d-flex align-items-center flex-wrap gap-1" style={{ cursor: 'pointer' }}>
        <span className="klapp-pfeil small" aria-hidden="true">
          ▸
        </span>
        <span className="small text-truncate flex-grow-1">{titel}</span>
        {aktionen !== undefined && (
          <span
            className="d-flex align-items-center flex-wrap gap-1"
            role="presentation"
            onClick={e => e.preventDefault()}
          >
            {aktionen}
          </span>
        )}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

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
    <DBButton
      type="button"
      className="py-0"
      variant={aktiv ? 'filled' : 'outlined'}
      data-color={aktiv ? 'critical' : undefined}
      size="small"
      icon={aktiv ? 'location_crosshairs' : 'resize'}
      noText
      onClick={onClick}
    >
      <DBTooltip>{titel ?? 'Rechteck auf dem PDF aufziehen, um Position und Zellbreite zu setzen'}</DBTooltip>
    </DBButton>
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
    <div>
      <DbFeld
        beschriftung={label}
        beschriftungZeigen
        dicht
        type="number"
        step={ganzzahl ? 1 : 'any'}
        min={min}
        value={wert === undefined ? '' : Number(wert.toFixed(2))}
        onChange={e => {
          const v = e.target.value;
          onChange(v === '' ? undefined : begrenzt(Number(v)));
        }}
      />
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
      <DBButton
        type="button"
        className="p-0 small text-muted text-nowrap text-decoration-none"
        variant="ghost"
        size="small"
        iconTrailing={offen ? 'chevron_up' : 'chevron_down'}
        onClick={() => setOffen(o => !o)}
        title="Koordinaten bearbeiten"
      >
        x={wert.x.toFixed(0)}
        {wert.y !== undefined && `, y=${wert.y.toFixed(0)}`}
        {breite !== null && `, ${breite.toFixed(0)}${hoehe === null ? ' br.' : `×${hoehe.toFixed(0)}`}`}
      </DBButton>
      {offen && (
        <div className="raster w-100 mt-1 abstand-1">
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
      <div className="raster align-items-center abstand-1">
        <div className="sp-3">
          <DbFeld
            beschriftung={wert.autoGroesse ? 'Maximale Schriftgröße' : 'Schriftgröße'}
            dicht
            type="number"
            title={wert.autoGroesse ? 'Maximale Schriftgröße' : 'Schriftgröße'}
            value={wert.size}
            onChange={e => onChange({ ...wert, size: Number(e.target.value) })}
          />
        </div>
        <div className="sp-3 mb-0">
          <DBCheckbox
            size="small"
            label="Fett"
            checked={Boolean(wert.fett)}
            onChange={e => onChange({ ...wert, fett: (e.target as HTMLInputElement).checked || undefined })}
          />
        </div>
        <div className="sp-3 mb-0">
          <DBCheckbox
            size="small"
            label="Kursiv"
            checked={Boolean(wert.kursiv)}
            onChange={e => onChange({ ...wert, kursiv: (e.target as HTMLInputElement).checked || undefined })}
          />
        </div>
        <div className="sp-3 mb-0">
          <DBCheckbox
            size="small"
            label="Unterstr."
            checked={Boolean(wert.unterstrichen)}
            onChange={e => onChange({ ...wert, unterstrichen: (e.target as HTMLInputElement).checked || undefined })}
          />
        </div>
      </div>
      {/* Ausrichtung: Textausrichtung und Drehung gehören zusammen (beide steuern die Textrichtung in der Zelle). */}
      <div className="raster mt-1 abstand-1">
        <div className="sp-5">
          <DbAuswahl
            beschriftung="Ausrichtung"
            dicht
            value={wert.align ?? 'links'}
            onChange={e => onChange({ ...wert, align: e.target.value as Ausrichtung })}
          >
            <option value="links">links</option>
            <option value="zentriert">zentriert</option>
            <option value="rechts">rechts</option>
          </DbAuswahl>
        </div>
        <div className="sp-7">
          <DbAuswahl
            beschriftung="Textrichtung in der Zelle — 90° für schmale, hochkant beschriftete Felder"
            dicht
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
          </DbAuswahl>
        </div>
      </div>
      {/* Format: eigene Zeile, unabhängig von Ausrichtung/Drehung. */}
      <div className="raster mt-1 abstand-1">
        <div>
          <DbAuswahl
            beschriftung="Format"
            dicht
            value={wert.format ?? ''}
            onChange={e =>
              onChange({
                ...wert,
                format: (e.target.value || undefined) as FormatName | undefined,
              })
            }
          >
            {FORMATE.map(f => (
              <option key={f.wert} value={f.wert}>
                {f.label}
              </option>
            ))}
          </DbAuswahl>
        </div>
      </div>
      {/* Verhalten: Auto-Verkleinerung und Umbruch steuern beide, wie der Text in die Zelle passt. */}
      <div className="d-flex gap-3 mt-1">
        <div>
          <DBCheckbox
            size="small"
            label="Schrift automatisch verkleinern"
            checked={Boolean(wert.autoGroesse)}
            onChange={e => onChange({ ...wert, autoGroesse: (e.target as HTMLInputElement).checked || undefined })}
          />
        </div>
        <div>
          <DBCheckbox
            size="small"
            label="Zeilenumbruch"
            checked={Boolean(wert.umbruch)}
            onChange={e => onChange({ ...wert, umbruch: (e.target as HTMLInputElement).checked || undefined })}
          />
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
