import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"
import { awardTokens } from "@/lib/tokens";
import Stripe from "stripe";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";


export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe ej konfigurerat" },
      { status: 503 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // Never fall back to trusting an unsigned body — that would let anyone
    // POST a fake checkout.session.completed and mint tokens / pledges.
    return NextResponse.json(
      { error: "Stripe webhook ej konfigurerat" },
      { status: 503 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ogiltig signatur";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const status = account.charges_enabled && account.details_submitted ? "complete" : "pending";
    await prisma.fundingCampaign.updateMany({
      where: { stripeAccountId: account.id },
      data: { stripeOnboardingStatus: status },
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};

    const { campaignId, userId, amount, rewardTierId, message, campaignType, tokenExchangeRate } = meta;

    if (!campaignId || !userId || !amount) {
      return NextResponse.json(
        { error: "Saknad metadata" },
        { status: 400 }
      );
    }

    const paymentIntent =
      typeof session.payment_intent === "string"
        ? await stripe.paymentIntents.retrieve(session.payment_intent)
        : session.payment_intent;
    const paymentMethodType = paymentIntent?.payment_method_types?.[0] ?? null;

    try {
      await prisma.$transaction(async (tx) => {
        const pledge = await tx.fundingPledge.create({
          data: {
            campaignId,
            userId,
            amount: parseInt(amount, 10),
            message: message || null,
            rewardTierId: rewardTierId || null,
            stripeSessionId: session.id,
            pledgeStatus: "confirmed",
            paymentMethodType,
          },
        });

        if (campaignType === "token" && tokenExchangeRate) {
          const campaign = await tx.fundingCampaign.findUniqueOrThrow({
            where: { id: campaignId },
            include: { project: { select: { slug: true } } },
          });
          const tokens = parseInt(amount, 10) / parseFloat(tokenExchangeRate);
          const ledgerRow = await awardTokens(tx, {
            userId,
            projectSlug: campaign.project.slug,
            tokens,
            reason: `Token-baserad finansiering: ${campaign.title}`,
            // Belt-and-suspenders alongside the stripeSessionId unique
            // constraint on FundingPledge below: that one only protects
            // *this* transaction from a redelivered webhook, but the ledger
            // shouldn't have to depend on some other table's constraint to
            // stay correct on its own.
            idempotencyKey: session.id,
          });
          await tx.fundingPledge.update({
            where: { id: pledge.id },
            data: { tokenLedgerId: ledgerRow.id },
          });
        }
      });
    } catch (err) {
      // stripeSessionId is unique — a redelivered webhook hits this and should
      // no-op rather than create a second pledge / double-mint tokens.
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
        throw err;
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
