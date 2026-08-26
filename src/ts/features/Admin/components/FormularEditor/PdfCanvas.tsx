import { useEffect, useRef, useState } from 'preact/hooks';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

// Dynamischer Import statt statischem `import ... from 'pdfjs-dist'` -- Bun (Testlauf) kennt Vites
// `?url`-Import-Suffix nicht und würde beim statischen Aufloesen des Modulgraphen abbrechen, auch
// wenn kein Test PdfCanvas tatsaechlich rendert. Per dynamischem Import wird der Worker-Pfad erst
// beim tatsaechlichen Einsatz im Browser aufgeloest.
let workerKonfiguriert = false;

async function ladePdfjs() {
  const pdfjsLib = await import('pdfjs-dist');
  if (!workerKonfiguriert) {
    const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.mjs?url');
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    workerKonfiguriert = true;
  }
  return pdfjsLib;
}

// pdfjs liefert `convertToPdfPoint`/`convertToViewportPoint` nicht typisiert genug fuer unsere
// Zwecke -- eigenes, minimales Interface statt des vollen `PageViewport`-Typs.
interface Viewport {
  width: number;
  height: number;
  convertToPdfPoint(x: number, y: number): number[];
  convertToViewportPoint(x: number, y: number): number[];
}

/** Rechteck in PDF-Punkten (Ursprung unten links). `x`/`x2` weglassen = über die ganze Seitenbreite. */
export interface Rechteck {
  x?: number;
  y: number;
  x2?: number;
  y2: number;
  label: string;
  aktiv: boolean;
  /** Beschriftung an der rechten statt linken Kante — für breite Rahmen, die eng anliegende
   * Rechtecke umschließen (z.B. das Zeilenraster über der ersten Spalte). */
  labelRechts?: boolean;
}

/**
 * Welche Achsen der Markierung tatsaechlich verwendet werden. `x` = senkrechtes Band (Spalte, nur
 * linke/rechte Kante zaehlt), `y` = waagerechtes Band (Zeilenraster, nur Ober-/Unterkante zaehlt).
 * Die jeweils andere Achse wird nicht als Rechteckkante angezeigt, damit nicht der Eindruck
 * entsteht, sie wuerde uebernommen.
 */
export type Achse = 'beide' | 'x' | 'y';

/**
 * Spannweite eines Zeilenrasters, als Indikator neben der jeweils ersten Spalte der Tabelle. Zeigt
 * ohne Beschriftung, wo die Tabelle beginnt und endet, plus einen Strich je Zeile — sonst ist aus
 * `maxZeilen` allein nicht zu sehen, ob die Zeilen noch aufs Formular passen.
 */
export interface RasterMarke {
  /** Linke Kante der am weitesten links stehenden Spalte, in PDF-Punkten -- der Indikator steht
   * mit leichtem Versatz nach links direkt daneben statt am Seitenrand. */
  x: number;
  /** Grundlinie der ersten Zeile in PDF-Punkten (`TabellenBereich.startY`). */
  startY: number;
  hoehe: number;
  zeilen: number;
  aktiv: boolean;
}

type Props = {
  datei: File;
  seiteIndex: number;
  rechtecke: Rechteck[];
  raster?: RasterMarke[];
  scharfGeschaltet: boolean;
  achse?: Achse;
  /** Ersetzt den aus `achse` abgeleiteten Standardhinweis, wenn die Geste etwas Bestimmtes meint. */
  hinweis?: string;
  onRechteck: (r: { x: number; y: number; x2: number; y2: number }) => void;
  onQuelleWaehlen: (pageIndex: number) => void;
  aktiveSeiteLabel: string;
};

const ZOOM_STUFEN = [1, 1.3, 1.6, 2, 2.5, 3, 4];
const LUPE_GROESSE = 180;
const LUPE_FAKTOR = 3;

type Ziehen = { startX: number; startY: number; x: number; y: number };

const LABEL_HOEHE = 12;

