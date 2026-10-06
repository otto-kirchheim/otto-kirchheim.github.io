#!/usr/bin/env bash
# =============================================================================
# deploy.sh – Frontend von `dev` nach `main` deployen (GitHub Pages)
#
# Standardablauf:
#   1. `dev` aktualisieren und Checks ausführen
#   2. `dev` nach `main` mergen
#   3. `main` pushen -> GitHub Pages Workflow deployed automatisch
#   4. zurück auf `dev` wechseln und auf den neuen Stand fast-forwarden
#
# Verwendung:
#   ./scripts/deploy.sh
#   ./scripts/deploy.sh --dry-run
#   ./scripts/deploy.sh --skip-checks
#   ./scripts/deploy.sh --source dev --target main
# =============================================================================

set -euo pipefail

REMOTE="${REMOTE:-origin}"
SOURCE_BRANCH="${SOURCE_BRANCH:-dev}"
TARGET_BRANCH="${TARGET_BRANCH:-main}"
RUN_CHECKS=true
PUSH_CHANGES=true
DRY_RUN=false
KEEP_ON_SOURCE=true

usage() {
  cat <<EOF
Usage: ./scripts/deploy.sh [options]

Merges \
  source branch (default: ${SOURCE_BRANCH}) into target branch (default: ${TARGET_BRANCH}),
  pushes ${TARGET_BRANCH} to ${REMOTE} to trigger the GitHub Pages deploy,
  and switches back to ${SOURCE_BRANCH} so development can continue there.

Options:
  --skip-checks       Skip \`bun run release:check\`
  --no-push           Prepare merge locally without pushing branches
  --dry-run           Show commands only, do not change anything
  --keep-on-main      Stay on ${TARGET_BRANCH} instead of switching back to ${SOURCE_BRANCH}
  --source <branch>   Source branch to deploy from (default: dev)
  --target <branch>   Target branch to deploy to (default: main)
  --remote <name>     Git remote (default: origin)
  -h, --help          Show this help
EOF
}

# Die Pushes unten ohne Husky-Gate: entweder lief `release:check` hier (RUN_CHECKS) oder direkt davor im
# Release-Script (`--skip-checks`). Das pre-push-Gate wuerde sonst je gepushtem Branch erneut testen und bauen.
export HUSKY=0

run_cmd() {
  echo "+ $*"
  if [[ "$DRY_RUN" != true ]]; then
    "$@"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-checks)
      RUN_CHECKS=false
      ;;
    --no-push)
      PUSH_CHANGES=false
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
    --keep-on-main)
      KEEP_ON_SOURCE=false
      ;;
    --source)
      SOURCE_BRANCH="$2"
      shift
      ;;
    --target)
      TARGET_BRANCH="$2"
      shift
      ;;
    --remote)
      REMOTE="$2"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [[ "$SOURCE_BRANCH" == "$TARGET_BRANCH" ]]; then
  echo "❌ Source and target branch must be different." >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "❌ Working tree is not clean. Please commit or stash your changes first." >&2
  echo "   Tipp: Nach einem Release-Bump muss der Versions-Commit zuerst auf '${SOURCE_BRANCH}' erstellt/gepusht werden." >&2
  exit 1
fi

ensure_branch_available() {
  local branch="$1"

  if git rev-parse --verify "$branch" >/dev/null 2>&1; then
    return 0
  fi

  if ! git show-ref --verify --quiet "refs/remotes/${REMOTE}/${branch}"; then
    echo "❌ Branch '$branch' existiert weder lokal noch als ${REMOTE}/${branch}." >&2
    exit 1
  fi

  if [[ "$DRY_RUN" == true ]]; then
    echo "+ git branch --track ${branch} ${REMOTE}/${branch}"
    return 0
  fi

  git branch --track "$branch" "${REMOTE}/${branch}" >/dev/null 2>&1
}

ORIGINAL_BRANCH="$(git branch --show-current)"

echo "🚀 Deploying frontend from '$SOURCE_BRANCH' to '$TARGET_BRANCH' via '$REMOTE'"

run_cmd git fetch "$REMOTE"
ensure_branch_available "$SOURCE_BRANCH"
ensure_branch_available "$TARGET_BRANCH"
run_cmd git checkout "$SOURCE_BRANCH"
run_cmd git pull --ff-only "$REMOTE" "$SOURCE_BRANCH"

# Nach ${TARGET_BRANCH} nur per Release: die Version muss gegenueber ${REMOTE}/${TARGET_BRANCH} angehoben sein.
pkg_version() { { grep -m1 -oE '"version": *"[^"]+"' || true; } | sed -E 's/.*"([^"]+)"$/\1/'; }
VERSION_NEU="$(pkg_version < package.json)"
VERSION_PROD="$(git show "${REMOTE}/${TARGET_BRANCH}:package.json" | pkg_version)"
if [[ "$VERSION_NEU" == "$VERSION_PROD" ]]; then
  echo "❌ Version ${VERSION_NEU} liegt schon auf ${TARGET_BRANCH}. Nach ${TARGET_BRANCH} nur per Release:" >&2
  echo "   bun run release:deploy:patch | release:deploy:minor | release:deploy:major" >&2
  exit 1
fi

# shared (@otto-kirchheim/nebengeld-shared) haengt als Git-Branch-Dependency an #dev.
# Vor dem Merge nach main den aktuellen shared-Commit in bun.lock einfrieren, damit
# der Pages-Build reproduzierbar gegen exakt diesen Stand baut.
run_cmd bun update @otto-kirchheim/nebengeld-shared
SHARED_PIN_AKTUALISIERT=false
if ! git diff --quiet -- bun.lock; then
  SHARED_PIN_AKTUALISIERT=true
  run_cmd git commit -am "chore: pin shared auf aktuellen ${SOURCE_BRANCH}-Stand"
  if [[ "$PUSH_CHANGES" == true ]]; then
    run_cmd git push "$REMOTE" "$SOURCE_BRANCH"
  fi
fi

# Produktion darf nur shared-Staende nutzen, die auf shared/main liegen (scripts/check-shared-pin.sh,
# laeuft zusaetzlich in den Produktions-Workflows). Hier nur, wenn sich der Pin gegenueber
# ${REMOTE}/${TARGET_BRANCH} aendert -- ein unveraenderter Pin wurde beim letzten Release schon geprueft.
shared_pin() { { grep -oE 'nebengeld-shared@github:otto-kirchheim/nebengeld-shared#[0-9a-f]+' || true; } | head -1 | sed 's/.*#//'; }
PIN_NEU="$(shared_pin < bun.lock)"
PIN_PROD="$(git show "${REMOTE}/${TARGET_BRANCH}:bun.lock" | shared_pin)"
if [[ "$PIN_NEU" != "$PIN_PROD" ]]; then
  echo "ℹ️ shared-Pin aendert sich: ${PIN_PROD:-<keiner>} -> ${PIN_NEU:-<keiner>}"
  bash "$(dirname "$0")/check-shared-pin.sh" bun.lock
fi

# Auch bei --skip-checks: ein vorheriges release:check (z. B. in release:deploy:*) lief noch gegen den
# alten shared-Pin -- der neu gepinnte Stand muss vor dem Merge nach ${TARGET_BRANCH} selbst geprueft werden.
if [[ "$RUN_CHECKS" == true || "$SHARED_PIN_AKTUALISIERT" == true ]]; then
  if [[ "$RUN_CHECKS" != true ]]; then
    echo "ℹ️ shared-Pin wurde aktualisiert -- release:check laeuft trotz --skip-checks"
  fi
  run_cmd bun run release:check
fi

run_cmd git checkout "$TARGET_BRANCH"
run_cmd git pull --ff-only "$REMOTE" "$TARGET_BRANCH"
run_cmd git merge --no-ff "$SOURCE_BRANCH" -m "chore: deploy ${SOURCE_BRANCH} to ${TARGET_BRANCH}"

if [[ "$PUSH_CHANGES" == true ]]; then
  run_cmd git push "$REMOTE" "$TARGET_BRANCH"
fi

if [[ "$KEEP_ON_SOURCE" == true ]]; then
  run_cmd git checkout "$SOURCE_BRANCH"
  run_cmd git merge --ff-only "$TARGET_BRANCH"

  if [[ "$PUSH_CHANGES" == true ]]; then
    run_cmd git push "$REMOTE" "$SOURCE_BRANCH"
  fi
else
  echo "ℹ️ Staying on '$TARGET_BRANCH'."
fi

echo "✅ Done. Push to '$TARGET_BRANCH' should trigger the GitHub Pages deployment workflow."

if [[ "$KEEP_ON_SOURCE" == true ]]; then
  echo "🛠️ You are back on '$SOURCE_BRANCH' and can continue developing there."
else
  echo "🛠️ Current branch: '$TARGET_BRANCH' (started from '$ORIGINAL_BRANCH')."
fi
