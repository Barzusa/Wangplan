# tools/

Build helpers. Nothing here is shipped to the browser — `index.html` is the whole app.

## CSS

`index.html` carries a precompiled `<style>` block instead of the Tailwind runtime engine
(which rebuilt every stylesheet on each DOM mutation). So **a class that was never in the
source when the CSS was generated has no rule.** After adding new Tailwind classes, run from
the repo root (no server needed):

1. `node tools/harvest-classes.js` — collects every class the source can produce into
   `tools/classes.json`. It is over-inclusive on purpose, always keeps every class the
   current stylesheet already has (so regenerating never drops a rule), and expands colour
   classes built by concatenation (`"bg-".concat(color,"-600")`) for each colour name the
   data passes in.
2. `node tools/build-css.js` — drives `tailwind-engine.js` over those classes once and
   writes `tools/tw_static.css`.
3. `node tools/verify-css.js` — renders one node per class under the engine and under the
   generated CSS and diffs every computed property. Expect `mismatched: 0`.
4. `node tools/apply-css.js` — puts `tw_static.css` into the precompiled `<style>` block.

`classes.json` and `tw_static.css` are build outputs and are git-ignored.
`tailwind-engine.js` is the engine that was removed from `index.html`, kept only to
generate CSS.

## Icons

`subset-lucide.js` rewrites the bundled icon library down to the icons the source
actually references (35 of 1463), resolving renamed aliases through the export table.
Re-run it after using an icon that was not used before.
