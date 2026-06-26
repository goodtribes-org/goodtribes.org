import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

export const runtime = "nodejs";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe ej konfigurerat" },
      { status: 503 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (webhookSecret) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ogiltig signatur";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } else {
    // Development: skip signature verification
    try {
      event = JSON.parse(rawBody) as Stripe.Event;
    } catch {
      return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};

    const { campaignId, userId, amount, rewardTierId, message } = meta;

    if (!campaignId || !userId || !amount) {
      return NextResponse.json(
        { error: "Saknad metadata" },
        { status: 400 }
      );
    }

    await prisma.fundingPledge.upsert({
      where: { campaignId_userId: { campaignId, userId } },
      create: {
        campaignId,
        userId,
        amount: parseInt(amount, 10),
        message: message || null,
        rewardTierId: rewardTierId || null,
        stripeSessionId: session.id,
        pledgeStatus: "confirmed",
      },
      update: {
        amount: parseInt(amount, 10),
        stripeSessionId: session.id,
        pledgeStatus: "confirmed",
      },
    });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
