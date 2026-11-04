#!/usr/bin/env bash
# Usage:
#   ./build_pdf_v2.sh                         build every .tex in this folder
#   ./build_pdf_v2.sh <file.tex>              build only the given .tex (extension optional)
#   ./build_pdf_v2.sh <file.tex> md           also write Markdown under ./markdown/
#   ./build_pdf_v2.sh md                      build every .tex and write Markdown
#   ./build_pdf_v2.sh <file.tex> no-md        PDF only (same as omitting the flag)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BOLD="$(printf '\033[1m')"
GREEN="$(printf '\033[1;32m')"
CYAN="$(printf '\033[1;36m')"
RESET="$(printf '\033[0m')"

usage() {
  echo "Usage: $0 [file.tex] [md|no-md]" >&2
  echo "       $0 md" >&2
  exit 1
}

MAKE_MD=0
FILE_ARG=""

for arg in "$@"; do
  case "$arg" in
    md)
      MAKE_MD=1
      ;;
    no-md)
      MAKE_MD=0
      ;;
    -h|--help)
      usage
      ;;
    *)
      if [[ -n "$FILE_ARG" ]]; then
        usage
      fi
      FILE_ARG="$arg"
      ;;
  esac
done

shopt -s nullglob
all_tex=( *.tex )
if (( ${#all_tex[@]} == 0 )); then
  echo "No .tex files found." >&2
  exit 1
fi

if [[ -n "$FILE_ARG" ]]; then
  name="$(basename "$FILE_ARG")"
  [[ "$name" == *.tex ]] || name="${name}.tex"
  if [[ ! -f "$name" ]]; then
    echo "No such .tex file in $SCRIPT_DIR: $name" >&2
    exit 1
  fi
  tex_files=( "$name" )
else
  tex_files=( "${all_tex[@]}" )
fi

cleanup() {
  local tex resume
  for tex in "${tex_files[@]}"; do
    resume="${tex%.tex}"
    rm -f \
      "${resume}.aux" \
      "${resume}.log" \
      "${resume}.out" \
      "${resume}.toc" \
      "${resume}.lof" \
      "${resume}.lot" \
      "${resume}.fls" \
      "${resume}.fdb_latexmk" \
      "${resume}.synctex.gz"
  done
}

trap cleanup EXIT
cleanup

created_pdfs=()
created_mds=()

for tex in "${tex_files[@]}"; do
  resume="${tex%.tex}"
  pdflatex -interaction=nonstopmode -halt-on-error "$tex"
  pdflatex -interaction=nonstopmode -halt-on-error "$tex"
  created_pdfs+=( "${resume}.pdf" )
  echo "Created ${resume}.pdf"
done

cleanup
echo "Temporary pdfLaTeX files removed."

if (( MAKE_MD == 1 )); then
  mkdir -p markdown
  for tex in "${tex_files[@]}"; do
    resume="${tex%.tex}"
    md_path="markdown/${resume}.md"
    if pandoc "$tex" -f latex -t gfm --wrap=none -o "$md_path" 2>/dev/null; then
      created_mds+=( "$md_path" )
    elif [[ -f "${resume}.pdf" ]] && pdftotext -layout "${resume}.pdf" "$md_path"; then
      created_mds+=( "$md_path" )
    else
      echo "Failed to write Markdown for ${tex}." >&2
      exit 1
    fi
  done
fi

echo
echo "${BOLD}Build complete.${RESET}"
for pdf in "${created_pdfs[@]}"; do
  echo "  PDF  ${pdf}"
done

if (( MAKE_MD == 1 )); then
  echo
  echo "${GREEN}${BOLD}Markdown created${RESET} ${CYAN}(${#created_mds[@]})${RESET} ${GREEN}in ${BOLD}${SCRIPT_DIR}/markdown/${RESET}"
  for md in "${created_mds[@]}"; do
    echo "  ${GREEN}${BOLD}MD${RESET}   ${CYAN}${md}${RESET}"
  done
fi
