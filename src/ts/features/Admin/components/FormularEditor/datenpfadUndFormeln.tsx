import Modal from 'bootstrap/js/dist/modal';
import { render } from 'preact';
import type { Feld } from '@otto-kirchheim/nebengeld-shared';
import { FORMATE, gruppiere, katalogFelder, type FormularCode, type KatalogEintrag } from './datenKatalog';

/**
 * Wählt EINEN Datenpfad -- für Kopf-/Fuß-Felder im "Datenfeld"-Modus ist der Objekt-Schlüssel
 * selbst der Pfad (siehe `umbenennen()` in `FeldListe`), dort kann ein Pfad also nur von EINEM
 * Feld gleichzeitig belegt sein. `belegt` (Pfade anderer Felder, das eigene ausgenommen) markiert
 * bereits vergebene Optionen als `disabled` -- ohne das wählt man scheinbar folgenlos einen
 * belegten Pfad aus (`umbenennen()` bricht still ab, `felder[neu]` existiert schon), ohne zu
 * verstehen, warum sich der Titel des Feldes nicht ändert. Denselben Wert an zwei Positionen
 * zeigen: stattdessen "Text"-Modus mit `{Pfad}`-Platzhalter verwenden. Andere Aufrufer (Spalten-
 * Schlüssel, `Feld.quellen`) kennen diese Einschränkung nicht -- dort bleibt `belegt` leer.
 */
