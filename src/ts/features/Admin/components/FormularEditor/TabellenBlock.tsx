import type { Spalte, SeitenDef, TabellenBereich, TabellenDef, Zeile } from '@otto-kirchheim/nebengeld-shared';
import { berechneteEintraege } from './aggregationsHelfer';
import { katalogZeilenFelder, werteAuswahl, ZEILEN_QUELLEN, type FormularCode } from './datenKatalog';
import { Abschnitt, ScharfButton, ZahlFeld } from './feldPanelGemeinsam';
import { istGleich } from './feldPanelHelfer';
import type { Armed, Vorschau } from './feldPanelTypen';
import { ListenGruppen } from './ListenGruppen';
import { SonderZeilen } from './SonderZeilen';
import { UEBER_OPTIONEN } from './sonderZeilenOptionen';
import { SpalteZeile } from './SpalteZeile';
import { WertVorschau } from './WertVorschau';
import { sonderZeileZelleWert, zeilenFuerUeber } from '@/shared/lib/pdf/wert';
import { DBButton, DBCheckbox, DBTooltip } from '@db-ux/react-core-components';
import { DbAuswahl, DbFeld } from '@/components';

/**
 * Schlüssel für eine neu angelegte Spalte, ohne eine bestehende Spalte derselben Tabelle zu überschreiben.
 * Sonst bekäme eine zweite frische Spalte denselben Default-Schlüssel (immer `zeilenFelder[0]?.pfad`) und
 * würde in Bedingungen/Summen die erste stillschweigend verdrängen (`mitBerechnetenSpalten()` in
 * `shared/lib/pdf/tabellenZeilen.ts`: gleicher Schlüssel = überschrieben).
 *
 * @param basis - Wunschschlüssel.
 * @param spalten - Bestehende Spalten der Tabelle.
 * @returns `basis`, falls frei, sonst `basis` mit Zähler ab 2.
 */
function eindeutigerSpaltenSchluessel(basis: string, spalten: Spalte[]): string {
  if (!spalten.some(sp => sp.key === basis)) return basis;
  let n = 2;
  while (spalten.some(sp => sp.key === `${basis}${n}`)) n++;
  return `${basis}${n}`;
}

/**
 * Eine Datentabelle: Quelle, Filter, Platz auf DIESER Seite und ihre Spalten.
 *
 * @param props - Tabelle mit Name, aktuelle Seite, Formular, Scharfschalt-Zustand (`armed`), Vorschau und Callbacks (Ändern, Löschen, Von-Seite-Entfernen, Sonderzeile-Umbenennen).
 */
