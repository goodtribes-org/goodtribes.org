import { auth } from "@/auth";
import { redisPub } from "@/lib/redis";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });

  await redisPub.set(`presence:${session.user.id}`, "1", "EX", 40);
  return new Response(null, { status: 204 });
}
