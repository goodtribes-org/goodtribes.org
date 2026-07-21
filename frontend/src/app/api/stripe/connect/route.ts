import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { APP_URL } from "@/lib/metadata";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Betalning ej konfigurerad", code: "no_stripe" },
      { status: 503 }
    );
  }

  const { campaignId, slug } = (await request.json()) as {
    campaignId: string;
    slug: string;
  };
  if (!campaignId || !slug) {
    return NextResponse.json({ error: "Ogiltiga parametrar" }, { status: 400 });
  }

  const campaign = await prisma.fundingCampaign.findUnique({
    where: { id: campaignId },
    include: { project: { select: { id: true, slug: true } } },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Kampanj hittades inte" }, { status: 404 });
  }
  if (!(await hasProjectRole(campaign.project.id, session.user.id, PROJECT_LEAD_ROLES))) {
    return NextResponse.json({ error: "Ej behörig" }, { status: 403 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let accountId = campaign.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({ type: "express" });
    accountId = account.id;
    await prisma.fundingCampaign.update({
      where: { id: campaignId },
      data: { stripeAccountId: accountId, stripeOnboardingStatus: "pending" },
    });
  }

  const returnUrl = `${APP_URL}/projects/${campaign.project.slug}/funding`;
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${APP_URL}/api/stripe/connect/refresh?campaignId=${campaignId}`,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
