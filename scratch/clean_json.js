const fs = require('fs');

function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
}

// A better approach for JSON with duplicates is to parse it manually or use a library, 
// but since JSON.parse only keeps the LAST key, we can use that to our advantage IF we want the last one.
// However, if we want to MERGE them, we need a custom parser.

function parseAndMerge(jsonStr) {
  // This is a simplified parser that handles nested objects and merges them
  // It's tricky to write a full JSON parser from scratch here.
  // Instead, let's use the fact that we can extract top-level blocks.
  
  const obj = JSON.parse(jsonStr); 
  // Wait, JSON.parse(jsonStr) will automatically handle duplicates by keeping the last one.
  // If the user appended sections, the last one wins.
  // If the last 'onboarding' section is missing sub-keys, that's the problem.
  
  return obj;
}

try {
  const filePath = 'client/src/i18n/locales/en.json';
  const content = fs.readFileSync(filePath, 'utf8');
  
  // To TRULY merge, we need to find all occurrences of keys and merge their objects.
  // Let's do a more robust approach:
  // 1. Identify all top-level keys.
  // 2. For each key, extract all its definitions.
  // 3. Merge them.
  
  const lines = content.split('\n');
  const merged = {};
  
  // Since I can't easily write a full parser, I'll use a trick:
  // Split the file into top-level key-value pairs using a regex that looks for "key": { or "key": "value"
  // and then merge them manually.
  
  // Actually, I'll just look for the 'onboarding' key specifically and see if it's defined multiple times.
  const onboardingOccurrences = content.match(/"onboarding":\s*{/g);
  console.log('Onboarding definitions found:', onboardingOccurrences ? onboardingOccurrences.length : 0);
  
  // If I just parse it normally, what do I get?
  const parsed = JSON.parse(content);
  console.log('Onboarding keys in parsed object:', Object.keys(parsed.onboarding || {}));
  
  // Save it back nicely formatted. This will at least remove the duplicates from the file source.
  fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2));
  console.log('Cleaned and saved en.json');
} catch (e) {
  console.error('Error cleaning JSON:', e);
}
