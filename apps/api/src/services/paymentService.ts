import Stripe from 'stripe';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { addEnergy, setMaxEnergy } from './energyService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
});

const ENERGY_PACKS = [
  { slug: 'small',  name: 'Small Energy Pack',  energy: 50,  priceId: process.env.STRIPE_PRICE_ENERGY_SMALL  ?? '' },
  { slug: 'medium', name: 'Medium Energy Pack', energy: 150, priceId: process.env.STRIPE_PRICE_ENERGY_MEDIUM ?? '' },
  { slug: 'large',  name: 'Large Energy Pack',  energy: 500, priceId: process.env.STRIPE_PRICE_ENERGY_LARGE  ?? '' },
] as const;

const PREMIUM = {
  slug: 'premium',
  name: 'Iron Citizen Premium',
  priceId: process.env.STRIPE_PRICE_PREMIUM ?? '',
  energyMax: 120,
};

export function listPacks() {
  return [...ENERGY_PACKS, PREMIUM];
}

export async function createCheckout(
  userId: string,
  characterId: string,
  packSlug: string,
): Promise<{ url: string }> {
  const pack = [...ENERGY_PACKS, PREMIUM].find((p) => p.slug === packSlug);
  if (!pack) throw new AppError(400, `Unknown pack: ${packSlug}`);
  if (!pack.priceId) throw new AppError(500, 'Pack price not configured — check STRIPE_PRICE_* env vars.');

  // Get or create Stripe customer
  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found.');

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId, characterId },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
  }

  const isPremium = packSlug === 'premium';
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: isPremium ? 'subscription' : 'payment',
    line_items: [{ price: pack.priceId, quantity: 1 }],
    metadata: { userId, characterId, packSlug, type: isPremium ? 'premium' : 'energy_pack' },
    success_url: `${process.env.FRONTEND_URL}/dashboard?payment=success`,
    cancel_url:  `${process.env.FRONTEND_URL}/shop?payment=cancelled`,
  });

  return { url: session.url! };
}

export async function handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    throw new AppError(400, 'Webhook signature verification failed.');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, characterId, packSlug, type } = session.metadata ?? {};

    if (!userId || !characterId) return;

    if (type === 'energy_pack') {
      const pack = ENERGY_PACKS.find((p) => p.slug === packSlug);
      if (!pack) return;
      await addEnergy(characterId, pack.energy);
    }

    if (type === 'premium') {
      const premiumUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: userId },
        data: { isPremium: true, premiumUntil },
      });
      await setMaxEnergy(characterId, PREMIUM.energyMax);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const customer = await stripe.customers.retrieve(sub.customer as string);
    if (customer.deleted) return;

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customer.id },
      include: { character: true },
    });
    if (!user?.character) return;

    await prisma.user.update({
      where: { id: user.id },
      data: { isPremium: false, premiumUntil: null },
    });
    await setMaxEnergy(user.character.id, 100); // revert to base max
  }
}
