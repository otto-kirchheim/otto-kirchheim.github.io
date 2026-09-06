import { useRef } from 'react';

import type { Feld, TabellenDef } from '@otto-kirchheim/nebengeld-shared';
import { wert } from '@/infrastructure/pdf/wert';
import { AggregationEditor } from './aggregationUndRechnung';
import { FeldAnkreuzBedingung } from './bedingungEditor';
import { istBooleanFeld, katalogFelder, type FormularCode } from './datenKatalog';
import { DatenpfadWahl, PlatzhalterPicker, openPlatzhalterHilfe, ZusammengesetzteQuellen } from './datenpfadUndFormeln';
import {
  DarstellungsFelder,
  ScharfButton,
  Zellkoordinaten,
  istGleich,
  naechsterFreierSchluessel,
} from './feldPanelGemeinsam';
import type { Armed, Vorschau } from './feldPanelTypen';
import { WertVorschau } from './WertVorschau';

function FeldZeile({
  keyName,
  feld,
  formular,
  armed,
  tabellen,
  belegtePfade,
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
  /** Pfade ALLER Felder in dieser Liste (inkl. des eigenen) -- siehe `DatenpfadWahl`. */
  belegtePfade: Set<string>;
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
  return (
    <div className="border rounded p-2 mb-1">
      <div className="d-flex align-items-center flex-wrap gap-1 mb-1">
        <ScharfButton aktiv={istGleich(armed, { bereich: 'feld', key: keyName })} onClick={onArm} />
        <span className="font-monospace small text-truncate flex-grow-1" title={keyName}>
          {feld.label ?? keyName}
        </span>
        <Zellkoordinaten wert={feld} onChange={onChange} />
        <button type="button" className="btn btn-sm btn-outline-danger py-0" onClick={onDelete} title="Feld löschen">
          <span className="db-icon db-font-size-xs" data-icon="bin" style={{ verticalAlign: 'middle' }} />
        </button>
      </div>

      <div className="btn-group btn-group-sm w-100 mb-1">
        <button
          type="button"
          className={`btn ${!festerText && !feld.berechnet && !feld.wenn && !feld.quellen && !feld.listenKopf ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() =>
            onChange({
              ...feld,
              text: undefined,
              berechnet: undefined,
              wenn: undefined,
              quellen: undefined,
              listenKopf: undefined,
            })
          }
        >
          Datenfeld
        </button>
        <button
          type="button"
          className={`btn ${festerText ? 'btn-primary' : 'btn-outline-secondary'}`}
          title="Fester Text, wahlweise mit eingefügten Datenpfaden"
          onClick={() =>
            onChange({
              ...feld,
              berechnet: undefined,
              wenn: undefined,
              quellen: undefined,
              listenKopf: undefined,
              text: feld.text ?? '',
            })
          }
        >
          Text
        </button>
        <button
          type="button"
          className={`btn ${feld.quellen ? 'btn-primary' : 'btn-outline-secondary'}`}
          title="Mehrere Werte in eine Zelle, ohne Trennzeichen-Lücke bei leeren/optionalen Teilen (z.B. Adress2)"
          onClick={() =>
            onChange({
              ...feld,
              text: undefined,
              berechnet: undefined,
              wenn: undefined,
              listenKopf: undefined,
              quellen: feld.quellen ?? [keyName],
              trenner: feld.trenner ?? ', ',
            })
          }
        >
          Mehrere
        </button>
        <button
          type="button"
          className={`btn ${feld.berechnet ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() =>
            onChange({
              ...feld,
              text: undefined,
              wenn: undefined,
              quellen: undefined,
              listenKopf: undefined,
              berechnet: feld.berechnet ?? { op: 'summe', ueber: '$seite' },
            })
          }
        >
          Summe
        </button>
        <button
          type="button"
          className={`btn ${feld.wenn ? 'btn-primary' : 'btn-outline-secondary'}`}
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
            className={`btn ${feld.listenKopf ? 'btn-primary' : 'btn-outline-secondary'}`}
            title="Überschrift über einem dynamischen Spaltenplatz — zeigt den Schlüssel, der dort gelandet ist"
            onClick={() => {
              const [tabellenName, tabelle] = mitListen[0]!;
              onChange({
                ...feld,
                text: undefined,
                berechnet: undefined,
                wenn: undefined,
                quellen: undefined,
                listenKopf: feld.listenKopf ?? {
                  tabelle: tabellenName,
                  gruppe: Object.keys(tabelle.listen!)[0]!,
                  index: 0,
                },
              });
            }}
          >
            Überschrift
          </button>
        )}
      </div>

      {feld.listenKopf ? (
        <div className="raster mb-1 abstand-1">
          <div className="sp-4">
            <select
              className="form-select form-select-sm"
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
          <div className="sp-5">
            <select
              className="form-select form-select-sm"
              value={feld.listenKopf.gruppe}
              onChange={e =>
                onChange({
                  ...feld,
                  listenKopf: { ...feld.listenKopf!, gruppe: (e.target as HTMLSelectElement).value },
                })
              }
            >
              {Object.keys(tabellen[feld.listenKopf.tabelle]?.listen ?? {}).map(g => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="sp-3">
            <div className="input-group input-group-sm">
              <span className="input-group-text px-1 small">Platz</span>
              <input
                type="number"
                min={1}
                step={1}
                className="form-control"
                value={feld.listenKopf.index + 1}
                onChange={e =>
                  onChange({
                    ...feld,
                    listenKopf: {
                      ...feld.listenKopf!,
                      index: Math.max(0, Math.round(Number((e.target as HTMLInputElement).value)) - 1),
                    },
                  })
                }
              />
            </div>
          </div>
        </div>
      ) : feld.wenn ? (
        <FeldAnkreuzBedingung feld={feld} formular={formular} tabellen={tabellen} onChange={onChange} />
      ) : feld.quellen ? (
        <ZusammengesetzteQuellen feld={feld} formular={formular} onChange={onChange} />
      ) : festerText ? (
        <div className="mb-1">
          <PlatzhalterPicker
            formular={formular}
            inputRef={textRef}
            wert={feld.text ?? ''}
            onEinfuegen={neu => onChange({ ...feld, text: neu })}
          />
          <input
            ref={textRef}
            className="form-control form-control-sm"
            placeholder="z.B. Übertrag  oder  Seite {seite} von {seiten}"
            value={feld.text}
            onChange={e => onChange({ ...feld, text: (e.target as HTMLInputElement).value })}
          />
          <div className="form-text small">
            Platzhalter in <code>{'{ }'}</code>: <code>{'{seite}'}</code>, <code>{'{seiten}'}</code>,{' '}
            <code>{'{heute}'}</code> oder jeder Datenpfad (z.B. <code>{'{Monat}'}</code>, oder oben aus der Liste
            einfügen) -- auch mehrere gemischt, z.B. <code>{'{Nachname}, {Vorname}'}</code>. Für Trennzeichen, die bei
            leeren/optionalen Werten automatisch wegfallen (z.B. Adress2), stattdessen den Modus „Mehrere" nutzen.
            Format erzwingen mit <code>{'{Pfad:Format}'}</code>, z.B. <code>{'{heute:datumKurz}'}</code>.{' '}
            <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={openPlatzhalterHilfe}>
              Alle Platzhalter &amp; Formate…
            </button>
          </div>
        </div>
      ) : feld.berechnet ? (
        <AggregationEditor
          wert={feld.berechnet}
          formular={formular}
          tabellen={tabellen}
          onChange={berechnet => onChange({ ...feld, berechnet })}
        />
      ) : (
        <div className="mb-1">
          <DatenpfadWahl
            wert={keyName}
            eintraege={katalogFelder(formular)}
            belegt={new Set([...belegtePfade].filter(p => p !== keyName))}
            onChange={onRename}
          />
        </div>
      )}

      <input
        className="form-control form-control-sm mb-1"
        placeholder="Anzeigename (nur für diese Liste)"
        value={feld.label ?? ''}
        onChange={e => onChange({ ...feld, label: (e.target as HTMLInputElement).value || undefined })}
      />
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
  {
    label: '+ Seitenzahl',
    key: 'seitenzahl',
    feld: { x: 50, y: 50, size: 8, align: 'rechts', text: 'Seite {seite} von {seiten}' },
  },
  {
    label: '+ Monat/Jahr',
    key: 'monatJahr',
    feld: { x: 50, y: 50, size: 10, align: 'zentriert', text: '{Monat}/{Jahr}', label: 'Monat/Jahr' },
  },
];

export function FeldListe({
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
    for (const [k, v] of Object.entries(felder))
      naechste[k === alt ? neu : k] = k === alt && !v.format && vorschlag ? { ...v, format: vorschlag } : v;
    onChange(naechste);
    if (istGleich(armed, { bereich: 'feld', key: alt })) onArm({ bereich: 'feld', key: neu });
  }

  function hinzufuegen(basis: string, feld: Feld) {
    const key = naechsterFreierSchluessel(felder, basis);
    onChange({ ...felder, [key]: feld });
    onArm({ bereich: 'feld', key });
  }

  const belegtePfade = new Set(Object.keys(felder));

  return (
    <div className="mb-3">
      <div className="small fw-semibold">Felder</div>
      <div className="small text-body-secondary mb-1">
        Alles außerhalb der Datentabelle — Kopfangaben, Summen, Übertrag, Seitenzahl. Die Position bestimmt allein die
        Zelle, bei Summen der gewählte Bezug (diese Seite / Vorseiten / alle Zeilen).
      </div>
      {/* nurBeiSignatur-Felder (Unterschriftsdatum) laufen über die eigene, kompakte Sektion in der
          Signatur-Fläche (siehe `FeldPanel`), nicht über die allgemeine Feldliste. */}
      {Object.entries(felder)
        .filter(([, feld]) => !feld.nurBeiSignatur)
        .map(([key, feld]) => (
          <FeldZeile
            key={key}
            keyName={key}
            feld={feld}
            formular={formular}
            tabellen={tabellen}
            belegtePfade={belegtePfade}
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
      <div className="d-flex flex-wrap gap-1">
        {VORLAGEN.map(v => (
          <button
            key={v.key}
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => hinzufuegen(v.key, { ...v.feld })}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
