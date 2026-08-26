import { useState } from 'preact/hooks';
import type { Feld } from '@otto-kirchheim/nebengeld-shared';
import { FeldListe } from './FeldZeile';
import { gruppiere, katalogZeilenFelder, ZEILEN_QUELLEN } from './datenKatalog';
import {
  DarstellungsFelder,
  ScharfButton,
  ZahlFeld,
  Zellkoordinaten,
  istGleich,
  naechsterFreierSchluessel,
} from './feldPanelGemeinsam';
import type { Props } from './feldPanelTypen';
import { TabellenBlock } from './TabellenBlock';

export type { Armed, Vorschau } from './feldPanelTypen';

/**
 * Vorlage für das Unterschriftsdatum -- bewusst NICHT in `VORLAGEN` (allgemeine Feldliste), sondern
 * nur über die Signatur-Fläche anlegbar (siehe `FeldPanel`): `nurBeiSignatur: true` verknüpft das
 * Feld inhaltlich mit der Unterschrift, es druckt nur, wenn tatsächlich eine (nicht-digitale)
 * Unterschrift vorliegt. Frist 14 Tage: unterschrieben wird am Tag der letzten Leistung, sofern die
 * noch nicht lange zurueckliegt -- sonst heute. `feld` muss der Admin noch waehlen (je Ressource
 * anders).
 */
const UNTERSCHRIFTSDATUM_FELD: Feld = {
  x: 50,
  y: 50,
  size: 10,
  align: 'zentriert',
  format: 'datum',
  berechnet: { op: 'letztesDatum', ueber: '$alle', maxTage: 14 },
  nurBeiSignatur: true,
};

