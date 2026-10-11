// Renders art/iggys.mjs to a picture: Chromium draws the SVG at twice its size with Fredoka loaded, and the shot is
// scaled down by half (a smooth edge everywhere) and saved as WebP by Python's Pillow.
//   node art/render-iggys.cjs <fredoka.woff2> <out.webp> [out.png]
// Fredoka's latin file from Google Fonts (SIL Open Font License); Playwright from PLAYWRIGHT, or the one installed.
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const [font, out, png = out.replace(/\.webp$/, '') + '@2x.png'] = process.argv.slice(2);
(async () => {
  const svg = execFileSync('node', [path.join(__dirname, 'iggys.mjs')], { maxBuffer: 64e6 }).toString();
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 1066 }, deviceScaleFactor: 2 });
  await p.setContent(`<!doctype html><style>@font-face{font-family:Fredoka;font-weight:300 700;src:url(data:font/woff2;base64,${fs.readFileSync(font).toString('base64')}) format('woff2')}html,body{margin:0;background:#000}svg{display:block}</style>${svg}`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await p.screenshot({ path: png, clip: { x: 0, y: 0, width: 1600, height: 1066 } });
  await b.close();
  execFileSync('python3', ['-c', 'import sys; from PIL import Image; im = Image.open(sys.argv[1]).convert("RGB"); im.resize((1600, 1066), Image.LANCZOS).save(sys.argv[2], "WEBP", quality=86, method=6)', png, out]);
  console.log(out, fs.statSync(out).size, 'bytes');
})().catch((e) => { console.error(e); process.exit(1); });
