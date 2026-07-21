import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { createNotification } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { instanceId, decision } = body as { instanceId?: string; decision?: string };
  if (!instanceId || (decision !== "approved" && decision !== "rejected")) {
    return NextResponse.json({ error: "instanceId och decision (approved|rejected) krävs" }, { status: 400 });
  }

  const instance = await prisma.projectInstance.findUnique({
    where: { id: instanceId },
    include: {
      parent: { select: { id: true, title: true } },
      child: { select: { title: true, slug: true, ownerId: true } },
    },
  });
  if (!instance) {
    return NextResponse.json({ error: "Instansen hittades inte" }, { status: 404 });
  }
  if (!(await hasProjectRole(instance.parent.id, session.user.id, PROJECT_LEAD_ROLES))) {
    return NextResponse.json({ error: "Ej behörig" }, { status: 403 });
  }
  if (instance.status !== "pending") {
    return NextResponse.json({ error: "Instansen är redan granskad" }, { status: 409 });
  }

  await prisma.projectInstance.update({
    where: { id: instanceId },
    data: { status: decision, approvedById: session.user.id },
  });

  await createNotification({
    userId: instance.child.ownerId,
    type: decision === "approved" ? "instance_approved" : "instance_rejected",
    title:
      decision === "approved"
        ? `Din instans "${instance.child.title}" har godkänts`
        : `Din instansansökan för "${instance.parent.title}" avvisades`,
    url: `/projects/${instance.child.slug}`,
  });

  return NextResponse.json({ status: decision });
}
