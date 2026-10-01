// Collect every token in the source that could plausibly be a Tailwind class.
const fs = require('fs');
const SRC = '/home/user/Wangplan/index.html';
const OUT = __dirname + '/classes.json';

const s = fs.readFileSync(SRC, 'utf8');

// All string literals (single, double, backtick) — over-inclusive on purpose.
const lits = [];
const re = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
let m;
while ((m = re.exec(s))) lits.push(m[1] ?? m[2] ?? m[3] ?? '');

// Also raw class="..." attributes in the static HTML.
const reAttr = /class\s*=\s*"([^"]*)"/g;
while ((m = reAttr.exec(s))) lits.push(m[1]);

// A token looks like a utility if it matches Tailwind's general shape.
const TOKEN = /^[a-z0-9:_[\]\/.!,%#()+-]+$/i;
const PREFIXES = /^(-?(sm|md|lg|xl|2xl|hover|focus|active|group-hover|peer|first|last|odd|even|disabled|print|dark|motion-safe|motion-reduce|focus-within|focus-visible|aria-[a-z-]+|data-\[[^\]]+\]|\[[^\]]+\]):)*/;

const KNOWN = /^-?(container|sr-only|not-sr-only|aspect|columns|break|box|block|inline|inline-block|inline-flex|inline-grid|flow-root|flex|grid|contents|hidden|table|table-[a-z-]+|list-item|float|clear|isolate|isolation|object|overflow|overscroll|static|fixed|absolute|relative|sticky|inset|top|right|bottom|left|start|end|visible|invisible|collapse|z|basis|grow|shrink|order|col|row|auto-cols|auto-rows|gap|space|divide|place|content|items|justify|self|p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|w|min-w|max-w|h|min-h|max-h|size|font|text|antialiased|subpixel-antialiased|italic|not-italic|normal-nums|ordinal|slashed-zero|lining-nums|oldstyle-nums|proportional-nums|tabular-nums|diagonal-fractions|stacked-fractions|tracking|leading|list|placeholder|underline|overline|line-through|no-underline|decoration|underline-offset|uppercase|lowercase|capitalize|normal-case|truncate|text-ellipsis|text-clip|align|whitespace|break-normal|break-words|break-all|break-keep|hyphens|bg|from|via|to|bg-gradient-to-[a-z]+|rounded|border|border-[a-zxytrbles0-9]*|outline|ring|ring-offset|shadow|opacity|mix-blend|bg-blend|blur|brightness|contrast|drop-shadow|grayscale|hue-rotate|invert|saturate|sepia|backdrop|filter|transition|duration|ease|delay|animate|scale|rotate|translate|skew|origin|accent|appearance|cursor|caret|pointer-events|resize|scroll|snap|touch|select|will-change|fill|stroke|transform|transform-gpu|transform-none|forced-color-adjust|sr|flex-[a-z0-9-]+|grid-cols|grid-rows|grid-flow|indent|bg-clip-[a-z]+)(-.*)?$/;

const set = new Set();
for (const lit of lits) {
  for (const raw of lit.split(/[\s]+/)) {
    if (!raw || raw.length > 60) continue;
    if (!TOKEN.test(raw)) continue;
    const bare = raw.replace(PREFIXES, '').replace(/^!/, '');
    if (!bare) continue;
    if (!KNOWN.test(bare)) continue;
    set.add(raw);
  }
}

// Class fragments built by concatenation, e.g. "text-".concat(c,"-600") -> keep the
// literal halves so we can pair them with every colour the source mentions.
const frags = new Set();
const reFrag = /"([a-z-]+-)"\.concat\(/g;
while ((m = reFrag.exec(s))) frags.add(m[1]);

// Never drop what the shipped stylesheet already has: a class built at runtime in a way
// this scan can't see would otherwise lose its rule. Regenerating is then always a superset.
const mk = s.indexOf('<!-- Tailwind CSS v3 — precompiled');
if (mk >= 0) {
  const a = s.indexOf('<style>', mk), b = s.indexOf('</style>', a);
  const css = s.slice(a + 7, b);
  const reSel = /\.((?:\\.|[A-Za-z0-9_-])+)/g;
  let k = 0;
  while ((m = reSel.exec(css))) { const c = m[1].replace(/\\(.)/g, '$1'); if (!/^\d/.test(c)) { set.add(c); k++; } }
  console.log('kept from current stylesheet:', k);
}

// Colour classes assembled by concatenation ("bg-".concat(color,"-600")): expand every
// shade for each Tailwind colour name the data actually passes in (color:"orange" …).
const PALETTE = ['slate','gray','zinc','neutral','stone','red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose'];
const used = new Set();
const reCol = new RegExp('color:"(' + PALETTE.join('|') + ')"', 'g');
while ((m = reCol.exec(s))) used.add(m[1]);
for (const c of used) for (const sh of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]) {
  for (const f of ['bg', 'text', 'border']) set.add(`${f}-${c}-${sh}`);
  set.add(`hover:border-${c}-${sh}`); set.add(`hover:bg-${c}-${sh}`);
}
console.log('colours expanded:', [...used].join(' '));

const out = [...set].sort();
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('classes:', out.length);
console.log('concat fragments:', [...frags].sort().join(' '));
