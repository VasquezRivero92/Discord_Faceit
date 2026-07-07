import fs from 'fs';
const content = fs.readFileSync('admin_panel_src/src/App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('apiFetch') && (line.includes('const') || line.includes('function'))) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
