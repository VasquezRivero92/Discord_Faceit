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
execSync('npx tsc && npx vite build', { stdio: 'inherit' });
console.log('Build completed successfully.');
