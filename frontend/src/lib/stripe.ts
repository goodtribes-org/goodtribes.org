export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
