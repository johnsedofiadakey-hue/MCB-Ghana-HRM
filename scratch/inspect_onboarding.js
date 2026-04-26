const fs = require('fs');
const en = JSON.parse(fs.readFileSync('client/src/i18n/locales/en.json', 'utf8'));
console.log('Manager keys:', Object.keys(en.onboarding.manager || {}));
console.log('Manager Content:', JSON.stringify(en.onboarding.manager, null, 2));
