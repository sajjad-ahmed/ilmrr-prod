#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "" >&2
  echo "Error cause: ${1}" >&2
  echo "How to fix: ${2}" >&2
  exit 1
}

command -v git >/dev/null 2>&1 || fail \
  "git is not installed or not on PATH." \
  "Install git (for example: sudo apt install git) and open a new terminal, then run this script again."

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${PROJECT_DIR}"

echo "GitHub push"
echo "-----------"
echo "Project : ${PROJECT_DIR}"
echo ""

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail \
  "Not a git repository: ${PROJECT_DIR}" \
  "Run 'git init' in that folder, or clone the repo first, then run this script again."

ORIGIN_URL="$(git remote get-url origin 2>/dev/null || true)"
[[ -n "${ORIGIN_URL}" ]] || fail \
  "git origin was not found in ${PROJECT_DIR}." \
  "Add origin first, then re-run this script. Example: git remote add origin https://github.com/<user>/<repo>.git"

echo "Account:"
echo "  1) opti     (GH_UN / GH_PT)"
echo "  2) personal (GH_USERNAME_P / GH_PASSWORD_P)"
read -r -p "Choose account [1/2]: " ACCOUNT_CHOICE
ACCOUNT_CHOICE="${ACCOUNT_CHOICE// /}"

case "${ACCOUNT_CHOICE}" in
  1)
    ACCOUNT_LABEL="opti"
    GH_USER="${GH_UN:-}"
    GH_PASS="${GH_PT:-}"
    USER_VAR="GH_UN"
    PASS_VAR="GH_PT"
    ;;
  2)
    ACCOUNT_LABEL="personal"
    GH_USER="${GH_USERNAME_P:-}"
    GH_PASS="${GH_PASSWORD_P:-}"
    USER_VAR="GH_USERNAME_P"
    PASS_VAR="GH_PASSWORD_P"
    ;;
  "")
    fail \
      "No account was selected." \
      "Type 1 for opti or 2 for personal, then press Enter."
    ;;
  *)
    fail \
      "Invalid account choice: '${ACCOUNT_CHOICE}'." \
      "Type 1 for opti (GH_UN, GH_PT) or 2 for personal (GH_USERNAME_P, GH_PASSWORD_P)."
    ;;
esac

[[ -n "${GH_USER}" ]] || fail \
  "${USER_VAR} is not set for the ${ACCOUNT_LABEL} account." \
  "Export it in this shell, then re-run: export ${USER_VAR}='your-github-username'"

[[ -n "${GH_PASS}" ]] || fail \
  "${PASS_VAR} is not set for the ${ACCOUNT_LABEL} account." \
  "Export your token in this shell, then re-run: export ${PASS_VAR}='your-github-token'"

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
[[ -n "${BRANCH}" ]] || fail \
  "Could not determine the current git branch." \
  "Run 'git status' in ${PROJECT_DIR} and check that this is a valid git checkout."

[[ "${BRANCH}" != "HEAD" ]] || fail \
  "The repository is in a detached HEAD state, so there is no branch to push." \
  "Check out a branch first, for example: git checkout main"

git rev-parse -q --verify HEAD >/dev/null 2>&1 || fail \
  "This repository has no commits yet." \
  "Create a first commit (git add ... && git commit -m '...') before pushing."

ORIGIN_PATH="${ORIGIN_URL}"
ORIGIN_PATH="${ORIGIN_PATH#*github.com[:/]}"
ORIGIN_PATH="${ORIGIN_PATH%.git}"
ORIGIN_PATH="${ORIGIN_PATH%/}"

