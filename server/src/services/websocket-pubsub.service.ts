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

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';

const CHANNEL = 'mcb:ws:notify';

// Local connections on THIS instance only
const localClients = new Map<string, Set<WebSocket>>();

function registerLocal(userId: string, ws: WebSocket) {
  if (!localClients.has(userId)) localClients.set(userId, new Set());
  localClients.get(userId)!.add(ws);
  ws.on('close', () => {
    localClients.get(userId)?.delete(ws);
    if (localClients.get(userId)?.size === 0) localClients.delete(userId);
  });
}

function sendLocal(userId: string, payload: unknown) {
  const conns = localClients.get(userId);
  if (!conns) return;
  const msg = JSON.stringify(payload);
  for (const ws of conns) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

// Redis fan-out (only active when REDIS_URL is set)
let publisher: any = null;
let subscriber: any = null;

async function initRedis() {
  if (!process.env.REDIS_URL) return;
  const { createClient } = await import('redis');
  publisher = createClient({ url: process.env.REDIS_URL });
  subscriber = createClient({ url: process.env.REDIS_URL });
  await publisher.connect();
  await subscriber.connect();

  await subscriber.subscribe(CHANNEL, (raw: string) => {
    try {
      const { userId, payload } = JSON.parse(raw);
      sendLocal(userId, payload);
    } catch {}
  });

  console.log('[WS] Redis Pub/Sub adapter active');
}

/**
 * Send a notification to a user — fans out across all instances via Redis,
 * or falls back to local Map when Redis is unavailable.
 */
export async function broadcastToUser(userId: string, payload: unknown) {
  if (publisher) {
    await publisher.publish(CHANNEL, JSON.stringify({ userId, payload }));
  } else {
    sendLocal(userId, payload);
  }
}

/**
 * Call once at server startup. Registers the connection handler and
 * initialises the Redis adapter if REDIS_URL is present.
 */
export async function initRedisAdapter(wss: WebSocketServer) {
  await initRedis();

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // Extract userId from query string: ws://host?token=JWT
    const url = new URL(req.url || '', 'ws://localhost');
    const token = url.searchParams.get('token');
    if (!token) return ws.close(1008, 'Token required');

    try {
      const { id: userId } = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64url').toString()
      ) as { id: string };
      registerLocal(userId, ws);
    } catch {
      ws.close(1008, 'Invalid token');
    }
  });
}
