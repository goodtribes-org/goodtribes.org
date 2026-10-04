import { randomUUID } from "crypto";
import { redisPub } from "@/lib/redis";
import { parseGuideInput, type GuideInput } from "@/lib/dreamGuide";

// Drömguiden's answers, kept on the server across the login round trip.
// localStorage alone isn't enough: production's magic link opens on
// www.goodtribes.org while the guide runs on goodtribes.org (two origins,
// two separate localStorages), and a link opened in a phone's mail app is
// another browser altogether. The id travels in the callbackUrl (?guide=…);
// the answers themselves never go in a URL. Best effort: with Redis down
// the guide still has localStorage.

const TTL_SECONDS = 24 * 60 * 60;
const TIMEOUT_MS = 2000;
const key = (id: string) => `dream-guide:${id}`;
const ID = /^[0-9a-f-]{36}$/;

export const isStashId = (id: unknown): id is string => typeof id === "string" && ID.test(id);

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("redis timeout")), TIMEOUT_MS))]);
}

export async function stashGuideInput(input: GuideInput): Promise<string | null> {
  const id = randomUUID();
  try {
    await withTimeout(redisPub.set(key(id), JSON.stringify(input), "EX", TTL_SECONDS));
    return id;
  } catch {
    return null;
  }
}

export async function readStashedGuideInput(id: string): Promise<GuideInput | null> {
  if (!isStashId(id)) return null;
  try {
    const raw = await withTimeout(redisPub.get(key(id)));
    return raw ? parseGuideInput(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export async function dropStashedGuideInput(id: string): Promise<void> {
  if (!isStashId(id)) return;
  try {
    await withTimeout(redisPub.del(key(id)));
  } catch {
    // expires by itself
  }
}
