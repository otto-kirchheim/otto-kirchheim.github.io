/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vanillajs" />
/// <reference types="vite-plugin-pwa/info" />

interface ImportMetaEnv {
  readonly APP_VERSION: string;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// @pdf-lib/fontkit zeigt in package.json auf eine nicht mitgelieferte fontkit.d.ts. Der Typ des
// `registerFontkit`-Parameters von @cantoo/pdf-lib ist die passende strukturelle Schnittstelle.
declare module '@pdf-lib/fontkit' {
  import type { PDFDocument } from '@cantoo/pdf-lib';
  const fontkit: Parameters<PDFDocument['registerFontkit']>[0];
  export default fontkit;
}
