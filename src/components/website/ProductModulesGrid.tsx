import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  CreditCard, 
  Calendar, 
  Smartphone,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const modules = [
  {
    id: 'credentialing',
    name: 'Credentialing',
    description: 'AI-powered credential management for drivers and vehicles. Background checks, training, certifications — all automated.',
    icon: Shield,
    status: 'available',
    href: '/website/credentialing',
    features: ['AI Credential Builder', 'Global Trip Sources', 'Driver & Vehicle Credentials', 'Automated Review Queue'],
  },
  {
    id: 'payments',
    name: 'Payments',
    description: 'Streamlined payment processing and driver payouts. Track earnings, manage deposits, and automate reconciliation.',
    icon: CreditCard,
    status: 'coming-soon',
    features: ['Automated Payouts', 'Earnings Dashboard', 'Tax Documentation', 'Payment History'],
  },
  {
    id: 'scheduling',
    name: 'Scheduling',
    description: 'Smart routing and scheduling for your fleet. Optimize routes, manage availability, and reduce downtime.',
    icon: Calendar,
    status: 'coming-soon',
    features: ['Route Optimization', 'Availability Management', 'Trip Assignment', 'Real-time Tracking'],
  },
  {
    id: 'mobile',
    name: 'Mobile App',
    description: 'Native mobile experience for drivers. Complete credentials, view schedules, and manage earnings on the go.',
    icon: Smartphone,
    status: 'coming-soon',
    features: ['Credential Completion', 'Push Notifications', 'Document Scanning', 'Offline Support'],
  },
];

export function ProductModulesGrid() {
  return (
    <section className="relative py-32">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Complete Fleet Management
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Everything you need to manage your drivers, from onboarding to payouts.
          </p>
        </motion.div>

        {/* Modules grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {modules.map((module, index) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div
                className={cn(
                  'group relative h-full p-8 rounded-2xl border transition-all duration-300',
                  module.status === 'available'
                    ? 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/30 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10'
                    : 'bg-gray-800/20 border-gray-700/50 hover:border-gray-600/50'
                )}
              >
                {/* Status badge */}
                <div className="absolute top-6 right-6">
                  {module.status === 'available' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400/60 text-xs font-medium">
                      Coming Soon
                    </span>
                  )}
                </div>

                {/* Icon */}
                <div className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center mb-6',
                  module.status === 'available'
                    ? 'bg-gradient-to-br from-amber-500 to-amber-600'
                    : 'bg-gray-700/50'
                )}>
                  <module.icon className={cn(
                    'w-7 h-7',
                    module.status === 'available' ? 'text-black' : 'text-gray-400'
                  )} />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-semibold text-white mb-3">{module.name}</h3>
                <p className="text-gray-400 mb-6">{module.description}</p>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {module.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle2 className={cn(
                        'w-4 h-4',
                        module.status === 'available' ? 'text-amber-400' : 'text-gray-500'
                      )} />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {module.status === 'available' && module.href && (
                  <Link
                    to={module.href}
                    className="inline-flex items-center gap-2 text-amber-400 font-medium hover:gap-3 transition-all"
                  >
                    Learn More
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