/** Rückt eine Beschriftung so weit nach oben, bis sie keine bereits gesetzte mehr überdeckt. */
function freieLabelPosition(
  x: number,
  y: number,
  breite: number,
  belegt: { x: number; y: number; b: number }[],
): number {
  let ypos = y;
  for (let versuch = 0; versuch < 8; versuch++) {
    const kollision = belegt.some(l => Math.abs(l.y - ypos) < LABEL_HOEHE && x < l.x + l.b && l.x < x + breite);
    if (!kollision) break;
    ypos -= LABEL_HOEHE;
  }
  belegt.push({ x, y: ypos, b: breite });
  return ypos;
}

function zeichneRechtecke(ctx: CanvasRenderingContext2D, viewport: Viewport, rechtecke: Rechteck[]): void {
  ctx.font = '11px sans-serif';
  ctx.lineWidth = 1.5;
  const belegt: { x: number; y: number; b: number }[] = [];

  for (const r of rechtecke) {
    // Ohne x-Kanten über die ganze Seitenbreite -- die echte Breite kommt aus dem Viewport, damit
    // auch Querformat-Vorlagen korrekt dargestellt werden.
    const [x1, y1] =
      r.x === undefined ? [0, viewport.convertToViewportPoint(0, r.y)[1]!] : viewport.convertToViewportPoint(r.x, r.y);
    const [x2, y2] =
      r.x2 === undefined
        ? [viewport.width, viewport.convertToViewportPoint(0, r.y2)[1]!]
        : viewport.convertToViewportPoint(r.x2, r.y2);
    const links = Math.min(x1!, x2!);
    const oben = Math.min(y1!, y2!);
    const breite = Math.max(Math.abs(x2! - x1!), 2);
    const hoehe = Math.max(Math.abs(y2! - y1!), 2);
    ctx.strokeStyle = r.aktiv ? '#dc3545' : '#0d6efd';
    ctx.fillStyle = r.aktiv ? 'rgba(220,53,69,0.12)' : 'rgba(13,110,253,0.10)';
    ctx.fillRect(links, oben, breite, hoehe);
    ctx.strokeRect(links, oben, breite, hoehe);

    const textBreite = ctx.measureText(r.label).width;
    const textX = r.labelRechts ? links + breite - textBreite : links;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText(r.label, textX, freieLabelPosition(textX, oben - 3, textBreite, belegt));
  }
}

const RASTER_VERSATZ = 10;
const RASTER_SPUR = 9;
const RASTER_STRICH = 6;

/**
 * Zeichnet je Tabelle einen Klammer-Indikator mit leichtem Versatz links neben ihrer ersten Spalte:
 * eine durchgehende Linie über die Spannweite, ein kurzer Strich je Zeilengrenze, keine
 * Beschriftung. Mehrere Tabellen bekommen eigene Spuren nebeneinander (nach ihrer Reihenfolge in
 * `raster`), damit sich ihre Bereiche nicht überdecken, falls zwei zufällig bei derselben Spalten-
 * Position beginnen.
 */
function zeichneRaster(ctx: CanvasRenderingContext2D, viewport: Viewport, raster: RasterMarke[]): void {
  raster.forEach((r, spur) => {
    if (r.zeilen <= 0 || r.hoehe <= 0) return;
    const xBasis = viewport.convertToViewportPoint(r.x, 0)[0]!;
    const x = xBasis - RASTER_VERSATZ - spur * RASTER_SPUR;
    // `startY` ist die Grundlinie der ERSTEN Zeile; die Zeile selbst steht darüber, weitere folgen
    // nach unten -- deshalb oben eine Zeilenhöhe zugeben und von dort abwärts zählen.
    const oben = r.startY + r.hoehe;
    const nachY = (pdfY: number) => viewport.convertToViewportPoint(0, pdfY)[1]!;

    ctx.strokeStyle = r.aktiv ? '#dc3545' : '#0d6efd';
    ctx.lineWidth = r.aktiv ? 2 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x, nachY(oben));
    ctx.lineTo(x, nachY(oben - r.zeilen * r.hoehe));
    for (let i = 0; i <= r.zeilen; i++) {
      const y = nachY(oben - i * r.hoehe);
      ctx.moveTo(x, y);
      ctx.lineTo(x + RASTER_STRICH, y);
    }
    ctx.stroke();
  });
}

