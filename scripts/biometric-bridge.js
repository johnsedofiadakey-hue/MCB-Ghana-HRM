/**
 * Nexus HR Platform - Biometric Bridge Script
 * 
 * This script serves as a template for synchronizing physical biometric device logs
 * (e.g., ZKTeco, Anviz) with the cloud-hosted Nexus HR Platform platform.
 * 
 * INSTRUCTIONS:
 * 1. Install dependencies: npm install axios
 * 2. Update the configuration below with your API URL and Secret Token.
 * 3. Implement the `fetchDeviceLogs` function to match your hardware's SDK/API.
 * 4. Schedule this script via Cron (Linux) or Task Scheduler (Windows).
 */

const axios = require('axios');

// --- CONFIGURATION ---
const CONFIG = {
  API_URL: process.env.NEXUS_API_URL || 'https://your-nexus-deployment.render.com/api',
  API_TOKEN: process.env.NEXUS_SYNC_TOKEN || 'YOUR_SECURE_TOKEN',
  ORGANIZATION_ID: 'default-tenant',
  DEVICE_ID: 'OFFICE_MAIN_01'
};

/**
 * MOCK: Replace this with actual SDK calls to your biometric device.
 * For ZKTeco, you might use 'zklib' or a vendor-provided DLL/SO.
 */
async function fetchDeviceLogs() {
  console.log(`[${new Date().toISOString()}] Interrogating device ${CONFIG.DEVICE_ID}...`);
  
  // Implementation for ZKTeco might look like:
  // const zk = new ZKLib('192.168.1.201', 4370, 10000, 4000);
  // await zk.createSocket();
  // const logs = await zk.getAttendance();
  
  // Return format expected by Nexus API:
  return [
    {
      biometricId: '101', // Should match 'Biometric Device ID' in Employee Profile
      timestamp: new Date().toISOString(),
      type: 'PUNCH' // Can be CHECKIN, CHECKOUT, or PUNCH (auto-detect)
    }
  ];
}

async function syncToCloud() {
  try {
    const punches = await fetchDeviceLogs();
    
    if (punches.length === 0) {
      console.log('No new punches to sync.');
      return;
    }

    console.log(`Pushing ${punches.length} punches to cloud...`);

    const response = await axios.post(`${CONFIG.API_URL}/attendance/sync`, {
      organizationId: CONFIG.ORGANIZATION_ID,
      punches: punches
    }, {
      headers: {
        'Authorization': `Bearer ${CONFIG.API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Sync Successful:', response.data);
  } catch (error) {
    console.error('Sync Failed:', error.response?.data || error.message);
  }
}

// Run every 5 minutes if executed directly (optional)
// setInterval(syncToCloud, 5 * 60 * 1000);

syncToCloud();
