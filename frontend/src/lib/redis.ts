import Redis from "ioredis";
import { EventEmitter } from "events";

const globalForRedis = globalThis as unknown as {
  redisPub?: Redis;
  redisSub?: Redis;
};

export const redisPub = globalForRedis.redisPub ?? new Redis(process.env.REDIS_URL!);
export const redisSub = globalForRedis.redisSub ?? redisPub.duplicate();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisPub = redisPub;
  globalForRedis.redisSub = redisSub;
}

const channelEvents = new EventEmitter();
const refCounts = new Map<string, number>();

redisSub.on("message", (channel, message) => {
  channelEvents.emit(channel, message);
});

// Ref-counted so N open SSE streams for the same channel cost Redis exactly one
// SUBSCRIBE, not N — a raw per-connection Redis client would scale 1:1 with
// open browser tabs and hit Redis's connection ceiling under real load.
function subscribeToChannel(channel: string, listener: (data: string) => void): () => void {
  channelEvents.on(channel, listener);
  refCounts.set(channel, (refCounts.get(channel) ?? 0) + 1);
  if (refCounts.get(channel) === 1) redisSub.subscribe(channel).catch(() => {});

  return () => {
    channelEvents.off(channel, listener);
    const next = (refCounts.get(channel) ?? 1) - 1;
    if (next <= 0) {
      refCounts.delete(channel);
      redisSub.unsubscribe(channel).catch(() => {});
    } else {
      refCounts.set(channel, next);
    }
  };
}

function publishToChannel(channel: string, payload: unknown) {
  redisPub.publish(channel, JSON.stringify(payload)).catch(() => {});
}

export function subscribeToRoom(roomId: string, listener: (data: string) => void): () => void {
  return subscribeToChannel(`room:${roomId}`, listener);
}

export function publishToRoom(roomId: string, payload: unknown) {
  publishToChannel(`room:${roomId}`, payload);
}

export function subscribeToKanban(projectSlug: string, listener: (data: string) => void): () => void {
  return subscribeToChannel(`kanban:${projectSlug}`, listener);
}

export function publishToKanban(projectSlug: string, payload: unknown) {
  publishToChannel(`kanban:${projectSlug}`, payload);
}
