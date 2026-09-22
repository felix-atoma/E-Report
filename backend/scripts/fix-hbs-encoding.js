const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'modules', 'pdf', 'templates', 'report-card.hbs');

const raw = fs.readFileSync(filePath, 'utf8');

const fixed = Buffer.from(raw, 'latin1').toString('utf8');

if (fixed === raw) {
  console.log('No change detected - file may already be correctly encoded.');
} else {
  fs.writeFileSync(filePath, fixed, { encoding: 'utf8' });
  console.log('report-card.hbs encoding fixed and saved.');
}

const sampleMatches = fixed.match(/Moyenne g[ée]n[ée]rale/i);
console.log('Sample check (Moyenne generale):', sampleMatches ? sampleMatches[0] : 'NOT FOUND');
