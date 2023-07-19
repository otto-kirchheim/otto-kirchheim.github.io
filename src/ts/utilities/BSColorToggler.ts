import { Storage } from ".";

type Theme = "light" | "dark" | "auto";

export default function initializeColorModeToggler() {
	"use strict";

	const getStoredTheme = (): Theme => (Storage.check("theme") ? Storage.get("theme") : "auto");

	const setStoredTheme = (theme: Theme) => (theme === "auto" ? Storage.remove("theme") : Storage.set("theme", theme));

	const getPreferredTheme = (): Theme => {
		const storedTheme = getStoredTheme();
		if (storedTheme) return storedTheme;
		return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	};

	const preferredTheme = getPreferredTheme();

	const setTheme = (theme: Theme) => {
		if (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches)
			document.documentElement.setAttribute("data-bs-theme", "dark");
		else document.documentElement.setAttribute("data-bs-theme", theme);
	};

	setTheme(preferredTheme);

	const showActiveTheme = (theme: Theme, focus = false) => {
		const themeSwitcher = document.querySelector<HTMLButtonElement>("#bd-theme");
		if (!themeSwitcher) return;

		const themeSwitcherText = document.querySelector<HTMLSpanElement>("#bd-theme-text");
		const activeThemeIcon = document.querySelector<HTMLSpanElement>(".theme-icon-active");
		const btnToActive = document.querySelector<HTMLButtonElement>(`[data-bs-theme-value="${theme}"]`);
		if (!themeSwitcherText || !activeThemeIcon || !btnToActive) return;

		const btnToActiveSymbol = btnToActive.querySelector("span");
		if (!btnToActiveSymbol) return;

		const SymbolOfActiveBtn = btnToActiveSymbol.innerText;
		if (!SymbolOfActiveBtn) return;

		document.querySelectorAll("[data-bs-theme-value]").forEach(element => {
			element.classList.remove("active");
			element.setAttribute("aria-pressed", "false");
		});

		btnToActive.classList.add("active");
		btnToActive.setAttribute("aria-pressed", "true");
		activeThemeIcon.innerText = SymbolOfActiveBtn;
		const themeSwitcherLabel = `${themeSwitcherText.textContent} (${btnToActive.dataset.bsThemeValue})`;
		themeSwitcher.setAttribute("aria-label", themeSwitcherLabel);

		if (focus) themeSwitcher.focus();
	};

	window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
		const storedTheme = getStoredTheme();
		if (storedTheme !== "light" && storedTheme !== "dark") setTheme(getPreferredTheme());
	});

	showActiveTheme(preferredTheme);

	document.querySelectorAll("[data-bs-theme-value]").forEach(toggle => {
		toggle.addEventListener("click", () => {
			const theme = toggle.getAttribute("data-bs-theme-value") as Theme;
			setStoredTheme(theme);
			setTheme(theme);
			showActiveTheme(theme, true);
		});
	});
}
