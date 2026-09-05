#!/usr/bin/env bash
# Installiert die Abhaengigkeiten inklusive der DB-UX-Markenassets.
#
# Das Postinstall von @db-ux/db-theme (und der Fonts-/Icons-Pakete) entschluesselt die
# Markenassets und braucht ASSET_PASSWORD + ASSET_INIT_VECTOR als echte Prozess-Env --
# kein VITE_-Praefix, Vite sieht sie nie. Ohne die Variablen laeuft der Build durch,
# aber ohne DB-Schriften und -Icons.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

for var in ASSET_PASSWORD ASSET_INIT_VECTOR; do
  if [[ -z "${!var:-}" ]]; then
    echo "Warnung: $var fehlt -- DB-UX-Markenassets werden nicht entschluesselt." >&2
  fi
done

exec bun install "$@"
