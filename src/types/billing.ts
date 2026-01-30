export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'trialing'
  | 'paused'
  | 'never_bill';

export type BillingInterval = 'monthly' | 'annual';

export interface BillingPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  stripe_product_id: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_annual: string | null;
  price_monthly_cents: number;
  price_annual_cents: number;
  operator_limit: number | null;
  features: string[];
  display_order: number;
  is_active: boolean;
  is_public: boolean;
  is_contact_sales: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanySubscription {
  id: string;
  company_id: string;
  plan_id: string;
  plan?: BillingPlan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  billing_interval: BillingInterval;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  operator_limit_override: number | null;
  never_bill: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionWithPlan extends CompanySubscription {
  plan: BillingPlan;
}

export interface OperatorUsage {
  driver_count: number;
  vehicle_count: number;
  operator_count: number;
  operator_limit: number | null;
  operator_percentage: number;
  is_over_limit: boolean;
  is_at_warning_threshold: boolean;
}

export interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number | null;
  message?: string;
}

export interface BillingEvent {
  id: string;
  company_id: string | null;
  event_type: string;
  stripe_event_id: string | null;
  payload: Record<string, unknown>;
  processed_at: string;
}

export interface BillingStats {
  total_mrr_cents: number;
  subscriber_counts: {
    free: number;
    starter: number;
    growth: number;
    scale: number;
    enterprise: number;
  };
  total_companies: number;
}
