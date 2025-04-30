// @ts-check

import eslint from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import tseslint from "typescript-eslint";

export default tseslint.config([
	{
		ignores: ["**/dist/*", "**/dev-dist/*", "**/test/*"],
	},
	{
		extends: [eslint.configs.recommended, tseslint.configs.recommended, eslintPluginPrettier],
		rules: {
			"no-unused-expressions": "off",
			"@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: true, allowTernary: true }],
		},
	},
]);