/**
 * Rendert eine lokale PDF-Datei (noch nicht hochgeladen) via `pdfjs-dist` aufs Canvas -- kein
 * Server-Roundtrip noetig. Felder werden als Rechteck aufgezogen (Maustaste druecken, ziehen,
 * loslassen), waehrend des Ziehens zeigt eine Lupe den vergroesserten Ausschnitt, damit auch bei
 * kleiner Darstellung praezise gesetzt werden kann. Ziehen ist nur aktiv, wenn ein Feld scharf
 * geschaltet ist (`scharfGeschaltet`).
 */
export function PdfCanvas({
  datei,
  seiteIndex,
  rechtecke,
  raster = [],
  scharfGeschaltet,
  achse = 'beide',
  hinweis,
  onRechteck,
  onQuelleWaehlen,
  aktiveSeiteLabel,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const lupeRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<Viewport | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [angezeigt, setAngezeigt] = useState(seiteIndex);
  const [zoom, setZoom] = useState(1.6);
  /** Zählt fertige PDF-Renders, damit das Overlay nach jedem Seitenwechsel neu gezeichnet wird. */
  const [gerendert, setGerendert] = useState(0);
  const [ziehen, setZiehen] = useState<Ziehen | null>(null);
  // Lupe schon beim Hover zeigen, nicht erst beim Ziehen -- sonst ist der Startpunkt bereits
  // gesetzt, bevor man ihn vergrößert sehen kann.
  const [lupeSichtbar, setLupeSichtbar] = useState(false);
  /** Live-Anzeige in PDF-Punkten, damit man beim Ziehen sieht, welche Werte gesetzt werden. */
  const [cursorPdf, setCursorPdf] = useState<{ x: number; y: number } | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    let abgebrochen = false;
    setPdf(null);
    setFehler(null);
    void (async () => {
      const pdfjsLib = await ladePdfjs();
      const buf = await datei.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      if (!abgebrochen) setPdf(doc);
    })().catch(() => {
      if (!abgebrochen) setFehler('PDF konnte nicht gelesen werden');
    });
    return () => {
      abgebrochen = true;
    };
  }, [datei]);

  useEffect(() => setAngezeigt(seiteIndex), [seiteIndex]);

  // PDF-Seite nur bei echtem Seiten-/Zoom-Wechsel rendern. Die Rechteck-Vorschau liegt bewusst auf
  // einem eigenen Overlay-Canvas -- sonst würde jede Mausbewegung beim Ziehen einen kompletten
  // pdfjs-Render auslösen (ruckelt und löst parallele render()-Aufrufe auf demselben Canvas aus).
  useEffect(() => {
    if (!pdf) return;
    let abgebrochen = false;
    const seitenNr = Math.min(Math.max(angezeigt, 0), pdf.numPages - 1) + 1;
    void (async () => {
      try {
        const page: PDFPageProxy = await pdf.getPage(seitenNr);
        if (abgebrochen) return;
        const viewport = page.getViewport({ scale: zoom }) as unknown as Viewport;
        const canvas = canvasRef.current;
        const overlay = overlayRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        if (overlay) {
          overlay.width = viewport.width;
          overlay.height = viewport.height;
        }
        await page.render({ canvasContext: ctx, viewport: viewport as never, canvas }).promise;
        if (abgebrochen) return;
        viewportRef.current = viewport;
        setGerendert(n => n + 1);
      } catch {
        if (!abgebrochen) setFehler('Seite konnte nicht gerendert werden');
      }
    })();
    return () => {
      abgebrochen = true;
    };
  }, [pdf, angezeigt, zoom]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const ctx = overlay?.getContext('2d');
    const viewport = viewportRef.current;
    if (!overlay || !ctx || !viewport) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    zeichneRaster(ctx, viewport, raster);
    zeichneRechtecke(ctx, viewport, rechtecke);
    if (!ziehen) return;
    // Bei Spalte/Zeilenraster wird nur eine Achse uebernommen -- die Vorschau spannt deshalb ueber
    // die ganze andere Achse (Band), statt ein Rechteck zu zeigen, dessen Haelfte verworfen wird.
    const links = achse === 'y' ? 0 : Math.min(ziehen.startX, ziehen.x);
    const breite = achse === 'y' ? overlay.width : Math.abs(ziehen.x - ziehen.startX);
    const oben = achse === 'x' ? 0 : Math.min(ziehen.startY, ziehen.y);
    const hoehe = achse === 'x' ? overlay.height : Math.abs(ziehen.y - ziehen.startY);
    ctx.strokeStyle = '#dc3545';
    ctx.fillStyle = 'rgba(220,53,69,0.12)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.fillRect(links, oben, breite, hoehe);
    ctx.strokeRect(links, oben, breite, hoehe);
    ctx.setLineDash([]);
  }, [rechtecke, raster, ziehen, gerendert, achse]);

  function canvasKoordinate(e: MouseEvent): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function zeichneLupe(mitte: { x: number; y: number }): void {
    const quelle = canvasRef.current;
    const lupe = lupeRef.current;
    const ctx = lupe?.getContext('2d');
    if (!quelle || !lupe || !ctx) return;
    const ausschnitt = LUPE_GROESSE / LUPE_FAKTOR;
    ctx.clearRect(0, 0, LUPE_GROESSE, LUPE_GROESSE);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      quelle,
      mitte.x - ausschnitt / 2,
      mitte.y - ausschnitt / 2,
      ausschnitt,
      ausschnitt,
      0,
      0,
      LUPE_GROESSE,
      LUPE_GROESSE,
    );
    ctx.strokeStyle = '#dc3545';
    ctx.beginPath();
    ctx.moveTo(LUPE_GROESSE / 2, 0);
    ctx.lineTo(LUPE_GROESSE / 2, LUPE_GROESSE);
    ctx.moveTo(0, LUPE_GROESSE / 2);
    ctx.lineTo(LUPE_GROESSE, LUPE_GROESSE / 2);
    ctx.stroke();
  }

  function handleDown(e: MouseEvent): void {
    if (!scharfGeschaltet) return;
    const p = canvasKoordinate(e);
    if (!p) return;
    setZiehen({ startX: p.x, startY: p.y, x: p.x, y: p.y });
    zeichneLupe(p);
  }

  function handleMove(e: MouseEvent): void {
    if (!scharfGeschaltet) return;
    const p = canvasKoordinate(e);
    if (!p) return;
    if (ziehen) setZiehen({ ...ziehen, x: p.x, y: p.y });
    setLupeSichtbar(true);
    const pdfPunkt = viewportRef.current?.convertToPdfPoint(p.x, p.y);
    if (pdfPunkt) setCursorPdf({ x: pdfPunkt[0]!, y: pdfPunkt[1]! });
    zeichneLupe(p);
  }

  function handleLeave(): void {
    setZiehen(null);
    setLupeSichtbar(false);
    setCursorPdf(null);
  }

  /** Werte, die beim Loslassen gesetzt würden -- nur für die tatsächlich genutzten Achsen. */
  function liveAnzeige(): string | null {
    if (!cursorPdf) return null;
    const start = ziehen ? viewportRef.current?.convertToPdfPoint(ziehen.startX, ziehen.startY) : null;
    if (!start) {
      if (achse === 'x') return `x ${cursorPdf.x.toFixed(0)}`;
      if (achse === 'y') return `y ${cursorPdf.y.toFixed(0)}`;
      return `x ${cursorPdf.x.toFixed(0)}, y ${cursorPdf.y.toFixed(0)}`;
    }
    const x = Math.min(start[0]!, cursorPdf.x);
    const x2 = Math.max(start[0]!, cursorPdf.x);
    const y = Math.min(start[1]!, cursorPdf.y);
    const y2 = Math.max(start[1]!, cursorPdf.y);
    if (achse === 'x') return `x ${x.toFixed(0)}–${x2.toFixed(0)}  (${(x2 - x).toFixed(0)} breit)`;
    if (achse === 'y') return `y ${y.toFixed(0)}–${y2.toFixed(0)}  (${(y2 - y).toFixed(0)} hoch)`;
    return `x ${x.toFixed(0)}–${x2.toFixed(0)}, y ${y.toFixed(0)}–${y2.toFixed(0)}  (${(x2 - x).toFixed(0)} × ${(y2 - y).toFixed(0)})`;
  }

  function ziehHinweis(): string {
    if (hinweis) return hinweis;
    if (achse === 'x')
      return 'Senkrechtes Band über die Spaltenbreite ziehen — nur die linke und rechte Kante werden übernommen.';
    if (achse === 'y')
      return 'Waagerechtes Band über die erste Datenzeile ziehen — nur Ober- und Unterkante werden übernommen.';
    return 'Rechteck über die Zelle ziehen (Maustaste gedrückt halten — die Lupe zeigt den vergrößerten Ausschnitt).';
  }

  function handleUp(): void {
    const viewport = viewportRef.current;
    if (!ziehen || !viewport) return;
    const [x1, y1] = viewport.convertToPdfPoint(ziehen.startX, ziehen.startY);
    const [x2, y2] = viewport.convertToPdfPoint(ziehen.x, ziehen.y);
    // Nicht genutzte Achse auf die volle Seite setzen statt auf die zufaellig mitgezogene Strecke --
    // der Aufrufer verwirft sie ohnehin, so steht aber kein irrefuehrender Wert im Ergebnis.
    const [seiteX1, seiteY1] = viewport.convertToPdfPoint(0, 0);
    const [seiteX2, seiteY2] = viewport.convertToPdfPoint(viewport.width, viewport.height);
    setZiehen(null);
    onRechteck({
      x: achse === 'y' ? Math.min(seiteX1!, seiteX2!) : Math.min(x1!, x2!),
      x2: achse === 'y' ? Math.max(seiteX1!, seiteX2!) : Math.max(x1!, x2!),
      y: achse === 'x' ? Math.min(seiteY1!, seiteY2!) : Math.min(y1!, y2!),
      y2: achse === 'x' ? Math.max(seiteY1!, seiteY2!) : Math.max(y1!, y2!),
    });
  }

  return (
    <div>
      <div class="d-flex align-items-center flex-wrap gap-2 mb-1 small">
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary py-0"
          disabled={!pdf || angezeigt <= 0}
          onClick={() => setAngezeigt(i => i - 1)}
        >
          ‹
        </button>
        <span>
          PDF-Seite {angezeigt + 1} von {pdf?.numPages ?? '…'}
        </span>
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary py-0"
          disabled={!pdf || angezeigt >= (pdf?.numPages ?? 1) - 1}
          onClick={() => setAngezeigt(i => i + 1)}
        >
          ›
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-primary py-0"
          disabled={!pdf}
          onClick={() => onQuelleWaehlen(angezeigt)}
        >
          Als Quelle für „{aktiveSeiteLabel}“ verwenden
        </button>
        <div class="ms-auto d-flex align-items-center gap-1">
          <span class="text-muted">Zoom</span>
          <select
            class="form-select form-select-sm py-0 w-auto"
            value={String(zoom)}
            onChange={e => setZoom(Number((e.target as HTMLSelectElement).value))}
          >
            {ZOOM_STUFEN.map(z => (
              <option key={z} value={String(z)}>
                {Math.round(z * 100)} %
              </option>
            ))}
          </select>
        </div>
      </div>
      {fehler && <div class="text-danger small mb-1">{fehler}</div>}
      {scharfGeschaltet && (
        <div class="small text-primary mb-1 d-flex flex-wrap gap-2 align-items-center">
          <span>{ziehHinweis()}</span>
          {liveAnzeige() && <span class="badge text-bg-primary font-monospace">{liveAnzeige()}</span>}
        </div>
      )}
      <div class="position-relative">
        <div class="border rounded overflow-auto" style="max-height:70vh">
          <div
            class="position-relative"
            style={`width:max-content;cursor:${scharfGeschaltet ? 'crosshair' : 'default'}`}
            onMouseDown={handleDown}
            onMouseMove={handleMove}
            onMouseUp={handleUp}
            onMouseLeave={handleLeave}
          >
            <canvas ref={canvasRef} style="display:block" />
            <canvas ref={overlayRef} class="position-absolute top-0 start-0" style="pointer-events:none" />
          </div>
        </div>
        <canvas
          ref={lupeRef}
          width={LUPE_GROESSE}
          height={LUPE_GROESSE}
          class="position-absolute border border-2 border-danger rounded-circle bg-body shadow"
          style={`display:${scharfGeschaltet && lupeSichtbar ? 'block' : 'none'};right:12px;bottom:12px;pointer-events:none`}
        />
      </div>
    </div>
  );
}
