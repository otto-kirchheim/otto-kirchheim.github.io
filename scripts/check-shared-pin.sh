#!/usr/bin/env bash
# =============================================================================
# check-shared-pin.sh – Produktion nur mit freigegebenem shared
#
# Prueft, ob der in bun.lock gepinnte nebengeld-shared-Commit auf shared/main liegt -- oder ob sein
# `src/` mit shared/main identisch ist. Nur `src/` kommt bei frontend/backend an (`main`/`types`/`files`
# in shared/package.json); Commits ohne `src/`-Aenderung (CI, Doku, Skripte) werden nicht eigens
# released und bleiben bis zum naechsten Release auf shared/dev.
# Laeuft in den Produktions-Workflows vor dem Build (greift auch bei Merges nach main,
# die an scripts/deploy.sh vorbeigehen) und in scripts/deploy.sh vor dem Merge.
# Kein Token noetig: shared ist public, geprueft wird per schlankem Bare-Clone.
#
# Verwendung: scripts/check-shared-pin.sh [bun.lock]
# =============================================================================

set -euo pipefail

LOCKFILE="${1:-bun.lock}"
SHARED_REPO="${SHARED_REPO:-https://github.com/otto-kirchheim/nebengeld-shared.git}"

PIN="$({ grep -oE 'nebengeld-shared@github:otto-kirchheim/nebengeld-shared#[0-9a-f]+' "$LOCKFILE" || true; } | head -1 | sed 's/.*#//')"
if [[ -z "$PIN" ]]; then
  echo "❌ Kein shared-Pin in ${LOCKFILE} gefunden." >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git clone -q --bare --filter=blob:none "$SHARED_REPO" "$TMP"

if git -C "$TMP" merge-base --is-ancestor "$PIN" main 2>/dev/null; then
  echo "✅ shared-Pin ${PIN} liegt auf shared/main."
  exit 0
fi

if git -C "$TMP" cat-file -e "${PIN}^{commit}" 2>/dev/null && git -C "$TMP" diff --quiet main "$PIN" -- src; then
  echo "✅ shared-Pin ${PIN} liegt nicht auf shared/main, sein src/ ist aber identisch (nur Nicht-Code-Commits)."
  exit 0
fi

if git -C "$TMP" cat-file -e "${PIN}^{commit}" 2>/dev/null; then
  echo "❌ shared-Pin ${PIN} liegt nicht auf shared/main und aendert src/. Zuerst shared releasen:" >&2
  echo "   (cd ../shared && bun run release:patch), danach bun update @otto-kirchheim/nebengeld-shared." >&2
else
  echo "❌ shared-Pin ${PIN} existiert nicht in ${SHARED_REPO}." >&2
fi
exit 1
