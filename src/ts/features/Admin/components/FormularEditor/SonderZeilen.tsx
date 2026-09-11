import { useState } from 'react';

import type {
  Ausrichtung,
  FormatName,
  SonderZeile,
  SonderZeileArt,
  SonderZeileZelle,
  TabellenDef,
} from '@otto-kirchheim/nebengeld-shared';
import { sonderZeileZelleWert, zeilenFuerUeber } from '@/infrastructure/pdf/wert';
import { FORMATE } from './datenKatalog';
import { WertVorschau } from './WertVorschau';
import type { Vorschau } from './FeldPanel';
import { DBButton, DBCheckbox, DBTooltip } from '@db-ux/react-core-components';
import { DbAuswahl, DbFeld } from '@/components';

type Props = {
  tabelle: TabellenDef;
  tabelleName: string;
  vorschau: Vorschau;
  onChange: (tabelle: TabellenDef) => void;
  /** Umbenennen inkl. aller Platzierungen auf allen Seiten (siehe `feldPanelTypen.ts`). */
  onUmbenennen: (alt: string, neu: string) => void;
};

const ARTEN: { wert: SonderZeileArt; label: string; nurListenPlatz?: boolean }[] = [
  { wert: 'kopf', label: 'Überschrift' },
  { wert: 'summe', label: 'Summe' },
  { wert: 'bereinigt', label: 'bereinigte Summe (Std.)', nurListenPlatz: true },
  { wert: 'summeGeld', label: 'Summe (€)', nurListenPlatz: true },
];

export const UEBER_OPTIONEN = [
  { wert: '$alle', label: 'alle Zeilen (Gesamtsumme)' },
  { wert: '$seite', label: 'nur diese Seite' },
  { wert: '$bisher', label: 'alle Vorseiten (Übertrag)' },
  { wert: '$laufend', label: 'bis hierher (Übertrag + diese Seite)' },
];

/**
 * Name-Eingabe mit eigenem Entwurfsstand: `tabelle.sonderzeilen` ist ein `Record`, dessen Key sich
 * beim Umbenennen ändert -- ein `onChange`/`onInput` direkt auf den Record-Key würde bei JEDEM
 * Tastendruck umbenennen und (weil die Karte darüber mit diesem Namen schlüsselt) das Eingabefeld
 * neu mounten, was Fokus/Cursor-Position verliert. Der Entwurf lebt deshalb lokal und wird erst bei
 * `onBlur` übernommen -- ungültige oder leere Eingaben springen zurück auf den bisherigen Namen.
 */
