import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';
import { corsHeaders } from '../_shared/cors.ts';

interface CheckoutRequest {
  companyId: string;
  priceId: string;
  interval: 'monthly' | 'annual';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-12-18.acacia',
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { companyId, priceId } = (await req.json()) as CheckoutRequest;

    if (!companyId || !priceId) {
      return new Response(
        JSON.stringify({ error: 'Missing companyId or priceId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: subscription } = await supabaseAdmin
      .from('company_subscriptions')
      .select('stripe_customer_id, company:companies(name)')
      .eq('company_id', companyId)
      .single();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: subscription?.company?.name,
        metadata: { company_id: companyId },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from('company_subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('company_id', companyId);
    }

    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${appUrl}/admin/billing?success=true`,
      cancel_url: `${appUrl}/admin/billing?canceled=true`,
      metadata: { company_id: companyId },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