export function TabellenBlock({
  name,
  tabelle,
  seite,
  onSeiteChange,
  formular,
  armed,
  onArm,
  onChange,
  onDelete,
  onVonSeiteEntfernen,
  vorschau,
  onSonderzeileUmbenannt,
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
  onVonSeiteEntfernen: () => void;
  vorschau: Vorschau;
  onSonderzeileUmbenannt: (alt: string, neu: string) => void;
}) {
  const zeilenFelder = katalogZeilenFelder(formular, tabelle.quelle);
  // Bereits konfigurierte berechnete UND Ankreuz-Spalten dieser Tabelle: der Renderer trägt ihren Wert (Rechen-
  // ergebnis bzw. gedrucktes Zeichen, sonst leer) schon unter `key` in die Zeile ein (`mitBerechnetenSpalten()`
  // in `shared/lib/pdf/tabellenZeilen.ts`), eine Ankreuz-Bedingung kann sie also per `feld` direkt
  // wiederverwenden. Bewusst aus `tabelle.spalten`, nicht aus dem seitenspezifischen `spalten` unten:
  // `mitBerechnetenSpalten()` kennt nur die Tabellen-Spalten, eine NUR auf einer Seite gesetzte Spalte würde
  // nie befüllt.
  const andereBerechnete = berechneteEintraege(tabelle.spalten, 'Berechnete/Ankreuz-Spalten dieser Tabelle');
  // Erste Beispielzeile dieser Tabelle -- der Filter ist darin schon angewandt.
  const beispielZeile: Zeile = vorschau.kontext.$alle[name]?.[0] ?? {};
  const bereich = seite.bereiche.find(b => b.tabelle === name);
  const aktiv = istGleich(armed, { bereich: 'tabelle', tabelle: name });
  const letzteAktiv = istGleich(armed, { bereich: 'letzteZeile', tabelle: name });
  const filterWerte = tabelle.filter ? werteAuswahl(tabelle.filter.feld) : [];

  /**
   * Setzt Felder im Bereich dieser Tabelle auf der aktuellen Seite und legt den Bereich an, falls er fehlt.
   *
   * @param next - Zu überschreibende Felder des Seitenbereichs.
   */
  function setzeBereich(
    next: Partial<Pick<TabellenBereich, 'startY' | 'maxZeilen' | 'spalten' | 'hoehe' | 'sonderzeilen'>>,
  ) {
    const bestehend: TabellenBereich = bereich ?? { tabelle: name };
    const ersetzt = { ...bestehend, ...next };
    onSeiteChange({
      ...seite,
      bereiche: bereich ? seite.bereiche.map(b => (b.tabelle === name ? ersetzt : b)) : [...seite.bereiche, ersetzt],
    });
  }

  // Spalten kommen entweder aus der Tabelle (gelten dann für alle Seiten) oder aus diesem
  // Seitenbereich -- Bereitschaft und ähnliche Formulare haben je Seite ein anderes Raster.
  const eigeneSpalten = bereich?.spalten !== undefined;
  const spalten = bereich && bereich.spalten ? bereich.spalten : tabelle.spalten;

  /**
   * Speichert die Spalten im Seitenbereich (bei „eigene je Seite") oder in der Tabelle.
   *
   * @param next - Neue Spaltenliste.
   */
  function setzeSpalten(next: Spalte[]) {
    if (eigeneSpalten) setzeBereich({ spalten: next });
    else onChange({ ...tabelle, spalten: next });
  }

  // startY, Höhe und Zeilen bilden EINE Gruppe ("Datenzeile"): entweder kommen alle drei aus der
  // Tabelle (alle Seiten identisch), oder diese Seite hat für alle drei einen eigenen Wert --
  // signalisiert einheitlich über `startY`, da die Checkbox unten immer alle drei zusammen setzt
  // bzw. zurücksetzt.
  const eigenePlatzierung = bereich?.startY !== undefined;
  const startY = bereich?.startY ?? tabelle.startY;
  const zeilenHoehe = bereich?.hoehe ?? tabelle.hoehe;
  const maxZeilen = bereich?.maxZeilen ?? tabelle.maxZeilen;

  /**
   * Setzt `startY` im Seitenbereich (bei eigener Platzierung) oder in der Tabelle.
   *
   * @param next - Neue Startposition (`startY`) in PDF-Punkten.
   */
  function setzeStartY(next: number) {
    if (eigenePlatzierung) setzeBereich({ startY: next });
    else onChange({ ...tabelle, startY: next });
  }
  /**
   * Setzt die Zeilenhöhe im Seitenbereich (bei eigener Platzierung) oder in der Tabelle.
   *
   * @param next - Neue Zeilenhöhe in PDF-Punkten.
   */
  function setzeZeilenHoehe(next: number) {
    if (eigenePlatzierung) setzeBereich({ hoehe: next });
    else onChange({ ...tabelle, hoehe: next });
  }
  /**
   * Setzt die maximale Zeilenzahl im Seitenbereich (bei eigener Platzierung) oder in der Tabelle.
   *
   * @param next - Neue Zeilenzahl.
   */
  function setzeMaxZeilen(next: number) {
    if (eigenePlatzierung) setzeBereich({ maxZeilen: next });
    else onChange({ ...tabelle, maxZeilen: next });
  }

  return (
    <div className="border p-2 mb-2 bg-body-tertiary">
      <div className="d-flex align-items-center gap-1 mb-1">
        <span className="fw-semibold small flex-grow-1">Tabelle „{name}"</span>
        {bereich && (
          <DBButton
            type="button"
            className="py-0"
            variant="outlined"
            size="small"
            icon="unlink_chain"
            noText
            onClick={onVonSeiteEntfernen}
          >
            <DBTooltip>Von dieser Seite entfernen (Tabelle bleibt auf anderen Seiten erhalten)</DBTooltip>
          </DBButton>
        )}
        <DBButton
          type="button"
          className="py-0"
          variant="outlined"
          data-color="critical"
          size="small"
          icon="bin"
          noText
          onClick={onDelete}
        >
          <DBTooltip>Tabelle löschen (aus dem ganzen Dokument)</DBTooltip>
        </DBButton>
      </div>

      <div className="raster mb-1 abstand-1">
        <div className="sp-7">
          <DbAuswahl
            beschriftung="Zeilenquelle"
            dicht
            value={tabelle.quelle}
            onChange={e => onChange({ ...tabelle, quelle: e.target.value })}
          >
            {ZEILEN_QUELLEN[formular].map(q => (
              <option key={q.pfad} value={q.pfad}>
                {q.label}
              </option>
            ))}
          </DbAuswahl>
        </div>
        <div className="sp-5">
          <div>
            <DBCheckbox
              size="small"
              label="Nur bestimmte Zeilen"
              checked={Boolean(tabelle.filter)}
              onChange={e =>
                onChange({
                  ...tabelle,
                  filter: (e.target as HTMLInputElement).checked
                    ? { feld: zeilenFelder[0]?.pfad ?? '', werte: [] }
                    : undefined,
                })
              }
            />
          </div>
        </div>
      </div>

      {tabelle.filter && (
        <div className="mb-1 ps-2 border-start">
          <DbAuswahl
            beschriftung="Filterfeld"
            dicht
            className="mb-1"
            value={tabelle.filter.feld}
            onChange={e => onChange({ ...tabelle, filter: { feld: e.target.value, werte: [] } })}
          >
            {zeilenFelder.map(f => (
              <option key={f.pfad} value={f.pfad}>
                {f.label}
              </option>
            ))}
          </DbAuswahl>
          {filterWerte.length > 0 ? (
            <div className="d-flex flex-wrap gap-2">
              {filterWerte.map(wert => (
                <div key={wert}>
                  <DBCheckbox
                    size="small"
                    label={String(wert)}
                    checked={tabelle.filter!.werte.includes(wert)}
                    onChange={e => {
                      const an = (e.target as HTMLInputElement).checked;
                      const werte = an
                        ? [...tabelle.filter!.werte, wert]
                        : tabelle.filter!.werte.filter(w => w !== wert);
                      onChange({ ...tabelle, filter: { ...tabelle.filter!, werte } });
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <DbFeld
              beschriftung="Werte, durch Komma getrennt"
              dicht
              feldKlasse="font-monospace"
              placeholder="Werte, durch Komma getrennt"
              value={tabelle.filter.werte.join(', ')}
              onChange={e =>
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

      <div className="d-flex align-items-center gap-2 mb-1">
        <ScharfButton
          aktiv={aktiv}
          onClick={() => onArm(aktiv ? null : { bereich: 'tabelle', tabelle: name })}
          titel="Auf dem PDF die erste Datenzeile dieser Tabelle markieren — setzt Startposition und Zeilenhöhe"
        />
        <span className="small">erste Datenzeile auf dieser Seite</span>
      </div>
      {bereich && maxZeilen > 1 && (
        <div className="d-flex align-items-center gap-2 mb-1">
          <ScharfButton
            aktiv={letzteAktiv}
            onClick={() => onArm(letzteAktiv ? null : { bereich: 'letzteZeile', tabelle: name })}
            titel="Letzte Datenzeile markieren — daraus wird die Zeilenhöhe über alle Zeilen gemittelt"
          />
          <span className="small">
            letzte Datenzeile <span className="text-body-secondary">— misst die Höhe genauer</span>
          </span>
        </div>
      )}
      <div className="d-flex align-items-center gap-2 mb-1">
        <span className="small fw-semibold flex-grow-1">Datenzeile {eigenePlatzierung ? '(nur diese Seite)' : ''}</span>
        {bereich && (
          <div className="mb-0">
            <DBCheckbox
              size="small"
              label="eigene je Seite"
              checked={eigenePlatzierung}
              title="Eigene Startposition/Höhe/Zeilenzahl nur für diese Seite — beim Einschalten gelten zunächst die bisherigen Werte, beim Ausschalten wieder die der Tabelle"
              onChange={e => {
                const an = (e.target as HTMLInputElement).checked;
                setzeBereich({
                  startY: an ? startY : undefined,
                  hoehe: an ? zeilenHoehe : undefined,
                  maxZeilen: an ? maxZeilen : undefined,
                });
              }}
            />
          </div>
        )}
      </div>
      <div className="raster mb-1 align-items-end abstand-1">
        <ZahlFeld label="startY" wert={startY} onChange={v => setzeStartY(v ?? 0)} />
        <ZahlFeld label="Höhe" wert={zeilenHoehe} min={0.1} onChange={v => setzeZeilenHoehe(v ?? 1)} />
        <ZahlFeld label="Zeilen" wert={maxZeilen} ganzzahl min={1} onChange={v => setzeMaxZeilen(v ?? 1)} />
      </div>
      {!bereich && (
        <div className="d-flex align-items-center gap-2 mb-2">
          <div className="small text-body-secondary flex-grow-1">
            Auf dieser Seite noch kein Platz — Startposition setzen, um sie hier zu zeigen.
          </div>
          <DBButton
            type="button"
            variant="outlined"
            data-size="small"
            onClick={() => onSeiteChange({ ...seite, bereiche: [...seite.bereiche, { tabelle: name }] })}
            title="Übernimmt Startposition, Höhe und Zeilenzahl unverändert von der Tabelle -- z.B. wenn nur die Spalten dieser Seite abweichen"
          >
            Mit Werten der Tabelle platzieren
          </DBButton>
        </div>
      )}

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
          onChange({
            ...tabelle,
            listen: { ...(tabelle.listen ?? {}), [name]: gruppe },
            spalten: [...tabelle.spalten, ...neue],
          });
        }}
      />

      <Abschnitt
        titel="Sonderzeilen"
        zusatz={<span className="text-body-secondary">{Object.keys(tabelle.sonderzeilen ?? {}).length}</span>}
      >
        <SonderZeilen
          tabelle={tabelle}
          tabelleName={name}
          vorschau={vorschau}
          onChange={onChange}
          onUmbenennen={onSonderzeileUmbenannt}
        />

        {bereich && Object.keys(tabelle.sonderzeilen ?? {}).length > 0 && (
          <div className="mb-1">
            <div className="small fw-semibold mb-1">Sonderzeilen auf dieser Seite</div>
            {Object.keys(tabelle.sonderzeilen ?? {}).map(sonderName => {
              const platzierungen = bereich.sonderzeilen ?? [];
              const indizes = platzierungen.map((_, i) => i).filter(i => platzierungen[i]!.name === sonderName);
              const sonderzeile = tabelle.sonderzeilen![sonderName]!;
              const standardUeber = sonderzeile.ueber ?? '$alle';
              return (
                <div key={sonderName} className="mb-1">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="small flex-grow-1">{sonderName}</span>
                    <DBButton
                      type="button"
                      className="py-0"
                      variant="outlined"
                      size="small"
                      title="Diese Sonderzeile an einer weiteren Position platzieren (z.B. Überschrift oben UND als Kopie unten)"
                      onClick={() =>
                        setzeBereich({
                          sonderzeilen: [...platzierungen, { name: sonderName, y: startY, ueber: standardUeber }],
                        })
                      }
                    >
                      + Platzieren
                    </DBButton>
                  </div>
                  {indizes.map(i => {
                    const platz = platzierungen[i]!;
                    const zeilenAktiv = istGleich(armed, { bereich: 'sonderzeile', tabelle: name, index: i });
                    // Zeilenbezug DIESER Platzierung -- die Vorschau rechnet mit dem Kontext der gerade
                    // angezeigten Seite, so ist der Unterschied zwischen den Seiten direkt sichtbar.
                    const effektiv = platz.ueber ?? standardUeber;
                    const rows = zeilenFuerUeber(effektiv, name, vorschau.kontext);
                    const vorschauText = sonderzeile.zellen
                      .map(z => {
                        const sp = spalten[z.spaltenIndex];
                        return sp ? sonderZeileZelleWert(z, sp, name, rows, vorschau.daten, vorschau.kontext) : '';
                      })
                      .filter(Boolean)
                      .join('   |   ');
                    return (
                      <div key={i} className="border p-2 mb-1 bg-body">
                        <div className="d-flex align-items-end gap-1 mb-1 flex-wrap">
                          <ScharfButton
                            aktiv={zeilenAktiv}
                            onClick={() =>
                              onArm(zeilenAktiv ? null : { bereich: 'sonderzeile', tabelle: name, index: i })
                            }
                            titel="Band über diese Zeile auf dem PDF ziehen -- setzt y/y2"
                          />
                          <ZahlFeld
                            label="y"
                            wert={platz.y}
                            onChange={v =>
                              setzeBereich({
                                sonderzeilen: platzierungen.map((p, ii) => (ii === i ? { ...p, y: v ?? 0 } : p)),
                              })
                            }
                          />
                          <ZahlFeld
                            label="y2"
                            wert={platz.y2}
                            onChange={v =>
                              setzeBereich({
                                sonderzeilen: platzierungen.map((p, ii) => (ii === i ? { ...p, y2: v } : p)),
                              })
                            }
                          />
                          <div className="flex-grow-1" style={{ minWidth: '11rem' }}>
                            <DbAuswahl
                              beschriftung="Zeilenbezug (nur diese Seite)"
                              dicht
                              title="Welche Zeilen die Summe dieser Platzierung erfasst -- z.B. erste Seite Gesamtsumme, Folgeseiten nur diese Seite"
                              value={effektiv}
                              onChange={e =>
                                setzeBereich({
                                  sonderzeilen: platzierungen.map((p, ii) =>
                                    ii === i ? { ...p, ueber: (e.target as HTMLSelectElement).value } : p,
                                  ),
                                })
                              }
                            >
                              {UEBER_OPTIONEN.map(o => (
                                <option key={o.wert} value={o.wert}>
                                  {o.label}
                                </option>
                              ))}
                            </DbAuswahl>
                          </div>
                          <DBButton
                            type="button"
                            className="py-0"
                            variant="outlined"
                            data-color="critical"
                            size="small"
                            icon="bin"
                            noText
                            onClick={() => setzeBereich({ sonderzeilen: platzierungen.filter((_, ii) => ii !== i) })}
                          >
                            <DBTooltip>Diese Platzierung entfernen</DBTooltip>
                          </DBButton>
                        </div>
                        <WertVorschau text={vorschauText} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </Abschnitt>

      <Abschnitt
        titel={`Spalten${eigeneSpalten ? ' (nur diese Seite)' : ''}`}
        zusatz={<span className="text-body-secondary">{spalten.length}</span>}
        offen
      >
        {bereich && (
          <DBCheckbox
            className="mb-1"
            size="small"
            label="eigene je Seite"
            checked={eigeneSpalten}
            title="Eigenes Spaltenraster nur für diese Seite — beim Einschalten werden die Spalten der Tabelle als Ausgangspunkt kopiert, beim Ausschalten gelten wieder die der Tabelle"
            onChange={e =>
              setzeBereich({
                spalten: (e.target as HTMLInputElement).checked ? structuredClone(spalten) : undefined,
              })
            }
          />
        )}
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
            onArm={() =>
              onArm(
                istGleich(armed, { bereich: 'spalte', tabelle: name, index })
                  ? null
                  : { bereich: 'spalte', tabelle: name, index },
              )
            }
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
        <DBButton
          type="button"
          variant="outlined"
          data-size="small"
          onClick={() =>
            setzeSpalten([
              ...spalten,
              {
                key: eindeutigerSpaltenSchluessel(zeilenFelder[0]?.pfad || 'feld', spalten),
                x: 50,
                size: 10,
                align: 'zentriert',
              },
            ])
          }
        >
          + Spalte
        </DBButton>
      </Abschnitt>
    </div>
  );
}
