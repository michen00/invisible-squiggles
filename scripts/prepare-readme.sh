#!/usr/bin/env bash

# Prepare README.md for the marketplace listings.
#
# Three things happen here, and only the first is cosmetic:
#
#   1. The zenodo badge is dropped, because vsce rejects SVGs from badge providers it
#      does not trust, and the Documentation section goes along with everything after
#      it, because that section is a repository index -- nobody reading a marketplace
#      page can follow it.
#   2. Relative destinations are rewritten to absolute GitHub URLs. vsce does this too,
#      inferring a base from package.json's `repository` field, but a listing that leans
#      on that inference breaks quietly when the field changes shape: a relative link on
#      a marketplace page resolves against the marketplace, not against GitHub. Doing it
#      here makes the result explicit, testable, and the same on Open VSX.
#   3. The output is then checked for anything unreachable -- a destination that is still
#      relative, a link to a file that is not in the repository, or an anchor pointing
#      into the section step 1 just removed. That last one is damage this transform
#      causes rather than finds, which is the reason it checks.
#
# THE CONTRACT, which is deliberately small:
#
#   Rewritten:  [text](path) and ![alt](path), destination only, no title.
#   Untouched:  any destination that is already absolute.
#   Refused:    everything else -- titles, angle brackets, reference definitions with
#               relative targets, anchors into the removed section.
#
# The refusal list is not a list of gaps. An earlier version of this script tried to
# handle those forms and grew a title pattern, a bracket-stripping rule, an extension
# router for definitions and an indent allowance; each addition produced the next defect,
# three of them regressions from the fix before. None of that grammar made the listing
# safer, because the guarantee -- nothing relative ships -- is enforced by the leftover
# scan at the bottom, which reads the output and is indifferent to how it was produced.
#
# So the rewrite handles what this README uses and the scan refuses the rest. The input
# is one file, in this repository, written by the people who get the error, and checked
# by CI: "make it absolute or write it plainly" costs an author seconds. That reasoning
# is what makes narrowness right here and would not transfer to a general Markdown tool.

set -euo pipefail

SCRIPT_NAME=$(basename "$0")
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat << EOF
Usage: $SCRIPT_NAME <input-file> <output-file>

Strips the zenodo badge and the Documentation section from a README, rewrites relative
destinations to absolute GitHub URLs, and refuses to write a listing that points at
anything a reader of that listing could not reach.

Rewrites [text](path) and ![alt](path) when the destination is a plain relative path.
Any other shape -- a title, angle brackets, a reference definition -- is refused rather
than rewritten. Write the link in that plain form, or make the destination absolute.

Arguments:
  <input-file>   Path to the input README.md
  <output-file>  Path to write the processed README.md

Environment:
  REPO_URL       Repository URL for absolute links (default: package.json repository)
  REPO_REF       Ref those links point at (default: main)

Examples:
  $SCRIPT_NAME README.md.bak README.md
  $SCRIPT_NAME test-workspace/README.md /tmp/README.out.md
EOF
  exit "${1:-0}"
}

die() {
  echo "Error: $SCRIPT_NAME: $*" >&2
  exit 1
}

if [ "$#" -ne 2 ]; then
  usage 1
fi

in="$1"
out="$2"

if [ ! -f "$in" ]; then
  die "input file not found: $in"
fi

REPO_REF="${REPO_REF:-main}"

# Read the same field vsce reads, so the two agree on where a relative link points --
# and so its absence stops the build here instead of silently shipping relative links.
repo_url="${REPO_URL:-$(
  node -e '
    const pkg = require(process.argv[1]);
    const repo = pkg.repository;
    const url = typeof repo === "string" ? repo : ((repo && repo.url) || "");
    process.stdout.write(String(url));
  ' "$REPO_ROOT/package.json" 2> /dev/null || true
)}"

repo_url="${repo_url#git+}"
repo_url="${repo_url%.git}"
repo_url="${repo_url%/}"

case "$repo_url" in
  https://*) ;;
  *)
    die "no https repository URL available (got '$repo_url'). vsce derives the base for
relative links from package.json's repository field; without it the listing would ship
links that resolve against the marketplace rather than GitHub. Set REPO_URL to override."
    ;;
esac

stripped=$(mktemp)
targets=$(mktemp)
cleanup() {
  rm -f "$stripped" "$targets"
}
trap cleanup EXIT

sed -e '/zenodo\.org.*\.svg/d' -e '/## .*Documentation/,$d' "$in" |
  perl -0777 -pe 's/\s+$/\n/' > "$stripped"

