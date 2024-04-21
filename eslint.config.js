import js from "@eslint/js";

export default [
	{
		env: {
			es2022: true,
			browser: true,
		},
		extends: [js.configs.recommended, "plugin:@typescript-eslint/recommended", "plugin:prettier/recommended"],
		parser: "@typescript-eslint/parser",
		root: true,
		overrides: [],
		parserOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
		},
		rules: {
			indent: ["error", "tab", { SwitchCase: 1 }],
			"linebreak-style": ["error", "windows"],
			quotes: [
				"error",
				"double",
				{
					avoidEscape: true,
					allowTemplateLiterals: true,
				},
			],
			semi: ["error", "always"],
			"no-process-env": "off",
		},
		plugins: ["@typescript-eslint"],
	},
];
