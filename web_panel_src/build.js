import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const assetsDir = path.resolve('../public/assets');

console.log('Cleaning assets directory...');
if (fs.existsSync(assetsDir)) {
  fs.rmSync(assetsDir, { recursive: true, force: true });
  console.log('Assets directory cleaned.');
}

console.log('Compiling TypeScript and building Vite bundle...');
const currentDir = import.meta.dirname || path.dirname(new URL(import.meta.url).pathname);
const tscPath = path.resolve(currentDir, 'node_modules/.bin/tsc');
const vitePath = path.resolve(currentDir, 'node_modules/.bin/vite');
execSync(`"${tscPath}" && "${vitePath}" build`, { stdio: 'inherit', cwd: currentDir });
console.log('Build completed successfully.');
