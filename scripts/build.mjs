import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const tsc = join(root, 'node_modules', '.bin', 'tsc');

rmSync(dist, { force: true, recursive: true });

execFileSync(tsc, ['-p', 'tsconfig.esm.json'], { cwd: root, stdio: 'inherit' });
execFileSync(tsc, ['-p', 'tsconfig.cjs.json'], { cwd: root, stdio: 'inherit' });

writeFileSync(join(dist, 'cjs', 'package.json'), '{ "type": "commonjs" }\n');
mkdirSync(join(dist, 'esm'), { recursive: true });
cpSync(join(root, 'scripts', 'esm'), join(dist, 'esm'), { recursive: true });
