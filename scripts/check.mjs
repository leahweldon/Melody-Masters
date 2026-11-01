import { readFile, stat } from 'node:fs/promises';
import { extname, dirname, resolve, sep } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const required = [
  'index.html', 'package.json', 'README.md', 'docs/ARCHITECTURE.md',
  'src/main.js', 'src/styles.css', 'src/game.js', 'src/audio.js',
  'src/catalog.js', 'src/storage.js', 'src/icons.js', 'assets/favicon.svg',
  'assets/screenshots/home-desktop.png', 'assets/screenshots/game-desktop.png',
  '.github/workflows/pages.yml', '.github/workflows/quality.yml',
];
for (const rel of required) {
  const path = resolve(ROOT, rel);
  if (!(await stat(path)).isFile() || !(await readFile(path)).length) {
    throw new Error(`Missing or empty file: ${rel}`);
  }
}
const index = await readFile(resolve(ROOT, 'index.html'), 'utf8');
for (const rel of ['./src/main.js', './src/styles.css', './assets/favicon.svg']) {
  if (!index.includes(rel)) throw new Error(`Missing HTML reference: ${rel}`);
}
const pkg = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
if (Object.keys(pkg.dependencies || {}).length || Object.keys(pkg.devDependencies || {}).length) {
  throw new Error('Expected a zero-dependency application.');
}
for (const rel of ['README.md', 'docs/ARCHITECTURE.md']) {
  const markdown = await readFile(resolve(ROOT, rel), 'utf8');
  const links = [...markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(m => m[1]);
  const htmlAssets = [...markdown.matchAll(/<(?:img|a)\b[^>]*\b(?:src|href)="([^"]+)"/g)].map(m => m[1]);
  for (const link of [...links, ...htmlAssets]) {
    if (/^(?:https?:|mailto:|#)/i.test(link)) continue;
    const file = decodeURIComponent(link.split('#')[0]).replace(/\s+".*"$/, '');
    const path = resolve(ROOT, dirname(rel), file);
    if (path !== ROOT && !path.startsWith(ROOT + sep)) throw new Error(`Link escapes repository root: ${rel} -> ${link}`);
    try { await stat(path); } catch { throw new Error(`Broken local link: ${rel} -> ${link}`); }
  }
}
console.log('PASS: source files, local references, Markdown links and zero-dependency package verified.');
