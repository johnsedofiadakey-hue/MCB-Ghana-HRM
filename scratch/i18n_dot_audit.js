const fs = require('fs');

function auditDots(obj, path = '') {
  let issues = [];
  for (const key in obj) {
    const val = obj[key];
    const currentPath = path ? `${path}.${key}` : key;
    if (typeof val === 'string') {
      // Check if the value contains a dot and looks like it should be a sentence/label
      // e.g. "Onboarding.Manager.Title" instead of "Onboarding Manager Title"
      if (val.includes('.') && !val.includes('...') && !val.startsWith('http') && !val.includes('@')) {
        issues.push({ path: currentPath, value: val });
      }
    } else if (typeof val === 'object' && val !== null) {
      issues = issues.concat(auditDots(val, currentPath));
    }
  }
  return issues;
}

try {
  const en = JSON.parse(fs.readFileSync('client/src/i18n/locales/en.json', 'utf8'));
  const issues = auditDots(en);
  console.log('--- i18n Value Dot Audit ---');
  console.log(`Found ${issues.length} potential issues:`);
  issues.forEach(i => console.log(`  [${i.path}]: "${i.value}"`));
} catch (e) {
  console.error(e);
}
