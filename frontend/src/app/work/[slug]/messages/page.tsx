import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import { postMessage } from "../actions";

const prisma = new PrismaClient();

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const org = await prisma.organisation.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!org) notFound();

  const messages = await prisma.workspaceMessage.findMany({
    where: { organisationId: org.id },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
  });

  return (
    <div>
      <form action={postMessage} className="mb-8">
        <input type="hidden" name="orgId" value={org.id} />
        <input type="hidden" name="slug" value={slug} />
        <textarea
          name="content"
          required
          rows={3}
          placeholder="Write a message..."
          className="w-full border border-muted-teal rounded-lg px-4 py-3 text-sm bg-white focus:outline-none focus:border-seagrass resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            className="bg-seagrass text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-seagrass/80 transition-colors"
          >
            Send
          </button>
        </div>
      </form>

      {messages.length === 0 ? (
        <p className="text-muted-teal italic">No messages yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {messages.map((msg) => {
            const isOwn = msg.authorId === userId;
            return (
              <div
                key={msg.id}
                className={`rounded-xl p-4 ${isOwn ? "bg-seagrass/10 border border-seagrass/30" : "bg-white border border-muted-teal"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{msg.author.name ?? "Unknown"}</span>
                  <span className="text-xs text-dark-slate/50">
                    {msg.createdAt.toLocaleDateString("sv-SE")}
                  </span>
                </div>
                <p className="text-sm text-dark-slate whitespace-pre-wrap">{msg.content}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
