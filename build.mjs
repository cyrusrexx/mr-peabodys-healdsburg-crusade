import * as esbuild from 'esbuild';
import fs from 'fs';
const r = await esbuild.build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false, legalComments: 'none' });
const b64 = (f, mime) => `data:${mime};base64,` + fs.readFileSync(f).toString('base64');
let js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script').replace('__BARK__', b64('assets/bark.mp3', 'audio/mpeg')).replace('__JESS_WAVE__', b64('assets/jess_wave.webp', 'image/webp')).replace('__JESS_CATCH__', b64('assets/jess_catch.webp', 'image/webp')).replace(/__BENCH_([A-Z]+)__/g, (m, n) => b64('assets/bench_' + n.toLowerCase() + '.webp', 'image/webp'));
let html = fs.readFileSync('index.template.html', 'utf8');
html = html.replace('__HILLS__', b64('assets/hills.webp', 'image/webp')).replace('__KEYART__', b64('assets/keyart.jpg', 'image/jpeg'));
html = html.replace('__PETSHOP__', b64('assets/petshop.webp', 'image/webp')).replace('__IGGYS__', b64('assets/iggys.webp', 'image/webp'));
for (const t of ['skybone', 'pupcake', 'zoomie', 'guard', 'magnet']) html = html.replace(`__T_${t}__`, b64(`assets/treat_${t}.webp`, 'image/webp'));
html = html.replace('<!--APP_JS-->', () => `<script>\n${js}\n</script>`);
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', html);
console.log('built', (html.length / 1024).toFixed(0) + 'KB', 'js', (js.length / 1024).toFixed(0) + 'KB');
if (fs.existsSync('assets/peabody-crusade.mp3')) fs.copyFileSync('assets/peabody-crusade.mp3', 'dist/peabody-crusade.mp3'); // background music streams beside index.html
