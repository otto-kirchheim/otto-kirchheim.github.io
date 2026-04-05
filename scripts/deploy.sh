#!/usr/bin/env bash
# =============================================================================
# deploy.sh – Frontend von `test` nach `main` deployen (GitHub Pages)
#
# Standardablauf:
#   1. `test` aktualisieren und Checks ausführen
#   2. `test` nach `main` mergen
#   3. `main` pushen -> GitHub Pages Workflow deployed automatisch
#   4. zurück auf `test` wechseln und auf den neuen Stand fast-forwarden
#
# Verwendung:
#   ./scripts/deploy.sh
#   ./scripts/deploy.sh --dry-run
#   ./scripts/deploy.sh --skip-checks
#   ./scripts/deploy.sh --source test --target main
# =============================================================================

set -euo pipefail

REMOTE="${REMOTE:-origin}"
SOURCE_BRANCH="${SOURCE_BRANCH:-test}"
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
  --source <branch>   Source branch to deploy from (default: test)
  --target <branch>   Target branch to deploy to (default: main)
  --remote <name>     Git remote (default: origin)
  -h, --help          Show this help
EOF
}

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

if ! git rev-parse --verify "$SOURCE_BRANCH" >/dev/null 2>&1; then
  echo "❌ Source branch '$SOURCE_BRANCH' does not exist locally." >&2
  exit 1
fi

if ! git rev-parse --verify "$TARGET_BRANCH" >/dev/null 2>&1; then
  echo "❌ Target branch '$TARGET_BRANCH' does not exist locally." >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "❌ Working tree is not clean. Please commit or stash your changes first." >&2
  echo "   Tipp: Nach einem Release-Bump muss der Versions-Commit zuerst auf '${SOURCE_BRANCH}' erstellt/gepusht werden." >&2
  exit 1
fi

ORIGINAL_BRANCH="$(git branch --show-current)"

echo "🚀 Deploying frontend from '$SOURCE_BRANCH' to '$TARGET_BRANCH' via '$REMOTE'"

run_cmd git fetch "$REMOTE"
run_cmd git checkout "$SOURCE_BRANCH"
run_cmd git pull --ff-only "$REMOTE" "$SOURCE_BRANCH"

if [[ "$RUN_CHECKS" == true ]]; then
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
