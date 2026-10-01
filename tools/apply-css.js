// Step 4: put tw_static.css into the precompiled <style> block of index.html.
const fs = require('fs');
const INDEX = __dirname + '/../index.html';
const css = fs.readFileSync(__dirname + '/tw_static.css', 'utf8');
if (/<\/style|<script/i.test(css)) throw new Error('generated CSS contains a tag');
const s = fs.readFileSync(INDEX, 'utf8');
const marker = s.indexOf('<!-- Tailwind CSS v3 — precompiled');
if (marker < 0) throw new Error('precompiled CSS marker not found');
const a = s.indexOf('<style>', marker), b = s.indexOf('</style>', a);
if (a < 0 || b < 0 || a - marker > 400) throw new Error('style block not found right after the marker');
const out = s.slice(0, a + 7) + css + s.slice(b);
fs.writeFileSync(INDEX, out);
console.log('replaced', b - a - 7, 'bytes of CSS with', css.length);
