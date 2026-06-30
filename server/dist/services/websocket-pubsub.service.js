"use strict";
/**
 * WebSocket Redis Pub/Sub Adapter
 *
 * Drop-in replacement for the in-memory websocket.service.ts Map when running
 * multiple Render instances. Requires REDIS_URL env var.
 *
 * Wire-up (server/src/server.ts or app.ts):
 *   import { initRedisAdapter, broadcastToUser } from './services/websocket-pubsub.service';
 *   initRedisAdapter(wss);
 *
 * USAGE: When REDIS_URL is set this service handles fan-out across instances.
 *        When REDIS_URL is absent it falls back to local Map (single-instance safe).
 */
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
exports.broadcastToUser = broadcastToUser;
exports.initRedisAdapter = initRedisAdapter;
const ws_1 = require("ws");
const CHANNEL = 'mcb:ws:notify';
// Local connections on THIS instance only
const localClients = new Map();
function registerLocal(userId, ws) {
    if (!localClients.has(userId))
        localClients.set(userId, new Set());
    localClients.get(userId).add(ws);
    ws.on('close', () => {
        localClients.get(userId)?.delete(ws);
        if (localClients.get(userId)?.size === 0)
            localClients.delete(userId);
    });
}
function sendLocal(userId, payload) {
    const conns = localClients.get(userId);
    if (!conns)
        return;
    const msg = JSON.stringify(payload);
    for (const ws of conns) {
        if (ws.readyState === ws_1.WebSocket.OPEN)
            ws.send(msg);
    }
}
// Redis fan-out (only active when REDIS_URL is set)
let publisher = null;
let subscriber = null;
async function initRedis() {
    if (!process.env.REDIS_URL)
        return;
    const { createClient } = await Promise.resolve().then(() => __importStar(require('redis')));
    publisher = createClient({ url: process.env.REDIS_URL });
    subscriber = createClient({ url: process.env.REDIS_URL });
    await publisher.connect();
    await subscriber.connect();
    await subscriber.subscribe(CHANNEL, (raw) => {
        try {
            const { userId, payload } = JSON.parse(raw);
            sendLocal(userId, payload);
        }
        catch { }
    });
    console.log('[WS] Redis Pub/Sub adapter active');
}
/**
 * Send a notification to a user — fans out across all instances via Redis,
 * or falls back to local Map when Redis is unavailable.
 */
async function broadcastToUser(userId, payload) {
    if (publisher) {
        await publisher.publish(CHANNEL, JSON.stringify({ userId, payload }));
    }
    else {
        sendLocal(userId, payload);
    }
}
/**
 * Call once at server startup. Registers the connection handler and
 * initialises the Redis adapter if REDIS_URL is present.
 */
async function initRedisAdapter(wss) {
    await initRedis();
    wss.on('connection', (ws, req) => {
        // Extract userId from query string: ws://host?token=JWT
        const url = new URL(req.url || '', 'ws://localhost');
        const token = url.searchParams.get('token');
        if (!token)
            return ws.close(1008, 'Token required');
        try {
            const { id: userId } = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
            registerLocal(userId, ws);
        }
        catch {
            ws.close(1008, 'Invalid token');
        }
    });
}
