import { auth } from "@/auth";
import { redisPub, publishToPresence } from "@/lib/redis";

// Called via navigator.sendBeacon on pagehide (see PresenceHeartbeat) so it
// reliably fires during unload — fetch() isn't guaranteed to complete then.
// Explicit signal for the common "closed the tab" case; a crash/network
// drop still just falls back to the 40s presence:${userId} TTL expiring.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });

  await redisPub.del(`presence:${session.user.id}`);
  publishToPresence(session.user.id, { online: false });

  return new Response(null, { status: 204 });
}
