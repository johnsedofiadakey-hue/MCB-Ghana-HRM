const fs = require('fs');

function polish(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Rule 1: If a string looks like a technical key (no spaces, contains dots)
      // and it is NOT an email or URL, replace dots with spaces.
      // e.g. "onboarding.manager.title" -> "Onboarding Manager Title"
      if (obj[key].includes('.') && !obj[key].includes(' ') && !obj[key].includes('@') && !obj[key].startsWith('http')) {
        console.log(`Polishing technical-looking string: "${obj[key]}"`);
        obj[key] = obj[key].replace(/\./g, ' ');
      }
      
      // Rule 2: If a string ends with a dot but is meant to be a short label
      // we'll leave it if it's a period at the end of a sentence.
      
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      polish(obj[key]);
    }
  }
}

try {
  const filePath = 'client/src/i18n/locales/en.json';
  const en = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  polish(en);
  fs.writeFileSync(filePath, JSON.stringify(en, null, 2));
  console.log('Polished all i18n values to ensure professional spacing.');
} catch (e) {
  console.error(e);
}
