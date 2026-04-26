const fs = require('fs');

function findDuplicateKeys(jsonStr) {
  const keys = [];
  const regex = /"([^"]+)"\s*:/g;
  let match;
  while ((match = regex.exec(jsonStr)) !== null) {
    keys.push({ key: match[1], pos: match.index });
  }

  const counts = {};
  const duplicates = [];
  keys.forEach(k => {
    counts[k.key] = (counts[k.key] || 0) + 1;
    if (counts[k.key] > 1) {
      duplicates.push(k.key);
    }
  });

  return [...new Set(duplicates)];
}

try {
  const en = fs.readFileSync('client/src/i18n/locales/en.json', 'utf8');
  const dups = findDuplicateKeys(en);
  console.log('Duplicate keys found in en.json:', dups);
} catch (e) {
  console.error(e);
}
