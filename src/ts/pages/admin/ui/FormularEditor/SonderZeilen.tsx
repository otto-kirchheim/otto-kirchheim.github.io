import { useState } from 'react';

import type {
  Ausrichtung,
  FormatName,
  SonderZeile,
  SonderZeileArt,
  SonderZeileZelle,
  TabellenDef,
} from '@otto-kirchheim/nebengeld-shared';
import { sonderZeileZelleWert, zeilenFuerUeber } from '@/shared/lib/pdf/wert';
import { FORMATE } from './datenKatalog';
import { WertVorschau } from './WertVorschau';
import type { Vorschau } from './FeldPanel';
import { DBButton, DBCheckbox, DBTooltip } from '@db-ux/react-core-components';
import { DbAuswahl, DbFeld } from '@/shared/ui/form/DbFeld';

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

/**
 * Name-Eingabe mit eigenem Entwurfsstand: `tabelle.sonderzeilen` ist ein `Record`, dessen Key sich beim
 * Umbenennen ändert -- ein `onChange` direkt auf den Key würde bei JEDEM Tastendruck umbenennen und
 * (weil die Karte darüber mit diesem Namen schlüsselt) das Eingabefeld neu mounten, was Fokus und
 * Cursorposition verliert. Der Entwurf lebt deshalb lokal und wird erst bei `onBlur` übernommen;
 * leere, unveränderte oder vergebene Namen springen auf den bisherigen zurück.
 *
 * @param props - Aktueller Name, bereits vergebene andere Namen (`vergeben`) und `onRename` für den übernommenen Namen.
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
 * Kopf-/Fußzeilen-Inhalt einer Tabelle (siehe `SonderZeile` in `shared`): pro Spalte ein Kreuz statt einer
 * eigenen Koordinate -- x kommt beim Rendern von der Spalte selbst (`build.ts`). Gegenstück zu
 * `ListenGruppen` (dynamische Spaltengruppen), gleiches Card-pro-Eintrag-Muster. WO eine Sonderzeile auf
 * einer Seite erscheint (auch mehrfach, z.B. Überschrift oben+unten), legt der Platzierungs-Block in
 * `TabellenBlock.tsx` fest, nicht diese Komponente. `vorschau` liefert dieselben Beispielwerte wie das
 * erzeugte PDF (siehe `Vorschau` in `feldPanelTypen.ts`).
 *
 * @param props - Tabelle samt Name, Vorschau, `onChange` für die geänderte Tabelle und `onUmbenennen` für das seitenübergreifende Umbenennen.
 */
export function SonderZeilen({ tabelle, tabelleName, vorschau, onChange, onUmbenennen }: Props) {
  const zeilen = Object.entries(tabelle.sonderzeilen ?? {});

  /**
   * Setzt oder löscht eine Sonderzeile der Tabelle; ohne verbleibende Sonderzeilen wird `sonderzeilen` entfernt.
   *
   * @param name - Name der Sonderzeile.
   * @param zeile - Neue Sonderzeile; `undefined` löscht sie.
   */
  function setzeZeile(name: string, zeile: SonderZeile | undefined): void {
    const rest = { ...(tabelle.sonderzeilen ?? {}) };
    if (zeile) rest[name] = zeile;
    else delete rest[name];
    onChange({ ...tabelle, sonderzeilen: Object.keys(rest).length > 0 ? rest : undefined });
  }

  /**
   * Legt eine leere Sonderzeile mit dem ersten freien Namen (`Sonderzeile`, `Sonderzeile 2`, ...) und dem Bezug `$alle` an.
   */
  function neueZeile(): void {
    let name = 'Sonderzeile';
    let i = 2;
    while (name in (tabelle.sonderzeilen ?? {})) name = `Sonderzeile ${i++}`;
    setzeZeile(name, { ueber: '$alle', zellen: [] });
  }

  // Umbenennen läuft eine Ebene höher (`onUmbenennen`): dabei wandert nicht nur der Key in
  // `tabelle.sonderzeilen`, sondern auch jede Platzierung (`TabellenBereich.sonderzeilen[].name`) auf JEDER
  // Seite -- sonst zeigen die Platzierungen nach dem Umbenennen ins Leere.

  /**
   * Ersetzt die Zelle einer Spalte innerhalb einer Sonderzeile oder entfernt sie.
   *
   * @param name - Name der Sonderzeile.
   * @param zeile - Bisherige Sonderzeile.
   * @param spaltenIndex - Index der Spalte, deren Zelle ersetzt wird.
   * @param zelle - Neue Zelle; `undefined` entfernt sie.
   */
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