export function DatenpfadWahl({
  wert,
  eintraege,
  belegt = new Set(),
  onChange,
}: {
  wert: string;
  eintraege: KatalogEintrag[];
  belegt?: Set<string>;
  onChange: (pfad: string) => void;
}) {
  const bekannt = eintraege.some(e => e.pfad === wert);
  return (
    <div>
      <div class="input-group input-group-sm">
        <select
          class="form-select"
          value={bekannt ? wert : '__frei'}
          onChange={e => onChange((e.target as HTMLSelectElement).value)}
        >
          {gruppiere(eintraege).map(([gruppe, felder]) => (
            <optgroup key={gruppe} label={gruppe}>
              {felder.map(f => (
                <option key={f.pfad} value={f.pfad} disabled={belegt.has(f.pfad)}>
                  {f.label}
                  {belegt.has(f.pfad) ? ' (bereits von einem anderen Feld verwendet)' : ''}
                </option>
              ))}
            </optgroup>
          ))}
          <option value="__frei">Freier Datenpfad…</option>
        </select>
        {!bekannt && (
          <input
            class={`form-control font-monospace${belegt.has(wert) ? ' is-invalid' : ''}`}
            placeholder="Datenpfad"
            value={wert === '__frei' ? '' : wert}
            onInput={e => onChange((e.target as HTMLInputElement).value)}
          />
        )}
      </div>
      {!bekannt && belegt.has(wert) && (
        <div class="small text-danger">Dieser Datenpfad wird schon von einem anderen Feld verwendet.</div>
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

/** Mehrere Datenpfade in eine Zelle, verbunden mit einem frei wählbaren Trennzeichen -- im
 * Unterschied zu Text+Platzhaltern (`PlatzhalterPicker`) werden leere/fehlende Teile automatisch
 * übersprungen statt eine Trennzeichen-Lücke zu hinterlassen (z.B. optionales `Adress2`). */
export function ZusammengesetzteQuellen({
  feld,
  formular,
  onChange,
}: {
  feld: Feld;
  formular: FormularCode;
  onChange: (feld: Feld) => void;
}) {
  const quellen = feld.quellen ?? [];
  const eintraege = katalogFelder(formular);
  const bekannterTrenner = TRENNER.some(t => t.wert === (feld.trenner ?? ' '));

  return (
    <div class="mb-1">
      {quellen.map((pfad, i) => (
        <div key={i} class="d-flex gap-1 mb-1">
          <div class="flex-grow-1">
            <DatenpfadWahl
              wert={pfad}
              eintraege={eintraege}
              onChange={neu => onChange({ ...feld, quellen: quellen.map((p, j) => (j === i ? neu : p)) })}
            />
          </div>
          <button
            type="button"
            class="btn btn-sm btn-outline-danger py-0"
            onClick={() => onChange({ ...feld, quellen: quellen.filter((_, j) => j !== i) })}
            title="Teil entfernen"
          >
            ×
          </button>
        </div>
      ))}
      <div class="d-flex gap-1 align-items-center">
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          onClick={() => onChange({ ...feld, quellen: [...quellen, eintraege[0]?.pfad ?? ''] })}
        >
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

/**
 * Fügt einen Datenpfad als `{pfad}`-Platzhalter an der Cursorposition eines Textfelds ein -- per
 * Klick statt Freihand-Tippen (tippfehleranfällig, ein falscher Pfad liefert still einen leeren
 * Wert).
 */
export function PlatzhalterPicker({
  formular,
  inputRef,
  wert,
  onEinfuegen,
}: {
  formular: FormularCode;
  inputRef: { current: HTMLInputElement | null };
  wert: string;
  onEinfuegen: (neuerText: string) => void;
}) {
  function einfuegen(pfad: string) {
    if (!pfad) return;
    const einfuegung = `{${pfad}}`;
    const el = inputRef.current;
    const start = el?.selectionStart ?? wert.length;
    const end = el?.selectionEnd ?? wert.length;
    const neu = wert.slice(0, start) + einfuegung + wert.slice(end);
    onEinfuegen(neu);
    // Cursor hinter die Einfügung setzen, nach dem Re-Render mit dem neuen Wert.
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + einfuegung.length, start + einfuegung.length);
    });
  }

  return (
    <select
      class="form-select form-select-sm mb-1"
      value=""
      title="Datenpfad an der Cursorposition einfügen"
      onChange={e => {
        einfuegen((e.target as HTMLSelectElement).value);
        (e.target as HTMLSelectElement).value = '';
      }}
    >
      <option value="">− Datenpfad einfügen −</option>
      {gruppiere(katalogFelder(formular)).map(([gruppe, felder]) => (
        <optgroup key={gruppe} label={gruppe}>
          {felder.map(f => (
            <option key={f.pfad} value={f.pfad}>
              {f.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

const PLATZHALTER_BEISPIELE: { platzhalter: string; beschreibung: string }[] = [
  {
    platzhalter: '{Datenpfad}',
    beschreibung:
      'Beliebiger Datenpfad, z.B. {Nachname} -- ohne Format greift der Standard-Fallback (Text/Zahl unverändert, Array als Liste ` / `, Boolean als Ja/Nein). Für VorgabenU.Pers.OE reicht das NICHT -- dafür immer explizit :oe angeben (siehe unten).',
  },
  {
    platzhalter: '{Datenpfad:Format}',
    beschreibung:
      'Erzwingt eines der Formate unten, z.B. {VorgabenU.Pers.OE:oe} oder {Betrag:waehrung}. Unbekannter Formatname wird ignoriert, der Pfad bleibt über den Standard-Fallback nutzbar.',
  },
  { platzhalter: '{seite} / {seiten}', beschreibung: 'Aktuelle Seitenzahl / Gesamtseitenzahl dieses Dokuments.' },
  {
    platzhalter: '{seite-1} / {seite+1}',
    beschreibung:
      'Seitenzahl mit ganzzahligem Versatz, z.B. "Übertrag von Seite {seite-1}". Gilt genauso für {seiten-1} etc.',
  },
  { platzhalter: '{heute}', beschreibung: 'Erzeugungsdatum des PDFs, Format datum (15.03.2026).' },
  {
    platzhalter: '{heute:Format}',
    beschreibung: 'Erzeugungsdatum mit anderem Format, z.B. {heute:datumKurz} (15.03.).',
  },
  { platzhalter: '{A}, {B}', beschreibung: 'Mehrere Platzhalter gemischt im selben Text, z.B. {Nachname}, {Vorname}.' },
];

function PlatzhalterHilfeInhalt() {
  return (
    <>
      <table class="table table-sm mb-3">
        <thead>
          <tr>
            <th>Platzhalter</th>
            <th>Bedeutung</th>
          </tr>
        </thead>
        <tbody>
          {PLATZHALTER_BEISPIELE.map(b => (
            <tr key={b.platzhalter}>
              <td class="font-monospace text-nowrap">{b.platzhalter}</td>
              <td>{b.beschreibung}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div class="small fw-semibold mb-1">Verfügbare Formate (für das Feld-Format und {'{Pfad:Format}'})</div>
      <table class="table table-sm mb-0">
        <tbody>
          {FORMATE.filter(f => f.wert !== '').map(f => (
            <tr key={f.wert}>
              <td class="font-monospace text-nowrap">{f.wert}</td>
              <td>{f.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/**
 * Eigenständiges, dynamisch erzeugtes Modal statt des geteilten `#modal`-Elements (siehe
 * `openHelpModal.tsx`) -- der FormularEditor läuft selbst schon in einem Admin-Tab, ein zweites
 * Modal darf ein eventuell gerade offenes nicht verdrängen.
 */
export function openPlatzhalterHilfe(): void {
  const container = document.createElement('div');
  container.className = 'modal fade';
  container.setAttribute('tabindex', '-1');
  document.body.appendChild(container);

  render(
    <div class="modal-dialog modal-dialog-scrollable modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Platzhalter &amp; Formate</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" />
        </div>
        <div class="modal-body">
          <PlatzhalterHilfeInhalt />
        </div>
      </div>
    </div>,
    container,
  );

  const bsModal = new Modal(container);
  container.addEventListener(
    'hidden.bs.modal',
    () => {
      render(null, container);
      bsModal.dispose();
      container.remove();
    },
    { once: true },
  );
  bsModal.show();
}
