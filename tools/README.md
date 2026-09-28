# tools/

Build helpers. Nothing here is shipped to the browser — `index.html` is the whole app.

## CSS

`index.html` used to carry the Tailwind runtime engine (272 KB), which rebuilt every
stylesheet on each DOM mutation. It now carries a static `<style>` block instead, so
**a class that was never in the source when the CSS was generated has no rule.**
After adding new Tailwind classes, regenerate:

1. `node tools/harvest-classes.js` — collects every class the source can produce into
   `classes.json` (over-inclusive; also prints any `"prefix-".concat(...)` sites, whose
   colours are enumerated across the whole palette in the next step).
2. Serve the repo on `127.0.0.1:8899`, then `node tools/build-css.js` — drives
   `tailwind-engine.js` over those classes once and writes `tw_static.css`.
3. `node tools/verify-css.js` — renders one node per class under the engine and under
   the generated CSS and diffs every computed property. Expect `mismatched: 0`.
4. Replace the `<style>` block in `index.html` with `tw_static.css`.

`tailwind-engine.js` is the engine that was removed from `index.html`, kept only to
generate CSS.

## Icons

`subset-lucide.js` rewrites the bundled icon library down to the icons the source
actually references (35 of 1463), resolving renamed aliases through the export table.
Re-run it after using an icon that was not used before.
