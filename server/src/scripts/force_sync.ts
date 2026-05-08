import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🛡️ Emergency Identity Sync: johnsedofiadakey@gmail.com');
  
  const passwordHash = await bcrypt.hash('unlockme', 12);
  
  const user = await prisma.user.upsert({
    where: { email: 'johnsedofiadakey@gmail.com' },
    update: { 
      passwordHash,
      role: 'DEV',
      status: 'ACTIVE'
    },
    create: {
      fullName: 'John Sedofiadakey',
      email: 'johnsedofiadakey@gmail.com',
      passwordHash,
      role: 'DEV',
      status: 'ACTIVE',
      jobTitle: 'System Architect'
    }
  });

  console.log('✅ Identity Verified and Password Synchronized:', user.email);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Sync Failed:', err);
  process.exit(1);
});
