import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";

function csvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function csvRow(cells: Array<string | number | null | undefined>): string {
  return cells.map(csvCell).join(",") + "\n";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
  if (!project) {
    return NextResponse.json({ error: "Projekt hittades inte" }, { status: 404 });
  }
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) {
    return NextResponse.json({ error: "Ej behörig" }, { status: 403 });
  }

  const campaign = await prisma.fundingCampaign.findUnique({
    where: { projectId: project.id },
    include: {
      pledges: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      expenses: { include: { milestone: { select: { title: true } } }, orderBy: { date: "asc" } },
    },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Ingen kampanj hittades" }, { status: 404 });
  }

  let csv = csvRow(["type", "date", "title_or_backer", "amount", "currency", "payment_method", "milestone", "notes"]);

  for (const p of campaign.pledges) {
    csv += csvRow([
      "pledge",
      p.createdAt.toISOString(),
      p.user.name ?? "Anonym",
      p.amount,
      campaign.currency,
      p.paymentMethodType ?? (p.stripeSessionId ? "" : "manual"),
      "",
      p.message ?? "",
    ]);
  }
  for (const e of campaign.expenses) {
    csv += csvRow([
      "expense",
      e.date.toISOString(),
      e.title,
      e.amount,
      campaign.currency,
      "",
      e.milestone?.title ?? "",
      e.description ?? "",
    ]);
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-funding-report.csv"`,
    },
  });
}
