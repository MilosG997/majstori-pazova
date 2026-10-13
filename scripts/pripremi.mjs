// Priprema sajta za objavu: kopira samo javne fajlove u dist/ (Netlify objavljuje samo taj folder)
import { rmSync, mkdirSync, cpSync, existsSync } from 'node:fs';

const JAVNO = ['index.html', 'privatnost.html', 'manifest.webmanifest', 'sw.js', 'robots.txt', 'sitemap.xml',
  '_headers', '_redirects', 'icons', 'brand', '.well-known'];

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
for (const f of JAVNO) {
  if (!existsSync(f)) throw new Error(`Nedostaje fajl za objavu: ${f}`);
  cpSync(f, `dist/${f}`, { recursive: true });
}
console.log('dist/ spreman:', JAVNO.join(', '));
