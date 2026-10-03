import { useState } from 'react';

import type { Feld } from '@otto-kirchheim/nebengeld-shared';
import { FeldListe } from './FeldZeile';
import { gruppiere, katalogZeilenFelder, zeilenQuellen } from './datenKatalog';
import { Abschnitt, DarstellungsFelder, ScharfButton, ZahlFeld, Zellkoordinaten } from './feldPanelGemeinsam';
import { istGleich, naechsterFreierSchluessel } from './feldPanelHelfer';
import type { Props } from './feldPanelTypen';
import { TabellenBlock } from './TabellenBlock';
import { DBButton, DBStack } from '@db-ux/react-core-components';
import { DbAuswahl, DbFeld } from '@/shared/ui/form/DbFeld';

export type { Armed, Vorschau } from './feldPanelTypen';

/**
 * Vorlage für das Unterschriftsdatum -- nur über die Signatur-Fläche anlegbar, nicht über `VORLAGEN`
 * (`FeldZeile.tsx`). `nurBeiSignatur: true` bindet das Feld an die Unterschrift: es druckt nur bei einer
 * nicht-digitalen. Frist 14 Tage: der Tag der letzten Leistung, sofern er nicht länger zurückliegt, sonst
 * heute (`datumMitFrist`). `feld` wählt der Admin, es ist je Ressource anders.
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

/**
 * Seitenleiste des Formular-Editors: Feldliste, Datentabellen sowie Signatur-Fläche und Unterschriftsdatum der aktuellen Seite.
 *
 * @param props - Formular, aktuelle Seite samt Tabellen, Scharfschalt-Zustand (`armed`), Vorschau und Änderungs-Callbacks.
 */
