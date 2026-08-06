#!/usr/bin/env bash

# Prepare README.md for the marketplace listings.
#
# Three things happen here, and only the first is cosmetic:
#
#   1. The zenodo badge is dropped, because vsce rejects SVGs from badge providers it
#      does not trust, and the Documentation section goes along with everything after
#      it, because that section is a repository index -- nobody reading a marketplace
#      page can follow it.
#   2. Every remaining relative link is rewritten to an absolute GitHub URL. vsce does
#      this too, inferring a base from package.json's `repository` field, but a listing
#      that leans on that inference breaks quietly when the field changes shape: a
#      relative link on a marketplace page resolves against the marketplace, not
#      against GitHub. Doing it here makes the result explicit, testable, and the same
#      on Open VSX.
#   3. The output is then checked for anything unreachable -- a relative link that
#      survived, a link to a file that is not in the repository, or an anchor pointing
#      into the section step 1 just removed. That last one is damage this transform
#      causes rather than finds, which is the reason it checks.

set -euo pipefail

SCRIPT_NAME=$(basename "$0")
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat << EOF
Usage: $SCRIPT_NAME <input-file> <output-file>

Strips the zenodo badge and the Documentation section from a README, rewrites relative
links to absolute GitHub URLs, and refuses to write a listing that points at anything a
reader of that listing could not reach.

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
LINK_BASE="$repo_url/blob/$REPO_REF/" \
  IMG_BASE="$repo_url/raw/$REPO_REF/" \
  TARGETS="$targets" \
  perl -0777 -pe '
    BEGIN {
      open($fh, ">", $ENV{TARGETS}) or die "cannot record link targets: $!";
    }
    sub absolute {
      my ($target) = @_;
      # <https://example.com> is a legal destination and is absolute; without stripping
      # the bracket it reads as relative and gets a GitHub base bolted onto a full URL.
      $target =~ s/^<//;
      return $target =~ m{^(?:\w+:|//|\#)};
    }
    # An optional link title after the destination. \x27 is a single quote, spelled that
    # way because this whole program is inside a single-quoted shell string.
    my $title = qr{(?:[ \t]+(?:"[^"]*"|\x27[^\x27]*\x27|\([^()]*\)))?};
    # ![alt](path) and ![alt](path "title")
    s{(!\[[^\]]*\]\([ \t]*)([^)\s]+)($title[ \t]*\))}{
      absolute($2) ? "$1$2$3" : do { print $fh "$2\n"; "$1$ENV{IMG_BASE}$2$3" }
    }ge;
    # [text](path) and [text](path "title")
    s{(\]\([ \t]*)([^)\s]+)($title[ \t]*\))}{
      absolute($2) ? "$1$2$3" : do { print $fh "$2\n"; "$1$ENV{LINK_BASE}$2$3" }
    }ge;
    # [label]: path -- a definition carries no `!` to say whether it feeds an image or a
    # link, so the base comes from what the target *is* rather than from how the label is
    # used. Reading usage means classifying every bracket in the document, and brackets
    # appear in task lists, code spans and fenced examples; three separate false
    # conflicts came out of trying, each one refusing to package a correct README. The
    # file extension is a property of the target alone and needs no document scan.
    # A definition may carry a title too, exactly as an inline link may.
    s{^(\[[^\]]+\]:[ \t]*)(\S+)($title[ \t]*)$}{
      my ($prefix, $target, $suffix) = ($1, $2, $3);
      if (absolute($target)) {
        "$prefix$target$suffix";
      } else {
        print $fh "$target\n";
        # A query or fragment may follow the extension -- icon.png?raw=1 is still a png.
        my $is_image =
          $target =~ /\.(?:png|jpe?g|gif|svg|webp|avif|bmp|ico)(?:[?\#]\S*)?$/i;
        "$prefix" . ($is_image ? $ENV{IMG_BASE} : $ENV{LINK_BASE}) . "$target$suffix";
      }
    }gme;
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

# Belt and braces: whatever the rules above did or skipped, nothing relative may ship.
# This scan is deliberately broader than the rewrite: it takes everything up to the
# closing paren and inspects the first token, so a form the rewrite cannot handle -- a
# title shape it does not know, an angle-bracketed destination -- fails the build loudly
# instead of slipping through as a relative link. Wider here, narrower there, on purpose.
leftover=$(
  perl -0777 -ne '
    while (/\]\(([^)]*)\)/g) {
      my $inside = $1;
      $inside =~ s/^[ \t]+//;
      my ($target) = $inside =~ /^(\S+)/;
      next unless defined $target;
      $target =~ s/^<//;
      $target =~ s/>$//;
      print "$target\n" unless $target =~ m{^(?:\w+:|//|\#)};
    }
    # Only the destination token is inspected, whatever follows it, so this stays broader
    # than the rewrite for definitions the way it already is for inline links.
    while (/^\[[^\]]+\]:[ \t]*(\S+)/gm) {
      my $target = $1;
      $target =~ s/^<//;
      $target =~ s/>$//;
      print "$target\n" unless $target =~ m{^(?:\w+:|//|\#)};
    }
  ' "$out" | sort -u
)
if [ -n "$leftover" ]; then
  echo "Error: $SCRIPT_NAME: relative links survived into the listing:" >&2
  printf '%s\n' "$leftover" | sed 's/^/  /' >&2
  die "a relative link on a marketplace page resolves against the marketplace"
fi
