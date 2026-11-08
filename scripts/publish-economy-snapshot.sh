#!/usr/bin/env bash
# Commit only the economy snapshot, rebase onto the latest default branch,
# and request a GitHub Pages build. Never force-pushes and never stages the
# live-cache file.
set -euo pipefail

if [ "${PUBLISH_ECONOMY_SNAPSHOT:-}" != "1" ]; then
  echo "Refusing to publish without PUBLISH_ECONOMY_SNAPSHOT=1" >&2
  exit 1
fi

FILES=(
  economy/data/latest.json
  economy/data/latest.js
  economy/data/meta.json
)

cd "$(git rev-parse --show-toplevel)"

remote="${PUBLISH_REMOTE:-origin}"
branch="${PUBLISH_BRANCH:-main}"

# Drop anything already staged so a dirty live-cache cannot ride along.
git reset -q

git add -- "${FILES[@]}"

staged="$(git diff --cached --name-only)"
if [ -n "$staged" ]; then
  while IFS= read -r path; do
    [ -z "$path" ] && continue
    allowed=0
    for file in "${FILES[@]}"; do
      if [ "$path" = "$file" ]; then
        allowed=1
        break
      fi
    done
    if [ "$allowed" -ne 1 ]; then
      echo "Refusing to commit unexpected file: $path" >&2
      exit 1
    fi
  done <<< "$staged"
fi

if git diff --cached --quiet; then
  echo "No economy snapshot changes."
  exit 0
fi

author_name="${GIT_AUTHOR_NAME:-github-actions[bot]}"
author_email="${GIT_AUTHOR_EMAIL:-41898282+github-actions[bot]@users.noreply.github.com}"
committer_name="${GIT_COMMITTER_NAME:-github-actions[bot]}"
committer_email="${GIT_COMMITTER_EMAIL:-41898282+github-actions[bot]@users.noreply.github.com}"

git -c user.name="$committer_name" -c user.email="$committer_email" \
  commit --author="$author_name <$author_email>" \
  -m "Update economy snapshot"

if [ "${SKIP_PUSH:-}" = "1" ]; then
  echo "Committed locally; push skipped."
  exit 0
fi

# Hold unstaged edits, such as a live-cache file this job must not publish,
# so rebase can replay the economy commit onto a newer main.
stash_needed=0
if [ -n "$(git status --porcelain)" ]; then
  git stash push --include-untracked -m "economy-publish-hold" >/dev/null
  stash_needed=1
fi

restore_hold() {
  if [ "$stash_needed" -eq 1 ]; then
    stash_needed=0
    git stash pop >/dev/null 2>&1 || git reset --hard HEAD >/dev/null
  fi
}
trap restore_hold EXIT

pushed=0
for attempt in 1 2 3 4 5; do
  git fetch --depth=100 "$remote" "+refs/heads/${branch}:refs/remotes/${remote}/${branch}"
  if ! git rebase "refs/remotes/${remote}/${branch}"; then
    echo "Rebase onto ${remote}/${branch} conflicted. Not overwriting other files." >&2
    git rebase --abort || true
    exit 1
  fi
  if git push "$remote" "HEAD:${branch}"; then
    pushed=1
    break
  fi
  echo "Push was rejected. Retry ${attempt}; will rebase again." >&2
  sleep $((attempt * 2))
done

if [ "$pushed" -ne 1 ]; then
  echo "Could not fast-forward ${branch} without a force push." >&2
  exit 1
fi

if [ "${REQUEST_PAGES_BUILD:-}" = "1" ]; then
  if [ -z "${GITHUB_REPOSITORY:-}" ] || [ -z "${GH_TOKEN:-}${GITHUB_TOKEN:-}" ]; then
    echo "Pages build was requested but the repository token is missing." >&2
    exit 1
  fi
  # Documented equivalent of a push to the default branch. The legacy Pages
  # source otherwise may ignore a push made with GITHUB_TOKEN.
  gh api --method POST \
    -H "Accept: application/vnd.github+json" \
    "/repos/${GITHUB_REPOSITORY}/pages/builds" >/dev/null
  echo "Requested a GitHub Pages build."
fi
