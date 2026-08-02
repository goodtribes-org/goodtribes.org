import { auth } from "@/auth";
import { redisPub, publishToPresence } from "@/lib/redis";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });

  // SET...GET returns the previous value atomically — null means the user
  // was offline a moment ago, so this beat is the offline->online transition
  // worth pushing to anyone watching this user's dot.
  const previous = await redisPub.set(`presence:${session.user.id}`, "1", "EX", 40, "GET");
  if (previous === null) publishToPresence(session.user.id, { online: true });

  return new Response(null, { status: 204 });
}
