import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type { Schriftart } from '@otto-kirchheim/nebengeld-shared';
import {
  familieFuerSchnitt,
  fehlendeVorlagenSchnitte,
  SCHNITTE,
  schnitteText,
  SchriftartWahl,
  type Schnitt,
} from './SchriftartWahl';
import type { VorlageFontFamilie } from './vorlageFonts';

/** Probetext für die Vorschau: Umlaut, Ziffern und die im Formular üblichen Begriffe. */
const PROBE = 'Nebenbezüge Größe 1234567890 · Zulage/Abschlag';

type Props = {
  value: Schriftart | undefined;
  vorlageFonts: VorlageFontFamilie[];
  unbrauchbareFonts: string[];
  onChange: (value: Schriftart | undefined) => void;
  onClose: () => void;
};

/** CSS-Familienname für eine eingebettete Vorlagen-Schrift (FontFace-Registrierung). */
function faceName(id: string): string {
  return `vfp-${id.replace(/[^a-z0-9]+/gi, '-')}`;
}

const CSS_STANDARD: Record<string, string> = {
  helvetica: 'Helvetica, Arial, sans-serif',
  times: '"Times New Roman", Times, serif',
  courier: '"Courier New", Courier, monospace',
};
const HELVETICA = CSS_STANDARD.helvetica!;

/**
 * Registriert die eingebetteten Vorlagen-Schnitte als `FontFace` (ein Face je vorhandenem Schnitt,
 * gleicher Familienname mit weight/style-Deskriptor) und gibt die Namen der fertig geladenen Familien
 * zurück. Die Bytes liegen bereits aus `vorlageFonts.ts` vor -- reine Browser-Registrierung, kein
 * Netzugriff. Bei fehlendem `FontFace` (alte Engine) bleibt die Vorschau bei Helvetica.
 */
function useVorlagenFaces(vorlageFonts: VorlageFontFamilie[]): Set<string> {
  const [geladen, setGeladen] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (typeof FontFace === 'undefined' || !document.fonts) return undefined;
    const faces: FontFace[] = [];
    const fertig = new Set<string>();
    for (const familie of vorlageFonts) {
      const name = faceName(familie.id);
      for (const s of SCHNITTE) {
        const bytes = familie.schnitte[s.key];
        if (!bytes) continue;
        try {
          const face = new FontFace(name, bytes as BufferSource, {
            weight: s.key === 'fett' || s.key === 'fettKursiv' ? 'bold' : 'normal',
            style: s.key === 'kursiv' || s.key === 'fettKursiv' ? 'italic' : 'normal',
          });
          faces.push(face);
          void face
            .load()
            .then(fertigeFace => {
              document.fonts.add(fertigeFace);
              fertig.add(name);
              setGeladen(new Set(fertig));
            })
            .catch(() => {
              /* Schnitt nicht ladbar -- Vorschau nutzt für ihn Helvetica */
            });
        } catch {
          /* Face-Konstruktor abgelehnt -- Vorschau nutzt Helvetica */
        }
      }
    }
    return () => {
      for (const face of faces) {
        try {
          document.fonts.delete(face);
        } catch {
          /* schon entfernt */
        }
      }
    };
  }, [vorlageFonts]);
  return geladen;
}

function cssFamilie(familie: string, ersatz: boolean, geladen: Set<string>): string {
  if (ersatz) return HELVETICA;
  if (familie.startsWith('vorlage:')) {
    return geladen.has(faceName(familie)) ? `"${faceName(familie)}", ${HELVETICA}` : HELVETICA;
  }
  return CSS_STANDARD[familie] ?? HELVETICA;
}

