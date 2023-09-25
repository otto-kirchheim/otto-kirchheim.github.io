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
