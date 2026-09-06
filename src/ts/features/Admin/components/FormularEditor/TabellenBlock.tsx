import type { Spalte, SeitenDef, TabellenBereich, TabellenDef, Zeile } from '@otto-kirchheim/nebengeld-shared';
import { berechneteEintraege } from './aggregationUndRechnung';
import { katalogZeilenFelder, werteAuswahl, ZEILEN_QUELLEN, type FormularCode } from './datenKatalog';
import { ScharfButton, ZahlFeld, istGleich } from './feldPanelGemeinsam';
import type { Armed, Vorschau } from './feldPanelTypen';
import { ListenGruppen } from './ListenGruppen';
import { SonderZeilen } from './SonderZeilen';
import { SpalteZeile } from './SpalteZeile';

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

  function setzeStartY(next: number) {
    if (eigenePlatzierung) setzeBereich({ startY: next });
    else onChange({ ...tabelle, startY: next });
  }
  function setzeZeilenHoehe(next: number) {
    if (eigenePlatzierung) setzeBereich({ hoehe: next });
    else onChange({ ...tabelle, hoehe: next });
  }
  function setzeMaxZeilen(next: number) {
    if (eigenePlatzierung) setzeBereich({ maxZeilen: next });
    else onChange({ ...tabelle, maxZeilen: next });
  }

  return (
    <div className="border rounded p-2 mb-2 bg-body-tertiary">
      <div className="d-flex align-items-center gap-1 mb-1">
        <span className="fw-semibold small flex-grow-1">Tabelle „{name}"</span>
        {bereich && (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary py-0"
            onClick={onVonSeiteEntfernen}
            title="Von dieser Seite entfernen (Tabelle bleibt auf anderen Seiten erhalten)"
          >
            <span className="db-icon db-font-size-xs" data-icon="unlink_chain" style={{ verticalAlign: 'middle' }} />
          </button>
        )}
        <button
          type="button"
          className="btn btn-sm btn-outline-danger py-0"
          onClick={onDelete}
          title="Tabelle löschen (aus dem ganzen Dokument)"
        >
          <span className="db-icon db-font-size-xs" data-icon="bin" style={{ verticalAlign: 'middle' }} />
        </button>
      </div>

      <div className="row g-1 mb-1">
        <div className="col-7">
          <select
            className="form-select form-select-sm"
            value={tabelle.quelle}
            onChange={e => onChange({ ...tabelle, quelle: (e.target as HTMLSelectElement).value })}
          >
            {ZEILEN_QUELLEN[formular].map(q => (
              <option key={q.pfad} value={q.pfad}>
                {q.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-5">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
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
            <label className="form-check-label small">Nur bestimmte Zeilen</label>
          </div>
        </div>
      </div>

      {tabelle.filter && (
        <div className="mb-1 ps-2 border-start">
          <select
            className="form-select form-select-sm mb-1"
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
            <div className="d-flex flex-wrap gap-2">
              {filterWerte.map(wert => (
                <div key={wert} className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={tabelle.filter!.werte.includes(wert)}
                    onChange={e => {
                      const an = (e.target as HTMLInputElement).checked;
                      const werte = an
                        ? [...tabelle.filter!.werte, wert]
                        : tabelle.filter!.werte.filter(w => w !== wert);
                      onChange({ ...tabelle, filter: { ...tabelle.filter!, werte } });
                    }}
                  />
                  <label className="form-check-label small">{wert}</label>
                </div>
              ))}
            </div>
          ) : (
            <input
              className="form-control form-control-sm font-monospace"
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
          <div className="form-check mb-0">
            <input
              className="form-check-input"
              type="checkbox"
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
            <label className="form-check-label small">eigene je Seite</label>
          </div>
        )}
      </div>
      <div className="row g-1 mb-1 align-items-end">
        <ZahlFeld label="startY" wert={startY} onChange={v => setzeStartY(v ?? 0)} />
        <ZahlFeld label="Höhe" wert={zeilenHoehe} min={0.1} onChange={v => setzeZeilenHoehe(v ?? 1)} />
        <ZahlFeld label="Zeilen" wert={maxZeilen} ganzzahl min={1} onChange={v => setzeMaxZeilen(v ?? 1)} />
      </div>
      {!bereich && (
        <div className="d-flex align-items-center gap-2 mb-2">
          <div className="small text-body-secondary flex-grow-1">
            Auf dieser Seite noch kein Platz — Startposition setzen, um sie hier zu zeigen.
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => onSeiteChange({ ...seite, bereiche: [...seite.bereiche, { tabelle: name }] })}
            title="Übernimmt Startposition, Höhe und Zeilenzahl unverändert von der Tabelle -- z.B. wenn nur die Spalten dieser Seite abweichen"
          >
            Mit Werten der Tabelle platzieren
          </button>
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

      <SonderZeilen tabelle={tabelle} tabelleName={name} vorschau={vorschau} onChange={onChange} />

      {bereich && Object.keys(tabelle.sonderzeilen ?? {}).length > 0 && (
        <div className="mb-1">
          <div className="small fw-semibold mb-1">Sonderzeilen auf dieser Seite</div>
          {Object.keys(tabelle.sonderzeilen ?? {}).map(sonderName => {
            const platzierungen = bereich.sonderzeilen ?? [];
            const indizes = platzierungen.map((_, i) => i).filter(i => platzierungen[i]!.name === sonderName);
            return (
              <div key={sonderName} className="mb-1">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="small flex-grow-1">{sonderName}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-0"
                    title="Diese Sonderzeile an einer weiteren Position platzieren (z.B. Überschrift oben UND als Kopie unten)"
                    onClick={() => setzeBereich({ sonderzeilen: [...platzierungen, { name: sonderName, y: startY }] })}
                  >
                    + Platzieren
                  </button>
                </div>
                {indizes.map(i => {
                  const platz = platzierungen[i]!;
                  const zeilenAktiv = istGleich(armed, { bereich: 'sonderzeile', tabelle: name, index: i });
                  return (
                    <div key={i} className="d-flex align-items-end gap-1 mb-1 flex-wrap">
                      <ScharfButton
                        aktiv={zeilenAktiv}
                        onClick={() => onArm(zeilenAktiv ? null : { bereich: 'sonderzeile', tabelle: name, index: i })}
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
                          setzeBereich({ sonderzeilen: platzierungen.map((p, ii) => (ii === i ? { ...p, y2: v } : p)) })
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger py-0"
                        title="Diese Platzierung entfernen"
                        onClick={() => setzeBereich({ sonderzeilen: platzierungen.filter((_, ii) => ii !== i) })}
                      >
                        <span className="db-icon db-font-size-xs" data-icon="bin" style={{ verticalAlign: 'middle' }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <div className="d-flex align-items-center gap-2 mb-1">
        <span className="small fw-semibold flex-grow-1">Spalten {eigeneSpalten ? '(nur diese Seite)' : ''}</span>
        {bereich && (
          <div className="form-check mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              checked={eigeneSpalten}
              title="Eigenes Spaltenraster nur für diese Seite — beim Einschalten werden die Spalten der Tabelle als Ausgangspunkt kopiert, beim Ausschalten gelten wieder die der Tabelle"
              onChange={e =>
                setzeBereich({ spalten: (e.target as HTMLInputElement).checked ? structuredClone(spalten) : undefined })
              }
            />
            <label className="form-check-label small">eigene je Seite</label>
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
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
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
      </button>
    </div>
  );
}
