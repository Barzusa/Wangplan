// Prove the static CSS is equivalent to what the runtime engine produces:
// render one node per class under each and diff every computed property.
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const D = __dirname;

const PALETTE = ['slate','gray','zinc','neutral','stone','red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose'];
const DYNAMIC = [];
for (const c of PALETTE) DYNAMIC.push(`border-${c}-500`,`border-${c}-400`,`border-${c}-200`,`hover:border-${c}-200`,`bg-${c}-50`,`text-${c}-700`);
const classes = [...new Set([...JSON.parse(fs.readFileSync(D + '/classes.json','utf8')), ...DYNAMIC])];

const body = classes.map((c, i) => `<div data-i="${i}" class="${c.replace(/"/g,'&quot;')}"></div>`).join('');
const engine = fs.readFileSync(D + '/tailwind-engine.js','utf8');
const css = fs.readFileSync(D + '/tw_static.css','utf8');

const PAGES = {
  engine: `<!DOCTYPE html><html><head><script>${engine}<\/script></head><body>${body}</body></html>`,
  static: `<!DOCTYPE html><html><head><style>${css}</style></head><body>${body}</body></html>`,
};

const snap = async (url, engineMode) => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.setContent(PAGES[url], { waitUntil: 'domcontentloaded' });
  if (engineMode) {
    await p.evaluate(async () => {
      const find = () => [...document.querySelectorAll('style')].find(s => s.textContent.startsWith('/*! tailwindcss'));
      let last = -1, stable = 0;
      for (let i = 0; i < 300; i++) {
        await new Promise(r => setTimeout(r, 100));
        const len = find() ? find().textContent.length : 0;
        if (len === last && len > 0) { if (++stable >= 8) break; } else { stable = 0; last = len; }
      }
    });
  } else { await p.waitForTimeout(500); }
  const out = await p.evaluate(() => [...document.querySelectorAll('div[data-i]')].map(el => {
    const cs = getComputedStyle(el); const o = {};
    for (let i = 0; i < cs.length; i++) o[cs[i]] = cs.getPropertyValue(cs[i]);
    return o;
  }));
  await b.close();
  return out;
};

(async () => {
  const [a, c] = [await snap('engine', true),
                  await snap('static', false)];
  let bad = 0; const examples = [];
  for (let i = 0; i < classes.length; i++) {
    const A = a[i] || {}, C = c[i] || {};
    const props = new Set([...Object.keys(A), ...Object.keys(C)]);
    const diffs = [...props].filter(k => A[k] !== C[k]);
    if (diffs.length) { bad++; if (examples.length < 12) examples.push(classes[i] + ' :: ' + diffs.slice(0,3).map(k => `${k} ${A[k]} -> ${C[k]}`).join('; ')); }
  }
  console.log('classes compared:', classes.length, 'mismatched:', bad);
  examples.forEach(e => console.log(' -', e));
})();
