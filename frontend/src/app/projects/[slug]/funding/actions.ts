"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendEmail } from "@/lib/email";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";

export async function createCampaign(projectId: string, slug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: session.user.id } },
  });
  if (!member || !["owner", "admin"].includes(member.role)) redirect(`/projects/${slug}/funding`);

  const title = (formData.get("title") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const goal = parseInt(formData.get("goal") as string, 10);
  const currency = (formData.get("currency") as string) || "SEK";
  const campaignType = (formData.get("campaignType") as string) || "donation";
  const deadlineRaw = formData.get("deadline") as string | null;
  const deadline = deadlineRaw ? new Date(deadlineRaw) : null;
  const platformFee = parseFloat((formData.get("platformFee") as string) || "5");

  if (!title || isNaN(goal) || goal <= 0) return;

  // Parse reward tiers for reward-type campaigns
  const tierTitles = formData.getAll("tierTitle") as string[];
  const tierDescriptions = formData.getAll("tierDescription") as string[];
  const tierMinAmounts = formData.getAll("tierMinAmount") as string[];
  const tierMaxBackers = formData.getAll("tierMaxBackers") as string[];

  const rewardTiers =
    campaignType === "reward"
      ? tierTitles
          .map((title, i) => ({
            title: title.trim(),
            description: tierDescriptions[i]?.trim() || null,
            minAmount: parseInt(tierMinAmounts[i] ?? "0", 10),
            maxBackers: tierMaxBackers[i] ? parseInt(tierMaxBackers[i], 10) || null : null,
            sortOrder: i,
          }))
          .filter((t) => t.title && !isNaN(t.minAmount) && t.minAmount > 0)
      : [];

  await prisma.fundingCampaign.create({
    data: {
      projectId,
      title,
      description,
      goal,
      currency,
      campaignType,
      deadline,
      platformFee,
      ...(rewardTiers.length > 0 && {
        rewardTiers: { create: rewardTiers },
      }),
    },
  });

  revalidatePath(`/projects/${slug}/funding`);
}

export async function pledge(campaignId: string, slug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const amount = parseInt(formData.get("amount") as string, 10);
  const message = (formData.get("message") as string | null)?.trim() || null;

  if (isNaN(amount) || amount <= 0) return;

  const isNew = !(await prisma.fundingPledge.findUnique({
    where: { campaignId_userId: { campaignId, userId: session.user.id } },
    select: { id: true },
  }));

  await prisma.fundingPledge.upsert({
    where: { campaignId_userId: { campaignId, userId: session.user.id } },
    create: { campaignId, userId: session.user.id, amount, message },
    update: { amount, message },
  });

  if (isNew) {
    const [pledger, campaign] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
      prisma.fundingCampaign.findUnique({
        where: { id: campaignId },
        include: {
          project: {
            select: {
              title: true,
              members: {
                where: { role: { in: ["owner", "admin"] } },
                include: { user: { select: { email: true, name: true } } },
              },
            },
          },
        },
      }),
    ]);

    if (campaign) {
      const fmtCurrency = (n: number) =>
        new Intl.NumberFormat("sv-SE", { style: "currency", currency: campaign.currency, maximumFractionDigits: 0 }).format(n);

      await Promise.all(
        campaign.project.members.map((m) =>
          m.user.email
            ? sendEmail({
                to: m.user.email,
                subject: `New pledge for ${campaign.project.title}`,
                html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a2e2a">
  <h2 style="font-size:20px;margin-bottom:8px">New pledge received</h2>
  <p style="color:#4a5e5a;line-height:1.6">
    <strong>${pledger?.name ?? "Someone"}</strong> just pledged
    <strong>${fmtCurrency(amount)}</strong> to your campaign
    <em>${campaign.title}</em>${message ? ` with the message: "<em>${message}</em>"` : ""}.
  </p>
  <a href="${APP_URL}/projects/${slug}/funding"
     style="display:inline-block;margin-top:20px;padding:12px 24px;background:#e85d4a;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
    View campaign &rarr;
  </a>
</div>`,
              })
            : Promise.resolve()
        )
      );
    }
  }

  revalidatePath(`/projects/${slug}/funding`);
}

export async function closeCampaign(campaignId: string, slug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const campaign = await prisma.fundingCampaign.findUnique({
    where: { id: campaignId },
    include: { project: { select: { members: { where: { userId: session.user.id } } } } },
  });
  const role = campaign?.project.members[0]?.role;
  if (!role || !["owner", "admin"].includes(role)) return;

  await prisma.fundingCampaign.update({ where: { id: campaignId }, data: { status: "closed" } });
  revalidatePath(`/projects/${slug}/funding`);
}

export async function addExpense(campaignId: string, slug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const campaign = await prisma.fundingCampaign.findUnique({
    where: { id: campaignId },
    include: { project: { select: { members: { where: { userId: session.user.id } } } } },
  });
  const role = campaign?.project.members[0]?.role;
  if (!role || !["owner", "admin"].includes(role)) return;

  const title = (formData.get("title") as string).trim();
  const amount = parseInt(formData.get("amount") as string, 10);
  const description = (formData.get("description") as string | null)?.trim() || null;

  if (!title || isNaN(amount) || amount <= 0) return;

  await prisma.fundingExpense.create({
    data: { campaignId, title, amount, description },
  });

  revalidatePath(`/projects/${slug}/funding`);
}
