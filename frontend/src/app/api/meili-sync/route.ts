import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { indexDocuments, ensureLocaleFilterable } from "@/lib/meili";
import { isSiteAdmin } from "@/lib/authz";


// Full reindex of every project/idea/member — expensive (unpaginated
// findMany over all three tables) and previously gated on nothing but being
// logged in, which meant any authenticated user could trigger it on demand.
// Restricted to site admins, or an automated caller presenting CRON_SECRET
// (same bearer-token convention as the /api/cron/* routes) for scheduled
// resyncs.
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const isCronCall = !!cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`;

  if (!isCronCall) {
    const session = await auth();
    if (!session?.user?.id || !(await isSiteAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const [projects, ideas, users] = await Promise.all([
    prisma.project.findMany({
      where: { hiddenAt: null },
      include: { owner: { select: { name: true } }, translations: true },
    }),
    prisma.idea.findMany({
      include: {
        author: { select: { name: true } },
        _count: { select: { votes: true } },
        translations: true,
      },
    }),
    prisma.user.findMany({
      where: { showProfile: true },
    }),
  ]);

  await Promise.all([
    ensureLocaleFilterable("projects"),
    ensureLocaleFilterable("ideas"),
    indexDocuments(
      "projects",
      projects.flatMap((p) => {
        const base = {
          id: `project-${p.slug}`,
          type: "project",
          title: p.title,
          description: p.description ?? "",
          url: `/projects/${p.slug}`,
          phase: p.phase,
          sdgGoals: p.sdgGoals,
          ownerName: p.owner.name ?? "",
          locale: "sv",
        };
        const en = p.translations.find((t) => t.locale === "en");
        return en
          ? [base, { ...base, id: `project-${p.slug}__en`, title: en.title, description: en.description ?? "", locale: "en" }]
          : [base];
      })
    ),
    indexDocuments(
      "ideas",
      ideas.flatMap((i) => {
        const base = {
          id: `idea-${i.id}`,
          type: "idea",
          title: i.title,
          description: i.description ?? "",
          url: `/ideas/${i.id}`,
          authorName: i.author.name ?? "",
          votes: i._count.votes,
          locale: "sv",
        };
        const en = i.translations.find((t) => t.locale === "en");
        return en
          ? [base, { ...base, id: `idea-${i.id}__en`, title: en.title, description: en.description ?? "", locale: "en" }]
          : [base];
      })
    ),
    indexDocuments(
      "members",
      users.map((u) => ({
        id: `member-${u.id}`,
        type: "member",
        title: u.name ?? "",
        description: u.bio ?? "",
        url: `/members/${u.id}`,
      }))
    ),
  ]);

  return NextResponse.json({
    synced: {
      projects: projects.length,
      ideas: ideas.length,
      members: users.length,
    },
  });
}
