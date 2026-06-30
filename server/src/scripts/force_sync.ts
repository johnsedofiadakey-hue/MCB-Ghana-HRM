import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🛡️ Emergency Identity Sync: johnsedofiadakey@gmail.com');
  const recoveryPassword = process.env.RECOVERY_ACCOUNT_PASSWORD;
  if (!recoveryPassword || recoveryPassword.length < 16) throw new Error('RECOVERY_ACCOUNT_PASSWORD must be at least 16 characters.');
  const passwordHash = await bcrypt.hash(recoveryPassword, 12);
  
  const user = await prisma.user.upsert({
    where: { email: 'johnsedofiadakey@gmail.com' },
    update: { 
      passwordHash,
      role: 'DEV',
      status: 'ACTIVE',
      mustChangePassword: true
    },
    create: {
      fullName: 'John Sedofiadakey',
      email: 'johnsedofiadakey@gmail.com',
      passwordHash,
      role: 'DEV',
      status: 'ACTIVE',
      mustChangePassword: true,
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