function SchnittZeile({
  schnitt,
  label,
  familie,
  ersatz,
  geladen,
}: {
  schnitt: Schnitt;
  label: string;
  familie: string;
  ersatz: boolean;
  geladen: Set<string>;
}) {
  const fett = schnitt === 'fett' || schnitt === 'fettKursiv';
  const kursiv = schnitt === 'kursiv' || schnitt === 'fettKursiv';
  return (
    <div className="d-flex align-items-baseline gap-2 py-1">
      <span className="text-muted small flex-shrink-0" style={{ width: '6rem' }}>
        {label}
      </span>
      <span
        className="text-truncate"
        style={{
          fontFamily: cssFamilie(familie, ersatz, geladen),
          fontWeight: fett ? 700 : 400,
          fontStyle: kursiv ? 'italic' : 'normal',
          fontSize: '1.15rem',
          lineHeight: 1.3,
        }}
      >
        {PROBE}
      </span>
      {ersatz && <span className="small text-warning-emphasis flex-shrink-0">Helvetica-Ersatz</span>}
    </div>
  );
}

function Vorschau({ value, vorlageFonts }: { value: Schriftart | undefined; vorlageFonts: VorlageFontFamilie[] }) {
  const geladen = useVorlagenFaces(vorlageFonts);
  const fehlt = new Set(fehlendeVorlagenSchnitte(value, vorlageFonts));
  return (
    <div className="border rounded p-2 bg-body-tertiary">
      {SCHNITTE.map(s => (
        <SchnittZeile
          key={s.key}
          schnitt={s.key}
          label={s.label}
          familie={familieFuerSchnitt(value, s.key)}
          ersatz={fehlt.has(s.key)}
          geladen={geladen}
        />
      ))}
    </div>
  );
}

/**
 * Modal für die formularweite Schriftwahl samt Live-Vorschau je Schnitt. Eigenständiges Portal-Modal
 * (nicht das geteilte `#modal`), weil der FormularEditor selbst schon in einem Admin-Tab läuft.
 * Änderungen wirken sofort auf `value` -- der Dialog hält keinen eigenen Entwurf.
 */
export function SchriftartDialog({ value, vorlageFonts, unbrauchbareFonts, onChange, onClose }: Props) {
  useEffect(() => {
    const beiTaste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', beiTaste);
    return () => document.removeEventListener('keydown', beiTaste);
  }, [onClose]);

  const istVorlagenSchrift = SCHNITTE.some(s => familieFuerSchnitt(value, s.key).startsWith('vorlage:'));

  return createPortal(
    <>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: '1055' }}>
        <div className="modal-dialog modal-lg modal-dialog-centered modal-fullscreen-sm-down">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Schriftart</h5>
              <button type="button" className="btn-close" aria-label="Schließen" onClick={onClose} />
            </div>

            <div className="modal-body d-flex flex-column gap-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <SchriftartWahl value={value} vorlageFonts={vorlageFonts} onChange={onChange} />

              <Vorschau value={value} vorlageFonts={vorlageFonts} />

              {(vorlageFonts.length > 0 || unbrauchbareFonts.length > 0) && (
                <div className="small text-muted">
                  Eingebettet:{' '}
                  {[
                    ...vorlageFonts.map(f => (
                      <span key={f.id}>
                        {f.label.replace(' (Vorlage)', '')} ({schnitteText(f)})
                      </span>
                    )),
                    ...unbrauchbareFonts.map(n => (
                      <span
                        key={n}
                        className="text-danger text-decoration-line-through"
                        title="Teilzeichensatz oder kaputte Zeichenzuordnung (z.B. aus PDF24) — nicht als Formularschrift nutzbar"
                      >
                        {n}
                      </span>
                    )),
                  ].flatMap((el, i) => (i === 0 ? [el] : [', ', el]))}
                  .
                </div>
              )}

              {istVorlagenSchrift && (
                <div className="small text-warning-emphasis">
                  Eingebettete Schrift gewählt — nur die Vorschau nutzt sie, der Download rendert bis auf Weiteres
                  Helvetica. Fehlende Glyphen (Teilzeichensatz) erscheinen als leere Kästchen.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Fertig
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: '1054' }} />
    </>,
    document.body,
  );
}
