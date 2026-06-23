import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import { approveJoinRequest, rejectJoinRequest } from "../actions";

const prisma = new PrismaClient();

export default async function AdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();
  const userId = session.user.id;

  const org = await prisma.organisation.findUnique({
    where: { slug },
    select: { id: true, ownerId: true },
  });
  if (!org) notFound();

  const member = await prisma.organisationMember.findUnique({
    where: { organisationId_userId: { organisationId: org.id, userId } },
    select: { role: true },
  });

  const isAdmin = org.ownerId === userId || member?.role === "admin";
  if (!isAdmin) notFound();

  const requests = await prisma.organisationJoinRequest.findMany({
    where: { organisationId: org.id, status: "pending" },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Pending applications</h2>

      {requests.length === 0 ? (
        <p className="text-muted-teal italic">No pending applications.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="border border-muted-teal rounded-xl p-5 bg-white flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-medium">{req.user.name ?? "Unnamed"}</p>
                <p className="text-sm text-dark-slate/60">{req.user.email}</p>
                <p className="text-xs text-dark-slate/40 mt-0.5">
                  {req.createdAt.toLocaleDateString("sv-SE")}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <form action={approveJoinRequest}>
                  <input type="hidden" name="requestId" value={req.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <button
                    type="submit"
                    className="bg-seagrass text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-seagrass/80 transition-colors"
                  >
                    Approve
                  </button>
                </form>
                <form action={rejectJoinRequest}>
                  <input type="hidden" name="requestId" value={req.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <button
                    type="submit"
                    className="bg-white text-dark-slate border border-muted-teal text-sm font-medium px-4 py-2 rounded-md hover:border-coral hover:text-coral transition-colors"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