export function FeldPanel({
  formular,
  seite,
  onSeiteChange,
  tabellen,
  onTabellenChange,
  armed,
  onArm,
  vorschau,
}: Props) {
  const [neuerName, setNeuerName] = useState('');
  const signaturAktiv = istGleich(armed, { bereich: 'signaturBild' });
  // Höchstens EIN Unterschriftsdatum-Feld -- über das `nurBeiSignatur`-Flag gefunden statt über
  // einen festen Key, damit ein umbenanntes Feld (z.B. durch spätere manuelle Anpassung) trotzdem
  // erkannt wird.
  const datumEintrag = Object.entries(seite.felder).find(([, f]) => f.nurBeiSignatur);
  const [datumKey, datumFeld] = datumEintrag ?? [undefined, undefined];
  const datumArmed = datumKey !== undefined && istGleich(armed, { bereich: 'feld', key: datumKey });

  function datumHinzufuegen() {
    const key = naechsterFreierSchluessel(seite.felder, 'unterschriftsdatum');
    onSeiteChange({ ...seite, felder: { ...seite.felder, [key]: { ...UNTERSCHRIFTSDATUM_FELD } } });
    onArm({ bereich: 'feld', key });
  }

  function datumAendern(patch: Partial<Feld>) {
    if (!datumKey || !datumFeld) return;
    onSeiteChange({ ...seite, felder: { ...seite.felder, [datumKey]: { ...datumFeld, ...patch } } });
  }

  function datumLoeschen() {
    if (!datumKey) return;
    const rest = { ...seite.felder };
    delete rest[datumKey];
    onSeiteChange({ ...seite, felder: rest });
    if (datumArmed) onArm(null);
  }

  function tabelleAnlegen() {
    const name = neuerName.trim() || `tabelle${Object.keys(tabellen).length + 1}`;
    if (tabellen[name]) return;
    onTabellenChange({
      ...tabellen,
      [name]: { quelle: ZEILEN_QUELLEN[formular][0]?.pfad ?? '', startY: 700, maxZeilen: 10, hoehe: 14, spalten: [] },
    });
    setNeuerName('');
  }

  return (
    <div>
      <FeldListe
        felder={seite.felder}
        formular={formular}
        tabellen={tabellen}
        armed={armed}
        onArm={onArm}
        vorschau={vorschau}
        onChange={felder => onSeiteChange({ ...seite, felder })}
      />

      <div class="mb-3">
        <div class="small fw-semibold">Datentabellen</div>
        <div class="small text-body-secondary mb-1">
          Mehrere Tabellen dürfen dieselbe Quelle nutzen und sich nur im Filter unterscheiden (z.B. Einsätze getrennt
          nach LRE). Startposition und Zeilenzahl gelten immer je Seite; Zeilenhöhe und Spalten gelten standardmäßig für
          die ganze Tabelle, lassen sich aber je Seite überschreiben ("eigene je Seite").
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
            onVonSeiteEntfernen={() =>
              onSeiteChange({ ...seite, bereiche: seite.bereiche.filter(b => b.tabelle !== name) })
            }
          />
        ))}
        <div class="input-group input-group-sm">
          <input
            class="form-control"
            placeholder="Name der neuen Tabelle"
            value={neuerName}
            onInput={e => setNeuerName((e.target as HTMLInputElement).value)}
          />
          <button type="button" class="btn btn-outline-secondary" onClick={tabelleAnlegen}>
            + Tabelle
          </button>
        </div>
      </div>

      <div class="mb-3">
        <div class="small fw-semibold mb-1">Signatur-Fläche</div>
        <div class="d-flex align-items-center gap-2">
          <ScharfButton
            aktiv={signaturAktiv}
            onClick={() => onArm(signaturAktiv ? null : { bereich: 'signaturBild' })}
          />
          <span class="small flex-grow-1">{seite.signaturBild ? 'Fläche gesetzt' : 'nicht gesetzt'}</span>
          {seite.signaturBild && (
            <button
              type="button"
              class="btn btn-sm btn-outline-danger py-0"
              onClick={() => onSeiteChange({ ...seite, signaturBild: undefined })}
            >
              Löschen
            </button>
          )}
        </div>
        {seite.signaturBild && (
          <div class="row g-1 mt-1">
            <ZahlFeld
              label="x"
              wert={seite.signaturBild.x}
              onChange={v => onSeiteChange({ ...seite, signaturBild: { ...seite.signaturBild!, x: v ?? 0 } })}
            />
            <ZahlFeld
              label="y"
              wert={seite.signaturBild.y}
              onChange={v => onSeiteChange({ ...seite, signaturBild: { ...seite.signaturBild!, y: v ?? 0 } })}
            />
            <ZahlFeld
              label="B"
              wert={seite.signaturBild.w}
              onChange={v => onSeiteChange({ ...seite, signaturBild: { ...seite.signaturBild!, w: v ?? 0 } })}
            />
            <ZahlFeld
              label="H"
              wert={seite.signaturBild.h}
              onChange={v => onSeiteChange({ ...seite, signaturBild: { ...seite.signaturBild!, h: v ?? 0 } })}
            />
          </div>
        )}

        <div class="small fw-semibold mt-3 mb-1">Unterschriftsdatum</div>
        <div class="small text-body-secondary mb-1">
          Druckt nur, wenn tatsächlich eine (nicht-digitale) Unterschrift vorliegt.
        </div>
        {datumKey && datumFeld ? (
          <>
            <div class="d-flex align-items-center gap-2">
              <ScharfButton
                aktiv={datumArmed}
                onClick={() => onArm(datumArmed ? null : { bereich: 'feld', key: datumKey })}
                titel="Position auf dem PDF aufziehen"
              />
              <span class="small flex-grow-1">Feld gesetzt</span>
              <button type="button" class="btn btn-sm btn-outline-danger py-0" onClick={datumLoeschen}>
                Löschen
              </button>
            </div>
            <select
              class="form-select form-select-sm mt-1"
              value={datumFeld.berechnet?.feld ?? ''}
              onChange={e =>
                datumAendern({
                  berechnet: { ...datumFeld.berechnet!, feld: (e.target as HTMLSelectElement).value || undefined },
                })
              }
            >
              <option value="">(Datenfeld wählen -- je Ressource anders)</option>
              {gruppiere(katalogZeilenFelder(formular)).map(([gruppeName, felder]) => (
                <optgroup key={gruppeName} label={gruppeName}>
                  {felder.map(f => (
                    <option key={`${f.pfad}-${f.quelle ?? ''}`} value={f.pfad}>
                      {f.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div class="mt-1">
              <Zellkoordinaten wert={datumFeld} onChange={datumAendern} />
            </div>
            <div class="mt-1">
              <DarstellungsFelder wert={datumFeld} onChange={datumAendern} />
            </div>
            <div class="d-flex align-items-center gap-2 mt-1">
              <input
                type="number"
                min="0"
                class="form-control form-control-sm"
                style="max-width:6rem"
                placeholder="Tage"
                value={datumFeld.berechnet?.maxTage ?? ''}
                onInput={e => {
                  const roh = (e.target as HTMLInputElement).value;
                  datumAendern({
                    berechnet: { ...datumFeld.berechnet!, maxTage: roh === '' ? undefined : Number(roh) },
                  });
                }}
              />
              <span class="small text-body-secondary">Tage Frist — sonst gilt das heutige Datum.</span>
            </div>
          </>
        ) : (
          <button type="button" class="btn btn-sm btn-outline-secondary" onClick={datumHinzufuegen}>
            + Datum hinzufügen
          </button>
        )}
      </div>
    </div>
  );
}