if [[ "${ORIGIN_PATH}" != */* || "${ORIGIN_PATH}" == "${ORIGIN_URL}" ]]; then
  fail \
    "origin is set (${ORIGIN_URL}) but it is not a GitHub URL this script can push to." \
    "Point origin at GitHub, then re-run. Example: git remote set-url origin https://github.com/<user>/<repo>.git"
fi

SAFE_URL="https://github.com/${ORIGIN_PATH}.git"
PUSH_URL="https://${GH_USER}:${GH_PASS}@github.com/${ORIGIN_PATH}.git"
CURSOR_TRAILER='Co-authored-by: Cursor <cursoragent@cursor.com>'
FORCE_LEASE=""

sanitize() {
  local text="$1"
  text="${text//${GH_PASS}/***}"
  text="${text//${GH_USER}:/***@}"
  printf '%s' "${text}"
}

echo ""
echo "Origin  : ${SAFE_URL}"
echo "Branch  : ${BRANCH}"
echo "Account : ${ACCOUNT_LABEL}"
echo ""

echo "Reading ${BRANCH} on GitHub..."
set +e
FETCH_OUTPUT="$(git fetch "${PUSH_URL}" "${BRANCH}" 2>&1)"
FETCH_STATUS=$?
set -e
FETCH_OUTPUT="$(sanitize "${FETCH_OUTPUT}")"

REMOTE_SHA=""
if [[ "${FETCH_STATUS}" -eq 0 ]]; then
  REMOTE_SHA="$(git rev-parse FETCH_HEAD)"
elif printf '%s' "${FETCH_OUTPUT}" | grep -Eq "couldn't find remote ref|fatal: couldn't find remote ref"; then
  REMOTE_SHA=""
elif printf '%s' "$(printf '%s' "${FETCH_OUTPUT}" | tr '[:upper:]' '[:lower:]')" | grep -Eq 'authentication failed|invalid username or password|bad credentials|401'; then
  fail \
    "GitHub rejected the ${ACCOUNT_LABEL} credentials (${USER_VAR} / ${PASS_VAR}) while reading ${BRANCH}. Git said: ${FETCH_OUTPUT}" \
    "Confirm ${USER_VAR} is the GitHub username and ${PASS_VAR} is a personal access token with 'repo' scope. Then export them and run this script again."
else
  echo "Could not read origin/${BRANCH}. The trailer check will use the local branch only."
  echo "${FETCH_OUTPUT}"
fi

declare -a TRAILER_COMMITS=()
while IFS=$'\t' read -r commit_sha commit_subject; do
  [[ -n "${commit_sha}" ]] || continue
  if git log -1 --format='%B' "${commit_sha}" | grep -Fqx "${CURSOR_TRAILER}"; then
    TRAILER_COMMITS+=("${commit_sha}"$'\t'"${commit_subject}")
  fi
done < <(git log --format='%H%x09%s' HEAD)

if [[ "${#TRAILER_COMMITS[@]}" -gt 0 ]]; then
  echo ""
  echo "These local commits contain \"${CURSOR_TRAILER}\":"
  for entry in "${TRAILER_COMMITS[@]}"; do
    printf '  %s %s\n' "${entry%%$'\t'*}" "${entry#*$'\t'}" | awk '{print substr($1,1,7), substr($0,index($0,$2))}'
  done
  if [[ -n "${REMOTE_SHA}" ]]; then
    echo "If any of these commits are already on GitHub, removing the line rewrites them and the push replaces origin/${BRANCH}."
  fi
  read -r -p "Remove that line from these commits before pushing? [y/n]: " FIX_CHOICE
  FIX_CHOICE="${FIX_CHOICE// /}"
  case "${FIX_CHOICE}" in
    y|Y)
      [[ -z "$(git status --porcelain)" ]] || fail \
        "The working tree has uncommitted changes, so commit messages cannot be rewritten safely." \
        "Commit or stash those changes, then run this script again."
      OLDEST="${TRAILER_COMMITS[-1]%%$'\t'*}"
      if git rev-parse -q --verify "${OLDEST}^" >/dev/null; then
        REWRITE_RANGE="${OLDEST}^..HEAD"
      else
        REWRITE_RANGE="HEAD"
      fi
      echo "Rewriting ${#TRAILER_COMMITS[@]} commit message(s)..."
      FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --msg-filter \
        "awk -v t='${CURSOR_TRAILER}' '\$0==t{next} {lines[n++]=\$0} END {while (n>0 && lines[n-1] ~ /^[[:space:]]*\$/) n--; for (i=0;i<n;i++) print lines[i]}'" \
        ${REWRITE_RANGE}
      git update-ref -d "refs/original/refs/heads/${BRANCH}" 2>/dev/null || true
      if git log --format='%B' HEAD | grep -Fqx "${CURSOR_TRAILER}"; then
        fail \
          "The Cursor co-author line is still present after the rewrite." \
          "Inspect 'git log' and remove the line manually, then run this script again."
      fi
      echo "Commit messages updated."
      if [[ -n "${REMOTE_SHA}" ]] && ! git merge-base --is-ancestor "${REMOTE_SHA}" HEAD; then
        FORCE_LEASE="refs/heads/${BRANCH}:${REMOTE_SHA}"
        echo "origin/${BRANCH} will be replaced with this rewritten history."
      fi
      ;;
    n|N)
      echo "Leaving commit messages unchanged."
      ;;
    *)
      fail \
        "Invalid choice: '${FIX_CHOICE}'." \
        "Type y to remove the Cursor co-author line, or n to push the commits unchanged."
      ;;
  esac
  echo ""
fi

# HTTP/1.1 + a large postBuffer avoid GitHub 408 timeouts on packs with photos/PDFs.
GIT_HTTP=( -c http.version=HTTP/1.1 -c http.postBuffer=524288000 -c http.lowSpeedLimit=0 -c http.lowSpeedTime=999999 )

set +e
if [[ -n "${FORCE_LEASE}" ]]; then
  PUSH_OUTPUT="$(git "${GIT_HTTP[@]}" push --force-with-lease="${FORCE_LEASE}" "${PUSH_URL}" "${BRANCH}" 2>&1)"
else
  PUSH_OUTPUT="$(git "${GIT_HTTP[@]}" push "${PUSH_URL}" "${BRANCH}" 2>&1)"
fi
PUSH_STATUS=$?
set -e

PUSH_OUTPUT="$(sanitize "${PUSH_OUTPUT}")"

if [[ "${PUSH_STATUS}" -eq 0 ]]; then
  echo "${PUSH_OUTPUT}"
  echo ""
  echo "Push succeeded."
  exit 0
fi

LOWER_OUTPUT="$(printf '%s' "${PUSH_OUTPUT}" | tr '[:upper:]' '[:lower:]')"

if printf '%s' "${LOWER_OUTPUT}" | grep -Eq 'authentication failed|invalid username or password|bad credentials|401'; then
  fail \
    "GitHub rejected the ${ACCOUNT_LABEL} credentials (${USER_VAR} / ${PASS_VAR}). Git said: ${PUSH_OUTPUT}" \
    "Confirm ${USER_VAR} is the GitHub username (not email unless that is the username) and ${PASS_VAR} is a valid personal access token with 'repo' scope. Then: export ${USER_VAR}='...' ${PASS_VAR}='...' and run this script again."
fi

if printf '%s' "${LOWER_OUTPUT}" | grep -Eq 'repository not found|404'; then
  fail \
    "GitHub could not find ${SAFE_URL}. Git said: ${PUSH_OUTPUT}" \
    "Confirm origin is correct (git remote -v), that the repo exists on GitHub, and that ${USER_VAR} can access it."
fi

if printf '%s' "${LOWER_OUTPUT}" | grep -Eq 'permission|403|write access'; then
  fail \
    "This ${ACCOUNT_LABEL} token cannot push to ${SAFE_URL}. Git said: ${PUSH_OUTPUT}" \
    "Use an account that can write to this origin. For personal choose 2; for opti choose 1. Recreate the token with the 'repo' scope if needed."
fi

if printf '%s' "${LOWER_OUTPUT}" | grep -Eq 'could not resolve host|network|timed out|connection refused|temporary failure|http 408|rpc failed|unexpected disconnect|remote end hung up'; then
  fail \
    "The upload to GitHub timed out or dropped (often HTTP 408 on a large pack). Git said: ${PUSH_OUTPUT}" \
    "Retry this script on a stable network. The push already uses HTTP/1.1 and a 500MB buffer. If it still fails, pack first with 'git gc' and run the script again."
fi

if printf '%s' "${LOWER_OUTPUT}" | grep -Eq 'non-fast-forward|updates were rejected|stale info'; then
  fail \
    "Remote branch '${BRANCH}' is not a fast-forward of this local branch. Git said: ${PUSH_OUTPUT}" \
    "If you just rewrote commit messages, run this script again so it can fetch origin/${BRANCH} and replace it with --force-with-lease. Otherwise review 'git fetch origin && git log HEAD..origin/${BRANCH}' and do not force-push unless you intend to overwrite remote history."
fi

fail \
  "git push failed. Git said: ${PUSH_OUTPUT}" \
  "Read the git message above, fix the underlying issue (auth, origin URL, branch, or network), then run this script again."
