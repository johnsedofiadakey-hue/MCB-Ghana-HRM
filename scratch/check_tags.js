const fs = require('fs');
const content = fs.readFileSync('client/src/components/it/EmployeeIDCard.tsx', 'utf8');
const openDivs = (content.match(/<div/g) || []).length;
const closeDivs = (content.match(/<\/div>/g) || []).length;
console.log(`Open: ${openDivs}, Close: ${closeDivs}`);
