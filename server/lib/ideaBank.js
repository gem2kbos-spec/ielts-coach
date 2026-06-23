const fs = require('fs');
const path = require('path');

const IDEAS_DIR = path.join(__dirname, '..', '..', 'data', 'question-bank', 'speaking', 'part3', 'ideas');

function getIdeas(topic) {
  const file = path.join(IDEAS_DIR, `${topic}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

module.exports = { getIdeas };