function SonderZeileName({
  name,
  vergeben,
  onRename,
}: {
  name: string;
  vergeben: string[];
  onRename: (neuerName: string) => void;
}) {
  const [entwurf, setEntwurf] = useState(name);
  return (
    <DbFeld
      beschriftung="Name der Sonderzeile"
      dicht
      className="flex-grow-1"
      feldKlasse="fw-semibold"
      value={entwurf}
      onChange={e => setEntwurf(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      onBlur={() => {
        const naechster = entwurf.trim();
        if (naechster && naechster !== name && !vergeben.includes(naechster)) onRename(naechster);
        else setEntwurf(name);
      }}
    />
  );
}

/**
 * Kopf-/Fußzeilen-Inhalt einer Tabelle (siehe `SonderZeile` in `shared`): pro Spalte ein Kreuz statt
 * einer eigenen Koordinate -- x kommt beim Rendern von der Spalte selbst (`build.ts`). Gegenstück zu
 * `ListenGruppen` (dynamische Spaltengruppen), gleiches Card-pro-Eintrag-Muster. WO eine Sonderzeile
 * auf einer Seite erscheint (auch mehrfach, z.B. Überschrift oben+unten), legt der Platzierungs-Block
 * in `FeldPanel.tsx`s `TabellenBlock` fest, nicht diese Komponente. `vorschau` liefert dieselben
 * Beispielwerte, die auch das erzeugte PDF zeigen würde (siehe `Vorschau` in `FeldPanel.tsx`).
 */
export function SonderZeilen({ tabelle, tabelleName, vorschau, onChange, onUmbenennen }: Props) {
  const zeilen = Object.entries(tabelle.sonderzeilen ?? {});

  function setzeZeile(name: string, zeile: SonderZeile | undefined): void {
    const rest = { ...(tabelle.sonderzeilen ?? {}) };
    if (zeile) rest[name] = zeile;
    else delete rest[name];
    onChange({ ...tabelle, sonderzeilen: Object.keys(rest).length > 0 ? rest : undefined });
  }

  function neueZeile(): void {
    let name = 'Sonderzeile';
    let i = 2;
    while (name in (tabelle.sonderzeilen ?? {})) name = `Sonderzeile ${i++}`;
    setzeZeile(name, { ueber: '$alle', zellen: [] });
  }

  // Umbenennen läuft eine Ebene höher (`onUmbenennen`), weil dabei nicht nur der Key in
  // `tabelle.sonderzeilen` wandert, sondern auch jede Platzierung
  // (`TabellenBereich.sonderzeilen[].name`) auf JEDER Seite -- sonst zeigen die Platzierungen
  // nach dem Umbenennen ins Leere.

  function setzeZelle(
    name: string,
    zeile: SonderZeile,
    spaltenIndex: number,
    zelle: SonderZeileZelle | undefined,
  ): void {
    const restZellen = zeile.zellen.filter(z => z.spaltenIndex !== spaltenIndex);
    setzeZeile(name, { ...zeile, zellen: zelle ? [...restZellen, zelle] : restZellen });
  }

  return (
    <div className="mb-2">
      <div className="d-flex align-items-center gap-1 mb-1">
        <span className="small fw-semibold flex-grow-1">Sonderzeilen (Überschrift/Summe über mehrere Spalten)</span>
      </div>

      {zeilen.map(([name, zeile], zeileIndex) => {
        // Kartenvorschau immer über alle Zeilen -- der tatsächliche Zeilenbezug ist je Seite/
        // Platzierung verschieden (`TabellenBereich.sonderzeilen[].ueber`) und wird dort angezeigt.
        const rows = zeilenFuerUeber('$alle', tabelleName, vorschau.kontext);
        return (
          <div key={zeileIndex} className="border p-2 mb-1 bg-body">
            <div className="d-flex align-items-center gap-1 mb-1">
              <SonderZeileName
                name={name}
                vergeben={zeilen.map(([n]) => n).filter(n => n !== name)}
                onRename={neuerName => onUmbenennen(name, neuerName)}
              />
              <DBButton
                type="button"
                className="py-0"
                variant="outlined"
                data-color="critical"
                size="small"
                icon="bin"
                noText
                onClick={() => setzeZeile(name, undefined)}
              >
                <DBTooltip>Sonderzeile löschen</DBTooltip>
              </DBButton>
            </div>

            <div className="small text-body-secondary mb-1">
              Hier steht nur, WAS die Sonderzeile zeigt. WO sie auf einer Seite sitzt und welcher Zeilenbezug
              ($alle/$seite/…) dort gilt, legt „Sonderzeilen auf dieser Seite“ je Seite fest. Die Vorschau unten rechnet
              mit „alle Zeilen“.
            </div>

            {tabelle.spalten.map((spalte, index) => {
              const zelle = zeile.zellen.find(z => z.spaltenIndex === index);
              const arten = spalte.listenPlatz ? ARTEN : ARTEN.filter(a => !a.nurListenPlatz);
              const bezeichnung = spalte.label ?? (spalte.key || `Spalte ${index + 1}`);
              const vorschauText = zelle
                ? sonderZeileZelleWert(zelle, spalte, tabelleName, rows, vorschau.daten, vorschau.kontext)
                : undefined;
              return (
                <div key={index} className="raster mb-1 align-items-center abstand-1">
                  {/* Was: welche Spalte, welcher Wert. */}
                  <div className="sp-4 small text-truncate" title={bezeichnung}>
                    {bezeichnung}
                  </div>
                  <div className="sp-8">
                    <DbAuswahl
                      beschriftung={`Art der Zelle: ${bezeichnung}`}
                      dicht
                      value={zelle?.art ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        setzeZelle(
                          name,
                          zeile,
                          index,
                          v ? { spaltenIndex: index, art: v as SonderZeileArt, format: zelle?.format } : undefined,
                        );
                      }}
                    >
                      <option value="">kein Wert</option>
                      {arten.map(a => (
                        <option key={a.wert} value={a.wert}>
                          {a.label}
                        </option>
                      ))}
                    </DbAuswahl>
                  </div>

                  {zelle && (
                    <>
                      {/* Format: wie der Wert dieser Zelle angezeigt wird. */}
                      <div className="mt-1">
                        <DbAuswahl
                          beschriftung="Format dieser Zelle -- ohne Auswahl gilt das Format der Spalte"
                          dicht
                          title="Format dieser Zelle -- ohne Auswahl gilt das Format der Spalte"
                          value={zelle.format ?? ''}
                          onChange={e =>
                            setzeZelle(name, zeile, index, {
                              ...zelle,
                              format: ((e.target as HTMLSelectElement).value || undefined) as FormatName | undefined,
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

                      {/* Schrift: Größe direkt neben Fett/Kursiv/Unterstrichen. */}
                      <div className="sp-3 mt-1">
                        <DbFeld
                          beschriftung="Schriftgröße dieser Zelle -- ohne Angabe gilt die Größe der Spalte"
                          dicht
                          type="number"
                          title="Schriftgröße dieser Zelle -- ohne Angabe gilt die Größe der Spalte"
                          placeholder={`Größe (Spalte: ${spalte.size})`}
                          value={zelle.size ?? ''}
                          onChange={e => {
                            const v = (e.target as HTMLInputElement).value;
                            setzeZelle(name, zeile, index, { ...zelle, size: v === '' ? undefined : Number(v) });
                          }}
                        />
                      </div>
                      <div className="sp-3 mt-1 mb-0">
                        <DBCheckbox
                          size="small"
                          label="Fett"
                          checked={Boolean(zelle.fett)}
                          onChange={e =>
                            setzeZelle(name, zeile, index, {
                              ...zelle,
                              fett: (e.target as HTMLInputElement).checked || undefined,
                            })
                          }
                        />
                      </div>
                      <div className="sp-3 mt-1 mb-0">
                        <DBCheckbox
                          size="small"
                          label="Kursiv"
                          checked={Boolean(zelle.kursiv)}
                          onChange={e =>
                            setzeZelle(name, zeile, index, {
                              ...zelle,
                              kursiv: (e.target as HTMLInputElement).checked || undefined,
                            })
                          }
                        />
                      </div>
                      <div className="sp-3 mt-1 mb-0">
                        <DBCheckbox
                          size="small"
                          label="Unterstr."
                          checked={Boolean(zelle.unterstrichen)}
                          onChange={e =>
                            setzeZelle(name, zeile, index, {
                              ...zelle,
                              unterstrichen: (e.target as HTMLInputElement).checked || undefined,
                            })
                          }
                        />
                      </div>

                      {/* Verhalten: Ausrichtung und Auto-Verkleinerung steuern beide, wie der Text in die Zelle passt. */}
                      <div className="sp-8 mt-1">
                        <DbAuswahl
                          beschriftung="Ausrichtung dieser Zelle -- ohne Auswahl gilt die Ausrichtung der Spalte"
                          dicht
                          title="Ausrichtung dieser Zelle -- ohne Auswahl gilt die Ausrichtung der Spalte"
                          value={zelle.align ?? ''}
                          onChange={e =>
                            setzeZelle(name, zeile, index, {
                              ...zelle,
                              align: ((e.target as HTMLSelectElement).value || undefined) as Ausrichtung | undefined,
                            })
                          }
                        >
                          <option value="">wie Spalte</option>
                          <option value="links">links</option>
                          <option value="zentriert">zentriert</option>
                          <option value="rechts">rechts</option>
                        </DbAuswahl>
                      </div>
                      <div className="sp-4 mt-1 mb-0">
                        <DBCheckbox
                          size="small"
                          label="auto. verkleinern"
                          checked={Boolean(zelle.autoGroesse)}
                          onChange={e =>
                            setzeZelle(name, zeile, index, {
                              ...zelle,
                              autoGroesse: (e.target as HTMLInputElement).checked || undefined,
                            })
                          }
                        />
                      </div>
                    </>
                  )}
                  {zelle && (
                    <div>
                      <WertVorschau text={vorschauText ?? ''} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      <DBButton type="button" variant="outlined" size="small" onClick={neueZeile}>
        + Sonderzeile
      </DBButton>
    </div>
  );
}
