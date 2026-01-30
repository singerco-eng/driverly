import { supabase } from '@/integrations/supabase/client';
import type {
  BillingPlan,
  CompanySubscription,
  SubscriptionWithPlan,
  OperatorUsage,
  UsageCheckResult,
  BillingStats,
  BillingEvent,
} from '@/types/billing';

// ============ PLANS ============

export async function getAllPlans(): Promise<BillingPlan[]> {
  const { data, error } = await supabase
    .from('billing_plans')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) throw error;
  return data ?? [];
}

export async function getPlanBySlug(slug: string): Promise<BillingPlan | null> {
  const { data, error } = await supabase
    .from('billing_plans')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) return null;
  return data;
}

// ============ SUBSCRIPTIONS ============

export async function getCompanySubscription(
  companyId: string
): Promise<SubscriptionWithPlan | null> {
  const { data, error } = await supabase
    .from('company_subscriptions')
    .select('*, plan:billing_plans(*)')
    .eq('company_id', companyId)
    .single();

  if (error) return null;
  return data as SubscriptionWithPlan;
}

export async function getAllSubscriptions(): Promise<SubscriptionWithPlan[]> {
  const { data, error } = await supabase
    .from('company_subscriptions')
    .select('*, plan:billing_plans(*), company:companies(name)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ============ USAGE ============

export async function getOperatorUsage(companyId: string): Promise<OperatorUsage> {
  const subscription = await getCompanySubscription(companyId);

  const { count: driverCount } = await supabase
    .from('drivers')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  const { count: vehicleCount } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  const operatorCount = (driverCount ?? 0) + (vehicleCount ?? 0);
  const limit =
    subscription?.operator_limit_override ?? subscription?.plan?.operator_limit ?? null;
  const percentage = limit ? Math.round((operatorCount / limit) * 100) : 0;

  return {
    driver_count: driverCount ?? 0,
    vehicle_count: vehicleCount ?? 0,
    operator_count: operatorCount,
    operator_limit: limit,
    operator_percentage: Math.min(percentage, 100),
    is_over_limit: limit !== null && operatorCount >= limit,
    is_at_warning_threshold: limit !== null && percentage >= 80,
  };
}

export async function checkCanAddOperator(companyId: string): Promise<UsageCheckResult> {
  const subscription = await getCompanySubscription(companyId);

  if (!subscription) {
    return { allowed: false, current: 0, limit: 0, message: 'No subscription found' };
  }

  if (subscription.never_bill || subscription.status === 'never_bill') {
    return { allowed: true, current: 0, limit: null };
  }

  const usage = await getOperatorUsage(companyId);
  const limit = subscription.operator_limit_override ?? subscription.plan?.operator_limit ?? null;

  if (limit === null) {
    return { allowed: true, current: usage.operator_count, limit };
  }

  const allowed = usage.operator_count < limit;
  return {
    allowed,
    current: usage.operator_count,
    limit,
    message: allowed
      ? undefined
      : `You've reached your operator limit (${usage.operator_count}/${limit}). Upgrade to add more drivers or vehicles.`,
  };
}

// ============ SUPER ADMIN ============

export async function updateSubscription(
  subscriptionId: string,
  updates: Partial<CompanySubscription>
): Promise<void> {
  const { error } = await supabase
    .from('company_subscriptions')
    .update(updates)
    .eq('id', subscriptionId);

  if (error) throw error;
}

export async function setNeverBill(
  companyId: string,
  neverBill: boolean
): Promise<void> {
  const { error } = await supabase
    .from('company_subscriptions')
    .update({
      never_bill: neverBill,
      status: neverBill ? 'never_bill' : 'active',
    })
    .eq('company_id', companyId);

  if (error) throw error;
}

export async function setOperatorLimitOverride(
  companyId: string,
  limit: number | null
): Promise<void> {
  const { error } = await supabase
    .from('company_subscriptions')
    .update({ operator_limit_override: limit })
    .eq('company_id', companyId);

  if (error) throw error;
}

export async function getBillingStats(): Promise<BillingStats> {
  const { data: subscriptions } = await supabase
    .from('company_subscriptions')
    .select('*, plan:billing_plans(slug, price_monthly_cents)');

  const counts = { free: 0, starter: 0, growth: 0, scale: 0, enterprise: 0 };
  let totalMrr = 0;

  for (const sub of subscriptions ?? []) {
    const slug = sub.plan?.slug as keyof typeof counts;
    if (slug && counts[slug] !== undefined) {
      counts[slug]++;
    }
    if (sub.status === 'active' && sub.plan?.price_monthly_cents) {
      totalMrr += sub.plan.price_monthly_cents;
    }
  }

  return {
    total_mrr_cents: totalMrr,
    subscriber_counts: counts,
    total_companies: subscriptions?.length ?? 0,
  };
}

export async function getBillingEvents(limit = 50): Promise<BillingEvent[]> {
  const { data, error } = await supabase
    .from('billing_events')
    .select('*')
    .order('processed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// ============ STRIPE HELPERS ============

export async function createCheckoutSession(
  companyId: string,
  priceId: string,
  interval: 'monthly' | 'annual'
): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { companyId, priceId, interval },
  });

  if (error) throw error;
  return data;
}

export async function createPortalSession(companyId: string): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke('create-portal-session', {
    body: { companyId },
  });

  if (error) throw error;
  return data;
}