# Images resolve through /raw/ and links through /blob/ -- the same split vsce draws
# between baseImagesUrl and baseContentUrl. A blob URL serves an HTML page, so an image
# pointed at one renders as a broken image rather than a picture.
#
# Only two forms, and the destination is a plain token in both: no whitespace, no angle
# brackets, no quotes. That character class is the contract. A titled destination has a
# space in it and an angle-bracketed one starts with `<`, so neither matches, and both
# fall through unrewritten to the scan at the bottom, which names them.
#
# Excluding `<` matters more than it looks. Without it the rewrite happily treats
# `<CONTRIBUTING.md>` as a path, bolts a GitHub base onto it, and the failure surfaces
# from the existence check as "links '<CONTRIBUTING.md>', which is not in the
# repository" -- true, useless, and pointing at the wrong repair.
LINK_BASE="$repo_url/blob/$REPO_REF/" \
  IMG_BASE="$repo_url/raw/$REPO_REF/" \
  TARGETS="$targets" \
  perl -0777 -pe '
    BEGIN {
      open($fh, ">", $ENV{TARGETS}) or die "cannot record link targets: $!";
    }
    sub absolute {
      my ($target) = @_;
      return $target =~ m{^(?:\w+:|//|\#)};
    }
    # Images first: ![alt](path) also contains the ](path) the link rule matches, so the
    # generic rule would otherwise give an image the /blob/ base and render it broken.
    my $dest = qr{[^)\s<>"\x27]+};
    s{(!\[[^\]]*\]\()($dest)(\))}{
      absolute($2) ? "$1$2$3" : do { print $fh "$2\n"; "$1$ENV{IMG_BASE}$2$3" }
    }ge;
    s{(\]\()($dest)(\))}{
      absolute($2) ? "$1$2$3" : do { print $fh "$2\n"; "$1$ENV{LINK_BASE}$2$3" }
    }ge;
    END { close($fh) }
  ' "$stripped" > "$out"

# A rewritten link is only useful if the file is really there; an absolute URL to a
# missing path is a 404 on the listing instead of a visibly broken relative link.
missing=0
while IFS= read -r target; do
  [ -n "$target" ] || continue
  # A fragment or a query is addressing, not path: icon.png?raw=1 is the file icon.png.
  path="${target%%[?#]*}"
  [ -n "$path" ] || continue
  if [ ! -e "$REPO_ROOT/$path" ]; then
    echo "Error: $SCRIPT_NAME: links '$path', which is not in the repository" >&2
    missing=1
  fi
done < <(sort -u "$targets")
if [ "$missing" -ne 0 ]; then
  die "the listing would link files that do not exist"
fi

# Anchors that survive have to point at a heading that also survived. Cutting the
# Documentation section is precisely what orphans one, so this checks the cut.
dangling=$(
  # -CSD decodes as UTF-8. Without it perl compares bytes, and a stray byte of a
  # multi-byte character counts as alphanumeric -- an emoji heading then slugs to
  # something no anchor could ever match, and every anchor looks dangling.
  perl -CSD -0777 -ne '
    my %slug;
    while (/^\#{1,6}[ \t]+(.+?)[ \t]*$/gm) {
      my $text = $1;
      $text =~ s/\[([^\]]*)\]\([^)]*\)/$1/g;
      $text =~ s/[^\p{Alnum} _-]//g;
      $text = lc $text;
      $text =~ s/ /-/g;
      $slug{$text} = 1;
    }
    my %seen;
    while (/\]\(\#([^)]+)\)/g) {
      my $anchor = lc $1;
      next if $seen{$anchor}++;
      print "$anchor\n" unless $slug{$anchor};
    }
  ' "$out"
)
if [ -n "$dangling" ]; then
  echo "Error: $SCRIPT_NAME: anchors point at headings the listing does not contain:" >&2
  printf '%s\n' "$dangling" | sed 's/^/  #/' >&2
  die "the Documentation section and everything below it is stripped, so an anchor into it cannot resolve"
fi

# This is the guarantee. Everything above is convenience; this is the part that makes the
# listing safe, and it holds whatever the rewrite did or skipped, because it reads the
# output rather than trusting the transform.
#
# It is deliberately wider than the rewrite. The rewrite matches a bare destination token;
# this takes everything up to the closing paren and inspects the first token, so every
# shape the rewrite declines -- a title, angle brackets, something nobody has thought of
# -- arrives here still relative and stops the build. Wider here, narrower there, on
# purpose: that gap is where the contract lives.
#
# It normalises nothing, also deliberately. Stripping angle brackets would make `<#x>`
# read as an anchor and pass; a barrier that shares the rewrite's blind spots is not a
# barrier.
leftover=$(
  perl -0777 -ne '
    while (/\]\(([^)]*)\)/g) {
      my $inside = $1;
      $inside =~ s/^[ \t]+//;
      my ($target) = $inside =~ /^(\S+)/;
      next unless defined $target;
      print "$target\n" unless $target =~ m{^(?:\w+:|//|\#)};
    }
    # Reference definitions are never rewritten, so this is the only thing that reads
    # them: an absolute one passes, a relative one stops the build. The indent allowance
    # is the three spaces Markdown allows, spaces only -- a leading tab is a four-column
    # tab stop, which makes the line an indented code block rather than a definition.
    while (/^ {0,3}\[[^\]]+\]:[ \t]*(\S+)/gm) {
      print "$1\n" unless $1 =~ m{^(?:\w+:|//|\#)};
    }
  ' "$out" | sort -u
)
if [ -n "$leftover" ]; then
  echo "Error: $SCRIPT_NAME: these destinations reach the listing unrewritten:" >&2
  printf '%s\n' "$leftover" | sed 's/^/  /' >&2
  die "only [text](path) and ![alt](path) with a plain destination are rewritten, and a
relative destination left alone resolves against the marketplace, not GitHub. Either write
the link in that plain form -- drop the title, drop the angle brackets -- or make the
destination absolute. A reference definition is never rewritten, so absolute is the only
option there. Angle brackets are refused even around an already-absolute URL: this scan
reads the destination literally rather than normalising it."
fi
