import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.resolve(siteRoot, '..', 'local-agent-bridge');
const destRoot = path.join(siteRoot, 'packages', 'local-agent-bridge');

if (!fs.existsSync(srcRoot)) {
  throw new Error(`Source not found: ${srcRoot}`);
}

fs.rmSync(destRoot, { recursive: true, force: true });
fs.mkdirSync(destRoot, { recursive: true });

for (const file of ['package.json', 'tsconfig.json', 'README.md']) {
  const from = path.join(srcRoot, file);
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, path.join(destRoot, file));
  }
}

for (const dir of ['src', 'bin', 'tests']) {
  const from = path.join(srcRoot, dir);
  if (fs.existsSync(from)) {
    fs.cpSync(from, path.join(destRoot, dir), { recursive: true, force: true });
  }
}

console.log(`Synced local-agent-bridge -> ${path.relative(siteRoot, destRoot)}`);
