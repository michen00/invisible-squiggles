#!/usr/bin/env bash

set -e # Exit on errors

SCRIPT_NAME=$(basename "$0")

usage() {
  cat << EOF
Usage: $SCRIPT_NAME [--output <output_file>] [<input_file>]

Concatenate multiple .gitignore templates into a single file by fetching
template URLs from stdin, a file, or built-in defaults.

Inputs:
  stdin            Read URLs from standard input when piped.
  <input_file>     Optional file containing one URL per line.

Options:
  --output <file>  Destination file name. Defaults to .gitignore.
  -h, --help       Show this help message and exit.

Examples:
  cat urls.txt | $SCRIPT_NAME
  cat urls.txt | $SCRIPT_NAME --output custom.output.gitignore
  $SCRIPT_NAME
  $SCRIPT_NAME urls.txt
  $SCRIPT_NAME urls.txt --output custom.output.gitignore
EOF
  exit "${1:-0}"
}

# Hardcoded URLs (used if no input is provided)
DEFAULT_URLS=(
  # Language / runtime / ecosystem
  "https://github.com/github/gitignore/blob/main/Node.gitignore"

  # IDEs / editors
  "https://github.com/github/gitignore/blob/main/Global/Cursor.gitignore"
  "https://github.com/github/gitignore/blob/main/Global/Eclipse.gitignore"
  "https://github.com/github/gitignore/blob/main/Global/Emacs.gitignore"
  "https://github.com/github/gitignore/blob/main/Global/JetBrains.gitignore"
  "https://github.com/github/gitignore/blob/main/Global/SublimeText.gitignore"
  "https://github.com/github/gitignore/blob/main/Global/Vim.gitignore"
  "https://github.com/github/gitignore/blob/main/Global/VisualStudioCode.gitignore"
  "https://github.com/github/gitignore/blob/main/VisualStudio.gitignore"

  # OS / platform
  "https://github.com/github/gitignore/blob/main/Global/Linux.gitignore"
  "https://github.com/github/gitignore/blob/main/Global/macOS.gitignore"
  "https://github.com/github/gitignore/blob/main/Global/Windows.gitignore"

  # Tools / documents / misc artifacts
  "https://github.com/github/gitignore/blob/main/Global/Archives.gitignore"
  "https://github.com/github/gitignore/blob/main/Global/Backup.gitignore"
  "https://github.com/github/gitignore/blob/main/Global/Diff.gitignore"
  "https://github.com/github/gitignore/blob/main/Global/MicrosoftOffice.gitignore"
  "https://github.com/github/gitignore/blob/main/Global/Patch.gitignore"
)

# Default output file
OUTPUT_FILE=".gitignore"

# Variables
INPUT_FILE=""
URLS=()

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --output)
      if [[ -z ${2:-} ]]; then
        echo "Error: --output requires a file name." >&2
        usage 1
      fi
      OUTPUT_FILE="$2"
      shift 2
      ;;
    -h | --help)
      usage 0
      ;;
    --*)
      echo "Unknown option: $1" >&2
      usage 1
      ;;
    *)
      if [[ -z $INPUT_FILE ]]; then
        INPUT_FILE="$1"
        shift
      else
        echo "Error: Multiple input files specified: '$INPUT_FILE' and '$1'" >&2
        usage 1
      fi
      ;;
  esac
done

# Determine the source of URLs
if [[ -n $INPUT_FILE && -f $INPUT_FILE ]]; then
  # Read URLs from the provided file
  mapfile -t URLS < "$INPUT_FILE"
elif ! [ -t 0 ]; then
  # Read URLs from stdin if piped
  mapfile -t URLS
else
  # Use hardcoded URLs as default
  URLS=("${DEFAULT_URLS[@]}")
fi

# Calculate the length of the longest URL
MAX_URL_LENGTH=0
for url in "${URLS[@]}"; do
  if [[ ${#url} -gt $MAX_URL_LENGTH ]]; then
    MAX_URL_LENGTH=${#url}
  fi
done

# Create the comment header
HEADER_LENGTH=$((MAX_URL_LENGTH + 4))
HEADER=$(printf '#%.0s' $(seq 1 $HEADER_LENGTH))

{
  echo "$HEADER"
  echo "# This .gitignore is composed of the following templates (retrieved $(date +%Y-%m-%d)):"
  for url in "${URLS[@]}"; do
    echo "# - $url"
  done
  echo "$HEADER"
  echo ""
} > "$OUTPUT_FILE"

echo "Initialized output file with header: $OUTPUT_FILE"

# Loop through URLs
for url in "${URLS[@]}"; do
  echo "Processing URL: $url"

  # Extract the filename (e.g., Python.gitignore)
  FILENAME=$(basename "$url")

  # Calculate dynamic block length
  PREFACE_LENGTH=$((${#FILENAME} + 4)) # Length of " # FILENAME # "
  PREFACE=$(printf '#%.0s' $(seq 1 $PREFACE_LENGTH))

  # Preface block for this template
  {
    echo "$PREFACE"
    echo "# $FILENAME #"
    echo "$PREFACE"
    echo ""
  } >> "$OUTPUT_FILE"

  # Convert GitHub URL to raw content URL
  RAW_URL=$(echo "$url" | sed 's|github.com|raw.githubusercontent.com|; s|/blob||')
  echo "Converted to raw URL: $RAW_URL"

  # Fetch content
  CONTENT=$(curl -s "$RAW_URL" | awk '{ gsub(/\r$/, ""); gsub(/[ \t]+$/, ""); print }')
  if [[ -z $CONTENT ]]; then
    echo "Failed to fetch content from: $RAW_URL"
  else
    echo "Appending content from: $RAW_URL"
    echo "$CONTENT" >> "$OUTPUT_FILE"
    echo -e "\n# End of $url\n" >> "$OUTPUT_FILE"
  fi
done

# Normalize line endings in the final output file
tr -d '\r' < "$OUTPUT_FILE" > .temp_file && mv .temp_file "$OUTPUT_FILE"

# Ensure single trailing newline
if [[ $OSTYPE == "linux-gnu"* ]]; then
  sed -i ':a;/^$/{$d;N;ba;}' "$OUTPUT_FILE" # spellchecker:disable-line
elif [[ $OSTYPE == "darwin"* ]]; then
  sed -i '' -e :a -e '/^\n*$/{$d;N;ba' -e '}' "$OUTPUT_FILE" # spellchecker:disable-line
else
  echo "Unknown OS: unable to ensure single trailing newline"
fi

echo -e "!.gitkeep" >> "$OUTPUT_FILE"
echo "Combined .gitignore created as $OUTPUT_FILE"
