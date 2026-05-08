const fs = require('fs');
const path = require('path');

const prismaPath = path.join(__dirname, '..', 'server', 'prisma', 'schema.prisma');
const envPath = path.join(__dirname, '..', 'server', '.env');

if (!fs.existsSync(prismaPath)) {
  console.error('Error: schema.prisma not found at', prismaPath);
  process.exit(1);
}

// 1. Swap provider in schema.prisma
let schema = fs.readFileSync(prismaPath, 'utf8');
schema = schema.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
fs.writeFileSync(prismaPath, schema);
console.log('✅ Swapped schema.prisma to sqlite provider');

// 2. Ensure local .env uses sqlite URL if it doesn't already
if (fs.existsSync(envPath)) {
  let env = fs.readFileSync(envPath, 'utf8');
  if (!env.includes('file:./prisma/dev.db')) {
     env = env.replace(/DATABASE_URL\s*=\s*".*"/g, 'DATABASE_URL="file:./prisma/dev.db"');
     fs.writeFileSync(envPath, env);
     console.log('✅ Updated local .env to use sqlite DATABASE_URL');
  }
}

console.log('\n--- NEXT STEPS ---');
console.log('1. cd server');
console.log('2. npx prisma generate');
console.log('3. npm run dev');
