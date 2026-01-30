import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (_err) {
    return new Response(`Webhook signature verification failed`, { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const eventData = event.data.object as Record<string, unknown>;
  await supabaseAdmin.from('billing_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: eventData,
    company_id: (eventData as { metadata?: { company_id?: string } })?.metadata?.company_id ?? null,
  });

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const companyId = sub.metadata?.company_id;

      if (companyId) {
        const priceId = sub.items.data[0]?.price.id;
        const { data: plan } = await supabaseAdmin
          .from('billing_plans')
          .select('id')
          .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_annual.eq.${priceId}`)
          .single();

        const status = sub.status === 'active' ? 'active' : sub.status;

        await supabaseAdmin
          .from('company_subscriptions')
          .update({
            stripe_subscription_id: sub.id,
            plan_id: plan?.id,
            status,
            billing_interval:
              sub.items.data[0]?.price.recurring?.interval === 'year' ? 'annual' : 'monthly',
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
          })
          .eq('company_id', companyId);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const companyId = sub.metadata?.company_id;

      if (companyId) {
        const { data: freePlan } = await supabaseAdmin
          .from('billing_plans')
          .select('id')
          .eq('slug', 'free')
          .single();

        await supabaseAdmin
          .from('company_subscriptions')
          .update({
            plan_id: freePlan?.id,
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            stripe_subscription_id: null,
          })
          .eq('company_id', companyId);
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
