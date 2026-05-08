import * as maintenanceService from './services/maintenance.service';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or server
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

async function testBackup() {
  console.log('--- Starting Cloud Backup Drill ---');
  try {
    const result = await maintenanceService.runBackup();
    console.log('SUCCESS!');
    console.log('Result:', JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err: any) {
    console.error('FAILED!');
    console.error('Error:', err.message);
    process.exit(1);
  }
}

testBackup();
