const fs = require('fs');
const en = JSON.parse(fs.readFileSync('en.json', 'utf8'));
const fr = JSON.parse(fs.readFileSync('fr.json', 'utf8'));

function findMissing(obj1, obj2, path = '') {
  for (const key in obj1) {
    const currentPath = path ? `${path}.${key}` : key;
    if (!(key in obj2)) {
      console.log(`Missing in FR: ${currentPath}`);
    } else if (typeof obj1[key] === 'object' && obj1[key] !== null) {
      if (typeof obj2[key] !== 'object' || obj2[key] === null) {
        console.log(`Type mismatch at ${currentPath}: EN is object, FR is ${typeof obj2[key]}`);
      } else {
        findMissing(obj1[key], obj2[key], currentPath);
      }
    }
  }
}

findMissing(en, fr);
