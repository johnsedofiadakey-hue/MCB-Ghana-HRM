"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBucket = void 0;
/**
 * NUCLEAR CONSOLIDATION v2.0
 * This file now re-exports from the centralized firebase-admin service
 * to ensure all legacy code paths share the same initialized instance.
 */
const firebase_admin_1 = require("../services/firebase-admin");
// Ensure initialization
(0, firebase_admin_1.initializeFirebase)();
const isInitialized = firebase_admin_1.admin.apps.length > 0;
const getBucket = () => {
    if (!isInitialized) {
        console.warn('[Firebase] Warning: SDK not fully initialized for storage.');
        return null;
    }
    return firebase_admin_1.admin.storage().bucket();
};
exports.getBucket = getBucket;
exports.default = firebase_admin_1.admin;
