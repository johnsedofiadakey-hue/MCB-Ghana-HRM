"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const workspace_service_1 = require("./services/workspace.service");
require("dotenv/config");
async function verifyFolder() {
    const FOLDER_ID = '11RikvV1L_KlX4xOwHauMICx0dQUduQBQ';
    console.log(`--- Testing Connection to Folder: ${FOLDER_ID} ---`);
    try {
        const drive = await workspace_service_1.GoogleWorkspaceService.getDriveClient();
        console.log('1. Attempting to list files in folder...');
        const response = await drive.files.list({
            q: `'${FOLDER_ID}' in parents and trashed = false`,
            fields: 'files(id, name)',
        });
        console.log(`Found ${response.data.files.length} files. Connection OK!`);
        console.log('2. Attempting a small test upload...');
        const testFile = await drive.files.create({
            requestBody: {
                name: 'nexus-link-test.txt',
                parents: [FOLDER_ID],
            },
            media: {
                mimeType: 'text/plain',
                body: 'MCB-HRM Ghana - Google Drive Link Verified Successfully.',
            },
        });
        console.log('UPLOAD SUCCESS! File ID:', testFile.data.id);
        console.log('\n✅ Your 2TB Cloud Vault is now FULLY ACTIVE.');
        process.exit(0);
    }
    catch (err) {
        console.error('\n❌ CONNECTION FAILED!');
        console.error('Error:', err.message);
        if (err.message.includes('404')) {
            console.error('Tip: Make sure the folder is shared with nexus-hr-platform-backup-bot@nexus-backup-bot.iam.gserviceaccount.com');
        }
        process.exit(1);
    }
}
verifyFolder();
