// Builds the static site into ./docs (GitHub Pages serves that folder).
// No dependencies: node build.mjs [--base=/repo-name/] [--site=https://name.github.io/repo-name/]
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'docs');
const BASE = (process.argv.find(a => a.startsWith('--base=')) || '--base=/').slice(7);
// Full address of the live site (e.g. https://name.github.io/repo/). Social sites need an
// absolute share-image URL, so og:image / og:url are only made absolute when this is given.
const SITE = ((process.argv.find(a => a.startsWith('--site=')) || '--site=').slice(7)).replace(/\/?$/, '/');
const share = (html, page) => SITE === '/' ? html : html
  .replace(/(<meta property="og:image" content=")(?:\.\.\/)?og\.jpg(">)/, `$1${SITE}og.jpg$2`)
  .replace(/(<meta property="og:type"[^>]*>)/, `$1\n  <meta property="og:url" content="${SITE}${page}">`);

// Page order comes from tools/pages.json. Hand-built pages live in src/pages/<hand>.html;
// the rest are generated from the Figma file by tools/convert.py into src/pages/gen/<mag>/.
const ORDER = JSON.parse(readFileSync(join(ROOT, 'tools', 'pages.json'), 'utf8'));
const REPORT = JSON.parse(readFileSync(join(ROOT, 'tools', 'report.json'), 'utf8'));

const MAGAZINES = {
  'ui-ux': {
    title: 'UI/UX Design — Bobby Keerthan',
    description: 'Bobby Keerthan, UI/UX & Graphic Designer. Apps, websites and brands, from someone who has founded two brands.',
    label: 'UI/UX Design',
    other: { href: '../graphic/', label: 'Graphic Design', short: 'Graphic' },
  },
  graphic: {
    title: 'Graphic Design — Bobby Keerthan',
    description: 'Bobby Keerthan, Graphic Designer. Brands, posters and hand-drawn films, from someone who has founded two brands.',
    label: 'Graphic Design',
    other: { href: '../ui-ux/', label: 'UI/UX Design', short: 'UI/UX' },
  },
};

// One Google Fonts request per magazine, with only the families and weights its pages use
const WEIGHT = [['ExtraLight', 200], ['Thin', 100], ['Light', 300], ['SemiBold', 600], ['Semi Bold', 600],
  ['ExtraBold', 800], ['Extra Bold', 800], ['Medium', 500], ['Bold', 700], ['Black', 900]];
function fontsUrl(pairs) {
  const fams = {};
  for (const [family, style] of [['Fraunces', 'Light'], ['Fraunces', 'Regular'], ['Archivo', 'Regular'],
    ['Archivo', 'Medium'], ['Archivo', 'SemiBold'], ...pairs]) {
    const w = (WEIGHT.find(([n]) => style.includes(n)) || [0, 400])[1];
    (fams[family] = fams[family] || new Set()).add(`${style.includes('Italic') ? 1 : 0},${w}`);
  }
  const single = new Set(['Anton', 'Bebas Neue', 'Archivo Black']);
  const q = Object.entries(fams).sort().map(([f, set]) => {
    const name = f.replace(/ /g, '+');
    if (single.has(f)) return `family=${name}`;
    const list = [...set].sort();
    if (f === 'Fraunces') return `family=Fraunces:ital,opsz,wght@${list.map(v => v.replace(',', ',9..144,')).join(';')}`;
    return `family=${name}:ital,wght@${list.join(';')}`;
  });
  return `https://fonts.googleapis.com/css2?${q.join('&amp;')}&amp;display=swap`;
}

const read = p => readFileSync(join(SRC, p), 'utf8');
const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => {
  if (!(k in vars)) throw new Error(`Missing template value ${k}`);
  return vars[k];
});

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const dir of ['css', 'js', 'img', 'vendor', 'apps']) {
  cpSync(join(SRC, dir), join(OUT, dir), { recursive: true });
}
writeFileSync(join(OUT, 'index.html'), share(read('index.html'), ''));
for (const file of ['favicon.svg', 'apple-touch-icon.png', 'og.jpg', '.nojekyll']) {
  if (existsSync(join(SRC, file))) cpSync(join(SRC, file), join(OUT, file));
}
writeFileSync(join(OUT, '404.html'), fill(read('404.html'), { BASE }));

// Minify the copied CSS (comments and whitespace only; a space before ':' is kept because
// it is meaningful in selectors such as `.menu :focus-visible`).
const minCss = css => css
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*([{};,>])\s*/g, '$1')
  .replace(/:\s+/g, ':')
  .replace(/;}/g, '}')
  .trim();
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]);
for (const f of walk(OUT).filter(f => f.endsWith('.css'))) writeFileSync(f, minCss(readFileSync(f, 'utf8')));
// One stylesheet per magazine (fewer round trips before the first paint on phones)
for (const slug of Object.keys(MAGAZINES)) {
  const parts = ['base.css', 'magazine.css', 'pages.css', `pages-gen-${slug}.css`].map(f => readFileSync(join(OUT, 'css', f), 'utf8'));
  writeFileSync(join(OUT, 'css', `bundle-${slug}.css`), parts.join('\n'));
}
for (const f of ['magazine.css', 'pages.css', ...Object.keys(MAGAZINES).map(s => `pages-gen-${s}.css`)]) rmSync(join(OUT, 'css', f));

const template = read('magazine.html');
for (const [slug, mag] of Object.entries(MAGAZINES)) {
  const pages = ORDER[slug]
    .map(p => read(p.hand ? `pages/${p.hand}.html` : `pages/gen/${slug}/${p.slug}.html`).trim())
    .join('\n\n');
  const html = fill(template, {
    TITLE: mag.title,
    DESCRIPTION: mag.description,
    SLUG: slug,
    LABEL: mag.label,
    OTHER_HREF: mag.other.href,
    OTHER_LABEL: mag.other.label,
    OTHER_SHORT: mag.other.short,
    FONTS: fontsUrl(REPORT.fonts[slug] || []),
    PAGES: pages,
  });
  mkdirSync(join(OUT, slug), { recursive: true });
  writeFileSync(join(OUT, slug, 'index.html'), share(html, `${slug}/`));
}

console.log(`Built ${Object.keys(MAGAZINES).length} magazines into docs/ (base ${BASE})`);
