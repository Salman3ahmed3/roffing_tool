/**
 * Build guard: fail if any built page (visible text or JSON-LD) still contains a "[Something]"
 * placeholder. Runs after `astro build` as part of `npm run build`. No pages are excluded.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { findPlaceholders } from './placeholders.mjs';

const root = process.argv[2] ?? 'dist';
const pages = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.html')) pages.push(p);
  }
};
walk(root);

let problems = 0;
for (const page of pages) {
  const found = findPlaceholders(readFileSync(page, 'utf8'));
  if (found.length) {
    problems += found.length;
    console.error(`✗ ${relative(root, page)}: ${[...new Set(found)].join(', ')}`);
  }
}
if (!pages.length) {
  console.error(`✗ No HTML pages found in ${root}/`);
  process.exit(1);
}
if (problems) {
  console.error(`\nPlaceholder check failed: ${problems} placeholder(s) in built pages. Replace them with real content.`);
  process.exit(1);
}
console.log(`✓ Placeholder check: ${pages.length} pages, none found.`);
