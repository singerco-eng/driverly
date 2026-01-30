import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  ArrowRight, 
  Users, 
  Car
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FooterCTA } from '@/components/website/FooterCTA';

const pricingTiers = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for solo operators and testing',
    monthlyPrice: 0,
    annualPrice: 0,
    operators: '4',
    features: [
      'Up to 4 operators (drivers + vehicles)',
      'Driver self-service portal',
      'Basic credential types',
      'Broker templates',
    ],
    cta: 'Get Started Free',
    popular: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'For small fleets getting started',
    monthlyPrice: 59,
    annualPrice: 490,
    operators: '20',
    features: [
      'Up to 20 operators',
      'Everything in Free',
      'AI Credential Builder',
      'Unlimited credential types',
      'Custom branding',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'For growing transportation companies',
    monthlyPrice: 149,
    annualPrice: 1240,
    operators: '50',
    features: [
      'Up to 50 operators',
      'Everything in Starter',
      'Advanced analytics',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    id: 'scale',
    name: 'Scale',
    description: 'For large fleets with unlimited needs',
    monthlyPrice: 349,
    annualPrice: 2900,
    operators: 'Unlimited',
    features: [
      'Unlimited operators',
      'Everything in Growth',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Waitlist signup:', email);
    setIsSubmitted(true);
  };

  const formatPrice = (monthly: number, annual: number) => {
    if (monthly === 0) return '$0';
    const price = isAnnual ? Math.round(annual / 12) : monthly;
    return `$${price}`;
  };

  const getAnnualSavings = (monthly: number, annual: number) => {
    if (monthly === 0) return null;
    const monthlyCost = monthly * 12;
    const savings = monthlyCost - annual;
    const percentage = Math.round((savings / monthlyCost) * 100);
    return percentage > 0 ? `Save ${percentage}%` : null;
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        {/* Smooth radial gradient background */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 0%, hsl(43 74% 49% / 0.15), transparent 70%)',
          }}
        />
        
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#e8e6e0] mb-6">
              Simple, transparent{' '}
              <span className="ws-text-gradient">pricing</span>
            </h1>
            <p className="text-xl text-[#918e8a] max-w-2xl mx-auto mb-10">
              Start free and scale as you grow. Pay only for what you need.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 p-1.5 rounded-xl bg-[#232220]/60 border border-[#353330]/60">
              <button
                onClick={() => setIsAnnual(false)}
                className={cn(
                  'px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
                  !isAnnual
                    ? 'bg-amber-500 text-[#1a1917]'
                    : 'text-[#918e8a] hover:text-white'
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={cn(
                  'px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                  isAnnual
                    ? 'bg-amber-500 text-[#1a1917]'
                    : 'text-[#918e8a] hover:text-white'
                )}
              >
                Annual
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs',
                  isAnnual 
                    ? 'bg-[#1a1917]/20 text-[#1a1917]'
                    : 'bg-amber-500/20 text-amber-400'
                )}>
                  Save 17%
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingTiers.map((tier, index) => (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={cn(
                  'relative flex flex-col rounded-2xl border transition-all duration-300',
                  tier.popular
                    ? 'bg-gradient-to-b from-amber-500/10 to-transparent border-amber-500/40 shadow-lg shadow-amber-500/10'
                    : 'bg-[#232220]/50 border-[#353330]/60 hover:border-[#454340]'
                )}
              >
                {/* Popular Badge */}
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-amber-500 text-[#1a1917] text-xs font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-6 flex-1">
                  {/* Header */}
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-[#e8e6e0] mb-1">{tier.name}</h3>
                    <p className="text-sm text-[#6b6865]">{tier.description}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-[#e8e6e0]">
                        {formatPrice(tier.monthlyPrice, tier.annualPrice)}
                      </span>
                      {tier.monthlyPrice > 0 && (
                        <span className="text-[#6b6865]">/mo</span>
                      )}
                    </div>
                    {isAnnual && getAnnualSavings(tier.monthlyPrice, tier.annualPrice) && (
                      <p className="text-sm text-amber-400 mt-1">
                        {getAnnualSavings(tier.monthlyPrice, tier.annualPrice)} annually
                      </p>
                    )}
                    {tier.monthlyPrice > 0 && isAnnual && (
                      <p className="text-xs text-[#6b6865] mt-1">
                        Billed ${tier.annualPrice}/year
                      </p>
                    )}
                  </div>

                  {/* Operator limit */}
                  <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-[#1a1917]/50 border border-[#353330]/40">
                    <div className="flex -space-x-1">
                      <Users className="w-4 h-4 text-amber-400" />
                      <Car className="w-4 h-4 text-amber-500" />
                    </div>
                    <span className="text-sm text-[#b5b2ad]">
                      <span className="font-medium text-[#e8e6e0]">{tier.operators}</span> operators
                    </span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className={cn(
                          'w-4 h-4 mt-0.5 shrink-0',
                          tier.popular ? 'text-amber-400' : 'text-[#6b6865]'
                        )} />
                        <span className="text-sm text-[#b5b2ad]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <div className="p-6 pt-0">
                  <button
                    className={cn(
                      'w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2',
                      tier.popular
                        ? 'bg-amber-500 text-[#1a1917] hover:bg-amber-400'
                        : 'bg-[#353330] text-[#e8e6e0] hover:bg-[#454340]'
                    )}
                  >
                    {tier.cta}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#e8e6e0] mb-4">
              Frequently asked questions
            </h2>
          </motion.div>

          <div className="space-y-4">
            {[
              {
                q: 'What counts as an operator?',
                a: 'An operator is any driver or vehicle in your system. If you have 10 drivers and 5 vehicles, you\'re using 15 operators. This combined count makes billing simpler and fairer for companies with different driver-to-vehicle ratios.',
              },
              {
                q: 'Can I change plans anytime?',
                a: 'Yes! You can upgrade or downgrade at any time. When upgrading, you\'ll get immediate access to new features. When downgrading, changes take effect at your next billing cycle.',
              },
              {
                q: 'Is there a free trial?',
                a: 'The Free tier is permanent, not a trial. You can use it indefinitely with up to 4 operators. Paid plans also include a 14-day free trial so you can test all features before committing.',
              },
              {
                q: 'What happens if I exceed my operator limit?',
                a: 'You\'ll see a notification when you\'re approaching your limit. If you exceed it, you can still manage existing operators but won\'t be able to add new ones until you upgrade or remove operators.',
              },
              {
                q: 'Do you offer annual billing discounts?',
                a: 'Yes! Annual billing saves you 17% compared to monthly billing. For example, the Growth plan is $149/month or $1,240/year (equivalent to ~$103/month).',
              },
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="p-6 rounded-xl bg-[#232220]/50 border border-[#353330]/60"
              >
                <h3 className="text-lg font-medium text-[#e8e6e0] mb-2">{faq.q}</h3>
                <p className="text-[#918e8a] text-sm">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <FooterCTA />
    </>
  );
}
