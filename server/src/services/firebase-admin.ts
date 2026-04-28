import * as admin from 'firebase-admin';

const initializeFirebase = () => {
    if (admin.apps.length > 0) return;

    try {
        const serviceAccountVar = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT || 
                                 process.env.FIREBASE_SERVICE_ACCOUNT_NEXUS_HR_PLATFORM || 
                                 process.env.GOOGLE_DRIVE_KEY_JSON;
        
        if (serviceAccountVar) {
            console.log(`[FirebaseAdmin] Initializing with ${process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT ? 'FIREBASE_ADMIN_SERVICE_ACCOUNT' : 'GOOGLE_DRIVE_KEY_JSON'} from ENV...`);
            
            let serviceAccount: any;
            try {
                // Handle JSON strings or Base64 encoded JSON
                const decoded = serviceAccountVar.startsWith('{') 
                    ? serviceAccountVar 
                    : Buffer.from(serviceAccountVar, 'base64').toString();
                
                serviceAccount = JSON.parse(decoded);
                
                // Fix potential newline issues in private key
                if (serviceAccount && serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                } else {
                    console.warn('[FirebaseAdmin] No private_key found in service account JSON');
                }
            } catch (pErr: any) {
                console.error('[FirebaseAdmin] Failed to parse service account JSON:', pErr.message);
                throw pErr;
            }

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`
            });
        } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
            console.log('[FirebaseAdmin] Initializing with Individual Env Variables...');
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                }),
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
            });
        } else {
            console.warn('[FirebaseAdmin] No Service Account found. Falling back to default credentials (GCP Environment)...');
            admin.initializeApp({
                projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'nexus-hr-platform'
            });
        }
        console.log(`[FirebaseAdmin] Application initialized: [${admin.app().name}]`);
    } catch (error: any) {
        console.error('[FirebaseAdmin] FAILED to initialize:', error.message);
    }
};

export { admin, initializeFirebase };
