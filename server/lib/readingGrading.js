function normalizeAnswer(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]+$/, '')
    .replace(/\s+/g, ' ');
}

module.exports = { normalizeAnswer };
