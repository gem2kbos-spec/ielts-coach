const fs = require('fs');
const path = require('path');
const { upsertItem } = require('./itemsRepo');

const BANK_DIR = path.join(__dirname, '..', '..', 'data', 'question-bank');

function walkJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkJsonFiles(fullPath));
    } else if (entry.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }
  return results;
}

function seed() {
  const files = walkJsonFiles(BANK_DIR).filter((f) => !f.includes(`${path.sep}ideas${path.sep}`));
  let count = 0;
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const entries = Array.isArray(raw) ? raw : [raw];
    for (const entry of entries) {
      upsertItem({ source: 'builtin_public', ...entry });
      count += 1;
    }
  }
  console.log(`[seed] upserted ${count} items from ${files.length} files`);
}

module.exports = { seed };

if (require.main === module) seed();
