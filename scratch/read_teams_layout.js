import fs from 'fs';

const content = fs.readFileSync('web_panel_src/src/App.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 1480; i < 1720; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
