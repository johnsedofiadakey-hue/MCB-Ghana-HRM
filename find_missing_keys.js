
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'client/src/i18n/locales');
const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'));
const fr = JSON.parse(fs.readFileSync(path.join(localesDir, 'fr.json'), 'utf8'));

function getDeepKeys(obj, prefix = '') {
  return Object.keys(obj).reduce((res, el) => {
    if (Array.isArray(obj[el])) {
      return [...res, prefix + el];
    } else if (typeof obj[el] === 'object' && obj[el] !== null) {
      return [...res, ...getDeepKeys(obj[el], prefix + el + '.')];
    }
    return [...res, prefix + el];
  }, []);
}

const enKeys = getDeepKeys(en);
const frKeys = getDeepKeys(fr);

const missingInFr = enKeys.filter(k => !frKeys.includes(k));
const missingInEn = frKeys.filter(k => !enKeys.includes(k));

console.log('--- Missing in FR ---');
console.log(JSON.stringify(missingInFr, null, 2));

console.log('\n--- Missing in EN ---');
console.log(JSON.stringify(missingInEn, null, 2));
