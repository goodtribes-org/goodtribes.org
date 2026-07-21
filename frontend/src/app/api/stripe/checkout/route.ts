import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
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

  const body = await request.json() as {
    campaignId: string;
    amount: number;
    rewardTierId?: string;
    message?: string;
  };

  const { campaignId, amount, rewardTierId, message } = body;

  if (!campaignId || !amount || amount <= 0) {
    return NextResponse.json({ error: "Ogiltiga parametrar" }, { status: 400 });
  }

  const campaign = await prisma.fundingCampaign.findUnique({
    where: { id: campaignId },
    include: { project: { select: { title: true, slug: true } } },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Kampanj hittades inte" }, { status: 404 });
  }

  if (!campaign.stripeAccountId || campaign.stripeOnboardingStatus !== "complete") {
    return NextResponse.json(
      { error: "Projektet har inte anslutit ett Stripe-konto än", code: "connect_not_ready" },
      { status: 503 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const platformFee = amount * (campaign.platformFee / 100);
  const platformFeeAmount = Math.round(platformFee * 100);

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: buildPaymentMethods(campaign.currency),
    line_items: [
      {
        price_data: {
          currency: campaign.currency.toLowerCase(),
          product_data: {
            name: campaign.title,
            description:
              "Finansiering av " + campaign.project.title + " via GoodTribes",
          },
          unit_amount: amount * 100,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: platformFeeAmount,
      transfer_data: { destination: campaign.stripeAccountId },
    },
    success_url:
      process.env.NEXTAUTH_URL +
      "/projects/" +
      campaign.project.slug +
      "/funding?success=1",
    cancel_url:
      process.env.NEXTAUTH_URL +
      "/projects/" +
      campaign.project.slug +
      "/funding?cancelled=1",
    metadata: {
      campaignId,
      userId: session.user.id,
      amount: amount.toString(),
      rewardTierId: rewardTierId ?? "",
      message: message ?? "",
      platformFeeAmount: platformFeeAmount.toString(),
      campaignType: campaign.campaignType,
      tokenExchangeRate: campaign.tokenExchangeRate?.toString() ?? "",
    },
  });

  return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url });
}

// Klarna and Bancontact each only support a subset of currencies — build the
// method list from the campaign's currency instead of hardcoding one static
// set, since Stripe rejects a Checkout Session offering an incompatible method.
function buildPaymentMethods(currency: string): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  const methods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = ["card"];
  const upper = currency.toUpperCase();
  if (["SEK", "EUR", "DKK", "NOK", "GBP", "USD"].includes(upper)) methods.push("klarna");
  if (upper === "EUR") methods.push("bancontact");
  return methods;
}
