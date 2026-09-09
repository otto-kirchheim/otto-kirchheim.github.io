/**
 * DB-Neo-Schriften fuer die PDF-Ausgabe. `Layout.schriftart` kennt neben den Standard-14
 * (`helvetica`/`times`/`courier`) und den Vorlagen-Schriften (`vorlage:<Name>`) die beiden
 * DB-Familien `db-sans` (DB Neo Screen Sans) und `db-head` (DB Neo Screen Head). Die
 * woff2-Dateien liegen als entschluesselte Assets in `@db-ux/db-theme-fonts` -- dieselben,
 * die das Theme-CSS per `@font-face` laedt.
 *
 * `@pdf-lib/fontkit` (1.1.1, die einzige mit `@cantoo/pdf-lib` kompatible Version) kann diese
 * Schriften NICHT subsetten -- der Encoder bricht bei `pdf.save()` mit
 * `Cannot read properties of undefined (reading 'pos')` ab, sowohl aus woff2 als auch aus
 * entpacktem TTF. `build.ts` bettet sie deshalb OHNE Subset ein; das verlangt echtes SFNT
 * (woff2-Bytes in einem `FontFile2` ergeben eine kaputte PDF), also wird hier per
 * `woff2-encoder` nach TrueType entpackt. Das wasm-Modul (~90 KB gz) laedt lazy und nur,
 * wenn wirklich eine DB-Schrift gebraucht wird.
 */

export type DbSchriftFamilie = 'db-sans' | 'db-head';
type Schnitt = 'normal' | 'fett' | 'kursiv' | 'fettKursiv';

export function istDbFamilie(familie: string): familie is DbSchriftFamilie {
  return familie === 'db-sans' || familie === 'db-head';
}

// Schnitt -> Dateiname-Suffix je Familie. DB Neo Screen Head hat keinen echten Fett-Schnitt;
// dort steht Black (900) fuer "fett".
const DATEI: Record<DbSchriftFamilie, Record<Schnitt, string>> = {
  'db-sans': {
    normal: 'dbneoscreensans-regular',
    fett: 'dbneoscreensans-bold',
    kursiv: 'dbneoscreensans-regularitalic',
    fettKursiv: 'dbneoscreensans-bolditalic',
  },
  'db-head': {
    normal: 'dbneoscreenhead-regular',
    fett: 'dbneoscreenhead-black',
    kursiv: 'dbneoscreenhead-regularitalic',
    fettKursiv: 'dbneoscreenhead-blackitalic',
  },
};

let urlMap: Record<string, string> | undefined;

/**
 * URL-Map aller DB-woff2, lazy aufgebaut. `import.meta.glob` ist ein Vite-Feature -- der
 * Aufruf wird im Build durch ein Objekt-Literal ersetzt. In der Bun-Testumgebung fehlt es;
 * dieser Zweig wird dort nur betreten, wenn eine DB-Schrift wirklich gebraucht wird
 * (`dbFontBytes`), und faengt den ReferenceError ab -> leere Map -> Helvetica-Fallback.
 * Ebenso wenn die (nur mit ASSET-Secrets entschluesselten) Dateien im Build fehlen.
 */
function urls(): Record<string, string> {
  if (urlMap) return urlMap;
  try {
    urlMap = import.meta.glob<string>(
      '../../../../node_modules/@db-ux/db-theme-fonts/build/assets/dbneoscreen*.woff2',
      { query: '?url', import: 'default', eager: true },
    );
  } catch {
    urlMap = {};
  }
  return urlMap;
}

const cache = new Map<string, Promise<Uint8Array | null>>();

/**
 * SFNT-(TrueType-)Bytes fuer einen DB-Schnitt, aus dem woff2-Asset entpackt -- oder `null`,
 * wenn das Asset fehlt bzw. nicht ladbar/entpackbar ist (dann faellt `build.ts` auf Helvetica
 * zurueck).
 */
export function dbFontBytes(familie: DbSchriftFamilie, schnitt: Schnitt): Promise<Uint8Array | null> {
  const datei = DATEI[familie][schnitt];
  let p = cache.get(datei);
  if (!p) {
    p = (async () => {
      const eintrag = Object.entries(urls()).find(([pfad]) => pfad.endsWith(`/${datei}.woff2`));
      if (!eintrag) return null;
      try {
        const res = await fetch(eintrag[1]);
        if (!res.ok) return null;
        const woff2 = new Uint8Array(await res.arrayBuffer());
        const { default: entpacke } = await import('woff2-encoder/decompress');
        return await entpacke(woff2);
      } catch {
        return null;
      }
    })();
    cache.set(datei, p);
  }
  return p;
}
