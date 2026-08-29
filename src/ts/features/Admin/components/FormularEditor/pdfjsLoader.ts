// Dynamischer Import statt statischem `import ... from 'pdfjs-dist'` -- Bun (Testlauf) kennt Vites
// `?url`-Import-Suffix nicht und würde beim statischen Auflösen des Modulgraphen abbrechen, auch
// wenn kein Test pdfjs tatsächlich rendert. Per dynamischem Import wird der Worker-Pfad erst beim
// tatsächlichen Einsatz im Browser aufgelöst.
let workerKonfiguriert = false;

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
