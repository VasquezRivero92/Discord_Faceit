import fs from 'fs';

const content = fs.readFileSync('web_panel_src/src/App.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.toLowerCase().includes('grid') || line.toLowerCase().includes('section') || line.toLowerCase().includes('equipos')) {
    if (line.length < 150) {
      console.log(`Line ${index + 1}: ${line.trim()}`);
    }
  }
});
