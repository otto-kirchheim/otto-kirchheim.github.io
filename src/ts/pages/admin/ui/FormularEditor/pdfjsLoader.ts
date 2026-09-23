let workerKonfiguriert = false;

/**
 * Lädt pdfjs-dist und richtet beim ersten Aufruf den Worker ein. Dynamischer statt statischer
 * Import: Bun (Testlauf) kennt Vites `?url`-Suffix nicht und bräche schon beim Auflösen des
 * Modulgraphen ab, auch wenn kein Test pdfjs rendert. So wird der Worker-Pfad erst beim Einsatz im
 * Browser aufgelöst.
 *
 * @returns Das pdfjs-Modul mit gesetztem `GlobalWorkerOptions.workerSrc`.
 */
export async function ladePdfjs() {
  const pdfjsLib = await import('pdfjs-dist');
  if (!workerKonfiguriert) {
    const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.mjs?url');
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    workerKonfiguriert = true;
  }
  return pdfjsLib;
}

/**
 * Punkt-Maße einer Seite einer lokalen PDF-Datei (Skala 1 = PDF-Punkte). Grundlage für den
 * Skalierfaktor beim Vorlagen-Wechsel: `neu.w / alt.w` bzw. `neu.h / alt.h`.
 *
 * @param datei - Lokale PDF-Datei.
 * @param seiteIndex - 0-basierter Seitenindex; wird auf die vorhandenen Seiten begrenzt.
 * @returns Breite `w` und Höhe `h` der Seite in PDF-Punkten.
 * @throws {Error} Wenn pdfjs die Datei nicht lesen kann.
 */
export async function seitenMasse(datei: File, seiteIndex = 0): Promise<{ w: number; h: number }> {
  const pdfjsLib = await ladePdfjs();
  const ladeAuftrag = pdfjsLib.getDocument({ data: await datei.arrayBuffer() });
  const doc = await ladeAuftrag.promise;
  try {
    const nr = Math.min(Math.max(seiteIndex, 0), doc.numPages - 1) + 1;
    const viewport = (await doc.getPage(nr)).getViewport({ scale: 1 });
    return { w: viewport.width, h: viewport.height };
  } finally {
    void ladeAuftrag.destroy();
  }
}
