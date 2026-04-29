"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeFirebase = exports.admin = void 0;
const admin = __importStar(require("firebase-admin"));
exports.admin = admin;
const initializeFirebase = () => {
    if (admin.apps.length > 0)
        return;
    try {
        const serviceAccountVar = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT ||
            process.env.FIREBASE_SERVICE_ACCOUNT_NEXUS_HR_PLATFORM ||
            process.env.GOOGLE_DRIVE_KEY_JSON;
        if (serviceAccountVar) {
            console.log(`[FirebaseAdmin] Initializing with ${process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT ? 'FIREBASE_ADMIN_SERVICE_ACCOUNT' : 'GOOGLE_DRIVE_KEY_JSON'} from ENV...`);
            let serviceAccount;
            try {
                // Handle JSON strings or Base64 encoded JSON
                const decoded = serviceAccountVar.startsWith('{')
                    ? serviceAccountVar
                    : Buffer.from(serviceAccountVar, 'base64').toString();
                serviceAccount = JSON.parse(decoded);
                console.log(`[FirebaseAdmin] Initializing for project: ${serviceAccount.project_id} (Client: ${serviceAccount.client_email?.substring(0, 10)}...)`);
                // Fix potential newline issues in private key
                if (serviceAccount && serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }
                else {
                    console.warn('[FirebaseAdmin] No private_key found in service account JSON');
                }
            }
            catch (pErr) {
                console.error('[FirebaseAdmin] Failed to parse service account JSON:', pErr.message);
                throw pErr;
            }
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`
            });
        }
        else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
            console.log('[FirebaseAdmin] Initializing with Individual Env Variables...');
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                }),
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
            });
        }
        else {
            console.warn('[FirebaseAdmin] No Service Account found. Falling back to default credentials (GCP Environment)...');
            admin.initializeApp({
                projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'nexus-hr-platform'
            });
        }
        console.log(`[FirebaseAdmin] Application initialized: [${admin.app().name}]`);
    }
    catch (error) {
        console.error('[FirebaseAdmin] FAILED to initialize:', error.message);
    }
};
exports.initializeFirebase = initializeFirebase;