export function FeldPanel({
  formular,
  seite,
  onSeiteChange,
  tabellen,
  onTabellenChange,
  armed,
  onArm,
  vorschau,
  onSonderzeileUmbenannt,
}: Props) {
  const [neuerName, setNeuerName] = useState('');
  const signaturAktiv = istGleich(armed, { bereich: 'signaturBild' });
  // Höchstens ein Unterschriftsdatum-Feld, gefunden über `nurBeiSignatur` statt über einen festen Key,
  // damit ein umbenanntes Feld erkannt bleibt.
  const datumEintrag = Object.entries(seite.felder).find(([, f]) => f.nurBeiSignatur);
  const [datumKey, datumFeld] = datumEintrag ?? [undefined, undefined];
  const datumArmed = datumKey !== undefined && istGleich(armed, { bereich: 'feld', key: datumKey });

  /**
   * Legt das Unterschriftsdatum-Feld aus `UNTERSCHRIFTSDATUM_FELD` unter einem freien Schlüssel an und schaltet es scharf.
   */
  function datumHinzufuegen() {
    const key = naechsterFreierSchluessel(seite.felder, 'unterschriftsdatum');
    onSeiteChange({ ...seite, felder: { ...seite.felder, [key]: { ...UNTERSCHRIFTSDATUM_FELD } } });
    onArm({ bereich: 'feld', key });
  }

  /**
   * Übernimmt `patch` ins Unterschriftsdatum-Feld; ohne vorhandenes Feld passiert nichts.
   *
   * @param patch - Felder, die im Unterschriftsdatum-Feld überschrieben werden.
   */
  function datumAendern(patch: Partial<Feld>) {
    if (!datumKey || !datumFeld) return;
    onSeiteChange({ ...seite, felder: { ...seite.felder, [datumKey]: { ...datumFeld, ...patch } } });
  }

  /**
   * Entfernt das Unterschriftsdatum-Feld aus der Seite und hebt die Scharfschaltung auf, falls es scharf war.
   */
  function datumLoeschen() {
    if (!datumKey) return;
    const rest = { ...seite.felder };
    delete rest[datumKey];
    onSeiteChange({ ...seite, felder: rest });
    if (datumArmed) onArm(null);
  }

  /**
   * Legt eine neue Datentabelle unter dem eingegebenen Namen (sonst `tabelleN`) mit der ersten Zeilenquelle des Formulars an; existiert der Name schon, passiert nichts.
   */
  function tabelleAnlegen() {
    const name = neuerName.trim() || `tabelle${Object.keys(tabellen).length + 1}`;
    if (tabellen[name]) return;
    onTabellenChange({
      ...tabellen,
      [name]: { quelle: zeilenQuellen(formular)[0]?.pfad ?? '', startY: 700, maxZeilen: 10, hoehe: 14, spalten: [] },
    });
    setNeuerName('');
  }

  return (
    <div>
      <Abschnitt
        titel="Felder"
        zusatz={<span className="farbe-gedaempft">{Object.keys(seite.felder).length}</span>}
        offen
      >
        <FeldListe
          felder={seite.felder}
          formular={formular}
          tabellen={tabellen}
          armed={armed}
          onArm={onArm}
          vorschau={vorschau}
          onChange={felder => onSeiteChange({ ...seite, felder })}
        />
      </Abschnitt>

      <Abschnitt
        titel="Datentabellen"
        zusatz={<span className="farbe-gedaempft">{Object.keys(tabellen).length}</span>}
        offen
      >
        <div className="zelle-klein farbe-gedaempft luft-unten-2xs">
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
            onSonderzeileUmbenannt={(alt, neu) => onSonderzeileUmbenannt(name, alt, neu)}
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
        <DBStack direction="row" alignment="end" gap="x-small" className="feldgruppe">
          <DbFeld
            beschriftung="Name der neuen Tabelle"
            dicht
            placeholder="Name der neuen Tabelle"
            value={neuerName}
            onChange={e => setNeuerName(e.target.value)}
          />
          <DBButton type="button" variant="outlined" onClick={tabelleAnlegen}>
            + Tabelle
          </DBButton>
        </DBStack>
      </Abschnitt>

      <Abschnitt titel="Signatur & Unterschriftsdatum">
        <div className="zelle-klein fett luft-unten-2xs">Signatur-Fläche</div>
        <DBStack direction="row" gap="x-small" alignment="center">
          <ScharfButton
            aktiv={signaturAktiv}
            onClick={() => onArm(signaturAktiv ? null : { bereich: 'signaturBild' })}
          />
          <span className="zelle-klein waechst">{seite.signaturBild ? 'Fläche gesetzt' : 'nicht gesetzt'}</span>
          {seite.signaturBild && (
            <DBButton
              type="button"

              variant="outlined"
              data-color="critical"
              size="small"
              onClick={() => onSeiteChange({ ...seite, signaturBild: undefined })}
            >
              Löschen
            </DBButton>
          )}
        </DBStack>
        {seite.signaturBild && (
          <div className="raster luft-oben-2xs abstand-1">
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

        <div className="zelle-klein fett luft-oben-sm luft-unten-2xs">Unterschriftsdatum</div>
        <div className="zelle-klein farbe-gedaempft luft-unten-2xs">
          Druckt nur, wenn tatsächlich eine (nicht-digitale) Unterschrift vorliegt.
        </div>
        {datumKey && datumFeld ? (
          <>
            <DBStack direction="row" gap="x-small" alignment="center">
              <ScharfButton
                aktiv={datumArmed}
                onClick={() => onArm(datumArmed ? null : { bereich: 'feld', key: datumKey })}
                titel="Position auf dem PDF aufziehen"
              />
              <span className="zelle-klein waechst">Feld gesetzt</span>
              <DBButton
                type="button"

                variant="outlined"
                data-color="critical"
                size="small"
                onClick={datumLoeschen}
              >
                Löschen
              </DBButton>
            </DBStack>
            <DbAuswahl
              beschriftung="Datenfeld für das Unterschriftsdatum"
              dicht
              className="luft-oben-2xs"
              value={datumFeld.berechnet?.feld ?? ''}
              onChange={e =>
                datumAendern({
                  berechnet: { ...datumFeld.berechnet!, feld: e.target.value || undefined },
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
            </DbAuswahl>
            <div className="luft-oben-2xs">
              <Zellkoordinaten wert={datumFeld} onChange={datumAendern} />
            </div>
            <div className="luft-oben-2xs">
              <DarstellungsFelder wert={datumFeld} onChange={datumAendern} />
            </div>
            <DBStack direction="row" gap="x-small" alignment="center" className="luft-oben-2xs">
              <DbFeld
                beschriftung="Tage"
                dicht
                type="number"
                min="0"
                huelleStyle={{ maxWidth: '6rem' }}
                placeholder="Tage"
                value={datumFeld.berechnet?.maxTage ?? ''}
                onChange={e => {
                  const roh = (e.target as HTMLInputElement).value;
                  datumAendern({
                    berechnet: { ...datumFeld.berechnet!, maxTage: roh === '' ? undefined : Number(roh) },
                  });
                }}
              />
              <span className="zelle-klein farbe-gedaempft">Tage Frist — sonst gilt das heutige Datum.</span>
            </DBStack>
          </>
        ) : (
          <DBButton type="button" variant="outlined" size="small" onClick={datumHinzufuegen}>
            + Datum hinzufügen
          </DBButton>
        )}
      </Abschnitt>
    </div>
  );
}
