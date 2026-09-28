// Drive the runtime Tailwind engine once over every class the source can produce,
// then keep the CSS it generated so the engine itself can be dropped.
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const D = __dirname;

const PALETTE = ['slate','gray','zinc','neutral','stone','red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose'];
const DYNAMIC = [];
for (const c of PALETTE) {
  DYNAMIC.push(`border-${c}-500`, `border-${c}-400`, `border-${c}-200`, `hover:border-${c}-200`,
                `bg-${c}-50`, `text-${c}-700`);
}

const classes = [...new Set([...JSON.parse(fs.readFileSync(D + '/classes.json', 'utf8')), ...DYNAMIC])];

// Page that loads only the engine plus a node carrying every class.
const engine = fs.readFileSync(D + '/tw_engine.js', 'utf8');
const html = `<!DOCTYPE html><html><head><script>${engine}<\/script></head><body>
<div id="all" class="${classes.join(' ').replace(/"/g, '&quot;')}"></div></body></html>`;
fs.writeFileSync(D + '/twgen.html', html);

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.goto('http://127.0.0.1:8899/twgen.html', { waitUntil: 'domcontentloaded' });
  // Let the MutationObserver-driven engine settle: poll until the stylesheet stops growing.
  const css = await p.evaluate(async () => {
    const find = () => [...document.querySelectorAll('style')].find(s => s.textContent.startsWith('/*! tailwindcss'));
    let last = -1, stable = 0;
    for (let i = 0; i < 300; i++) {
      await new Promise(r => setTimeout(r, 100));
      const el = find();
      const len = el ? el.textContent.length : 0;
      if (len === last && len > 0) { if (++stable >= 8) break; } else { stable = 0; last = len; }
    }
    const el = find();
    return el ? el.textContent : '';
  });
  console.log('generated CSS bytes:', css.length, 'classes fed:', classes.length, 'pageErrors:', errs.length);
  fs.writeFileSync(D + '/tw_static.css', css);
  await b.close();
})();
