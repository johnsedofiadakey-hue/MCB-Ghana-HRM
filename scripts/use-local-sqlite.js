const fs = require('fs');
const path = require('path');

// Support running from root or from scripts/
const rootDir = process.cwd().endsWith('scripts') ? path.join(process.cwd(), '..') : process.cwd();
const prismaPath = path.join(rootDir, 'server', 'prisma', 'schema.prisma');

console.log('--- LOCAL DB PROVIDER SWAP (SQLITE) ---');
console.log('Target path:', prismaPath);

if (!fs.existsSync(prismaPath)) {
  console.error('❌ Error: schema.prisma not found at', prismaPath);
  process.exit(1);
}

// 1. Swap provider in schema.prisma to sqlite
let schema = fs.readFileSync(prismaPath, 'utf8');

// Robust regex for provider replacement (handles single/double quotes and whitespace)
schema = schema.replace(/provider\s*=\s*["']postgresql["']/g, 'provider = "sqlite"');

if (schema.includes('provider = "sqlite"')) {
  fs.writeFileSync(prismaPath, schema);
  console.log('✅ SUCCESSFULLY swapped schema.prisma to sqlite provider for local dev');
} else {
  console.log('✓ Provider is already sqlite or not found');
}

console.log('--- NEXT STEPS ---');
console.log('1. cd server');
console.log('2. npx prisma generate');
