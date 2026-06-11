import type { Metadata } from "next";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";

const prisma = new PrismaClient();

export const metadata: Metadata = {
  title: "Organisationer — GoodTribes.org",
  description: "Organisationer som är anslutna till GoodTribes.org",
};

export default async function OrgListPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const orgs = await prisma.organisation.findMany({
    where: {
      OR: [
        { isPublic: true },
        ...(userId ? [{ ownerId: userId, isPublic: false }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      isPublic: true,
      ownerId: true,
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold mb-2">Organisationer</h1>
          <p className="text-lg text-dark-slate/70">
            Organisationer som söker volontärer och samarbetspartners.
          </p>
        </div>
        {userId && (
          <Link
            href="/org/new"
            className="flex-shrink-0 bg-coral text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-watermelon transition-colors"
          >
            + Ny organisation
          </Link>
        )}
      </div>

      {orgs.length === 0 ? (
        <p className="text-muted-teal italic">Inga organisationer ännu.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orgs.map((org) => (
            <Link
              key={org.id}
              href={`/org/${org.slug}`}
              className="border border-muted-teal rounded-lg p-6 flex gap-4 hover:border-seagrass transition-colors"
            >
              <div className="w-14 h-14 rounded-lg bg-dry-sage flex-shrink-0 overflow-hidden">
                {org.imageUrl ? (
                  <img src={org.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl text-dark-slate/30">
                    🏢
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold truncate">{org.name}</h2>
                  {!org.isPublic && (
                    <span className="text-xs bg-dry-sage text-dark-slate px-2 py-0.5 rounded flex-shrink-0">
                      Privat
                    </span>
                  )}
                </div>
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
