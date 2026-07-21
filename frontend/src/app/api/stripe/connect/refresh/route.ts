import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { APP_URL } from "@/lib/metadata";
import Stripe from "stripe";

// Stripe redirects the browser here when an onboarding Account Link has expired
// (they're short-lived) — regenerate one and bounce straight back to it.
export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get("campaignId");
  if (!campaignId || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.redirect(APP_URL);
  }

  const campaign = await prisma.fundingCampaign.findUnique({
    where: { id: campaignId },
    include: { project: { select: { slug: true } } },
  });
  if (!campaign?.stripeAccountId) {
    return NextResponse.redirect(APP_URL);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const accountLink = await stripe.accountLinks.create({
    account: campaign.stripeAccountId,
    refresh_url: `${APP_URL}/api/stripe/connect/refresh?campaignId=${campaignId}`,
    return_url: `${APP_URL}/projects/${campaign.project.slug}/funding`,
    type: "account_onboarding",
  });

  return NextResponse.redirect(accountLink.url);
}
