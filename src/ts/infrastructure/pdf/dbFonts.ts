/**
 * DB-Neo-Schriften fuer die PDF-Ausgabe. `Layout.schriftart` kennt neben den Standard-14
 * (`helvetica`/`times`/`courier`) und den Vorlagen-Schriften (`vorlage:<Name>`) die beiden
 * DB-Familien `db-sans` (DB Neo Screen Sans) und `db-head` (DB Neo Screen Head). Die
 * woff2-Dateien liegen als entschluesselte Assets in `@db-ux/db-theme-fonts` -- dieselben,
 * die das Theme-CSS per `@font-face` laedt. `@pdf-lib/fontkit` liest woff2 direkt.
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

/** Font-Bytes fuer einen DB-Schnitt, oder `null` wenn das Asset fehlt / nicht ladbar ist. */
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
        return new Uint8Array(await res.arrayBuffer());
      } catch {
        return null;
      }
    })();
    cache.set(datei, p);
  }
  return p;
}
