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
conflicts=$(mktemp)
cleanup() {
  rm -f "$stripped" "$targets" "$conflicts"
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
  CONFLICTS="$conflicts" \
  perl -0777 -pe '
    BEGIN {
      open($fh, ">", $ENV{TARGETS}) or die "cannot record link targets: $!";
      open($cfh, ">", $ENV{CONFLICTS}) or die "cannot record label conflicts: $!";
    }
    sub absolute {
      my ($target) = @_;
      return $target =~ m{^(?:\w+:|//|\#)};
    }
    # Which reference labels are used by images, so `[label]: path` can pick the same
    # base an inline image would get. Labels are case-insensitive in Markdown. Both the
    # full form ![alt][label] and the collapsed ![label][] count.
    # Detection runs over a copy with code removed. A bracket inside a code span or a
    # fenced block is prose about Markdown, not Markdown, and counting it can only
    # produce a false conflict -- which refuses to package a README that is entirely
    # correct. The copy is scanned; the document itself is untouched.
    my $scan = $_;
    $scan =~ s/^```.*?^```//gms;
    $scan =~ s/`[^`\n]*`//g;
    my (%image_label, %link_label);
    while ($scan =~ /!\[[^\]]*\]\[([^\]]+)\]/g)      { $image_label{lc $1} = 1 }
    while ($scan =~ /!\[([^\]]*)\]\[\]/g)            { $image_label{lc $1} = 1 }
    # The shortcut form ![label], with no second bracket pair and no parenthesis after.
    while ($scan =~ /!\[([^\]]+)\](?![\[\(])/g)      { $image_label{lc $1} = 1 }
    while ($scan =~ /(?<!!)\[[^\]]*\]\[([^\]]+)\]/g) { $link_label{lc $1} = 1 }
    while ($scan =~ /(?<!!)\[([^\]]*)\]\[\]/g)       { $link_label{lc $1} = 1 }
    # The shortcut link [label], the mirror of the image case above. Every exclusion
    # here was earned: `!` before it is an image, `]` before it is the second half of a
    # full reference which the rules above already classified (counting it here made
    # ![alt][label] register as a link and collide with itself), `[` or `(` after it is
    # some other form, and `:` after it is the definition line, which must not count as
    # a use of its own label. The second lookbehind drops task list markers: `- [x]` is
    # a checkbox, and treating it as a reference to a label named x would refuse any
    # README that has both a task list and an image reference sharing that label.
    while ($scan =~ /(?<![!\]])(?<![-*+] )\[([^\]]+)\](?![\[\(:])/g) {
      $link_label{lc $1} = 1;
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
    # [label]: path -- the base depends on how the label is used, not on the definition,
    # because a definition consumed by ![alt][label] is an image and needs /raw/ too.
    s{^(\[([^\]]+)\]:[ \t]*)(\S+)[ \t]*$}{
      my ($prefix, $label, $target) = ($1, $2, $3);
      my $key = lc $label;
      if (absolute($target)) {
        "$prefix$target";
      } else {
        print $fh "$target\n";
        if ($image_label{$key} && $link_label{$key}) {
          # One definition cannot be both an HTML page and raw bytes. Left relative so
          # the leftover scan also refuses it, and reported by label below.
          print $cfh "$label\n";
          "$prefix$target";
        } else {
          my $base = $image_label{$key} ? $ENV{IMG_BASE} : $ENV{LINK_BASE};
          "$prefix$base$target";
        }
      }
    }gme;
    END { close($fh); close($cfh) }
  ' "$stripped" > "$out"

# A label used by both an image and a link has no single correct base: /raw/ serves the
# bytes an image needs and /blob/ serves the page a link needs. Rather than guess and
# break one of them, name the label and stop.
if [ -s "$conflicts" ]; then
  echo "Error: $SCRIPT_NAME: these reference labels are used by both an image and a" >&2
  echo "  link, so no single base is right for them:" >&2
  sort -u "$conflicts" | sed 's/^/    /' >&2
  die "give the image and the link separate labels"
fi

# A rewritten link is only useful if the file is really there; an absolute URL to a
# missing path is a 404 on the listing instead of a visibly broken relative link.
missing=0
while IFS= read -r target; do
  [ -n "$target" ] || continue
  path="${target%%\#*}"
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
    while (/^\[[^\]]+\]:[ \t]*(\S+)[ \t]*$/gm) {
      print "$1\n" unless $1 =~ m{^(?:\w+:|//|\#)};
    }
  ' "$out" | sort -u
)
if [ -n "$leftover" ]; then
  echo "Error: $SCRIPT_NAME: relative links survived into the listing:" >&2
  printf '%s\n' "$leftover" | sed 's/^/  /' >&2
  die "a relative link on a marketplace page resolves against the marketplace"
fi
