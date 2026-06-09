import type { Metadata } from "next";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

const prisma = new PrismaClient();

export const metadata: Metadata = {
  title: "Arbetsrum — GoodTribes.org",
};

export default async function WorkPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const orgs = await prisma.organisation.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, description: true, imageUrl: true },
  });

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2">Mina arbetsrum</h1>
        <p className="text-lg text-dark-slate/70">Välj en organisation att arbeta i.</p>
      </div>

      {orgs.length === 0 ? (
        <p className="text-muted-teal italic">
          Du är inte med i någon organisation ännu.{" "}
          <Link href="/org" className="underline hover:text-seagrass">
            Utforska organisationer
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orgs.map((org) => (
            <Link
              key={org.id}
              href={`/work/${org.slug}/messages`}
              className="border border-muted-teal rounded-lg p-6 flex gap-4 hover:border-seagrass transition-colors"
            >
              <div className="w-14 h-14 rounded-lg bg-dry-sage flex-shrink-0 overflow-hidden">
                {org.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={org.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl text-dark-slate/30">
                    🏢
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold truncate">{org.name}</h2>
                {org.description && (
                  <p className="text-sm text-dark-slate/70 mt-1 line-clamp-2">{org.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
