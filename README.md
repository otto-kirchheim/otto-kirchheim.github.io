# DB-Nebengeld – Frontend

Progressive Web App zur Erfassung und Abrechnung von Nebenbezügen: Bereitschaftszeiten und -einsätze,
Einsatzwechseltätigkeit (EWT), Zulagen und Entgeltausgleich. Die App berechnet die Beträge
monatsweise und erzeugt die Abrechnungsformulare als PDF direkt im Browser.

Das zugehörige REST-Backend (Express, MongoDB) liegt in einem separaten, privaten Repository; gemeinsame
Typen kommen aus [`nebengeld-shared`](https://github.com/otto-kirchheim/nebengeld-shared).

## Tech-Stack

- React 19, TypeScript (strict), Vite
- [DB UX Design System](https://design-system.deutschebahn.com/) (`@db-ux/*`)
- PWA über `vite-plugin-pwa` (Offline-Betrieb, Auto-Update)
- dayjs für alle Datumsoperationen
- Tests mit `bun test` und happy-dom; ESLint, Stylelint, Prettier, Husky

## Entwicklung

Voraussetzung: [Bun](https://bun.sh/).

```bash
bun install            # freie Variante, ohne DB-Markenassets
bun run dev:local      # Dev-Server auf http://localhost:8080
bun run test           # Tests
bun run typecheck      # TypeScript prüfen
bun run lint           # ESLint
bun run build          # Produktions-Build nach ./dist
```

Ohne laufendes Backend startet die App, Anmeldung und Datensync funktionieren dann aber nicht.

### DB-Markenassets

Schriften, Icons und Logos der Deutschen Bahn sind im Paket verschlüsselt und **nicht** Teil dieses
Repositories. Standardmäßig baut die App eine freie Variante ohne diese Assets. Mit `DB_ASSETS=1` und den
Schlüsseln `ASSET_PASSWORD`/`ASSET_INIT_VECTOR` in `.env` entschlüsselt `./scripts/install.sh` sie bei der
Installation.

## Architektur

Feature-Sliced Design unter `src/ts/` mit Importen nur abwärts: `app` → `pages` → `widgets` → `features` →
`shared`. Die Fachmodule (`ber`, `ewt`, `ez`, `ea`) werden lazy geladen. Details stehen in
[`CLAUDE.md`](CLAUDE.md), Änderungen in [`CHANGELOG.md`](CHANGELOG.md).

## Deployment

Ein Push auf `main` baut die App und veröffentlicht sie über GitHub Pages
(`.github/workflows/deploy.yml`). Entwickelt wird auf `dev`.

## Mitwirken und Sicherheit

- Beiträge: [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md)
- Verhaltenskodex: [`.github/CODE_OF_CONDUCT.md`](.github/CODE_OF_CONDUCT.md)
- Sicherheitslücken bitte vertraulich melden: [`.github/SECURITY.md`](.github/SECURITY.md)

## Lizenz

Copyright (C) 2022–2026 Jan Otto

[GNU Affero General Public License v3.0](LICENSE) (`AGPL-3.0-only`). Wer den Code verändert und als
Web-Anwendung für andere betreibt, muss den geänderten Quellcode ebenfalls unter der AGPL bereitstellen.

Die Lizenz gilt nur für den Code dieses Repositories, nicht für die DB-Markenassets (Schriften, Icons, Logos)
und nicht für Abhängigkeiten mit eigener Lizenz (z. B. `nebengeld-shared`: MIT).

## Hinweis

Privates Projekt, nicht von der Deutschen Bahn AG betrieben oder autorisiert. „Deutsche Bahn“, „DB“ und das
DB-Logo sind Marken der Deutschen Bahn AG.
