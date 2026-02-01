import { motion } from 'framer-motion';
import { 
  Building2,
  Globe,
  UserCheck,
  Sparkles,
  Car,
  ClipboardCheck,
  Layers,
  Zap
} from 'lucide-react';

const features = [
  {
    icon: Building2,
    title: 'Trip Source Management',
    description: 'Manage credentials across brokers, Uber Health, Lyft, private facilities, and more. Each source has unique requirements — we handle them all.',
  },
  {
    icon: Globe,
    title: 'Global Credentials',
    description: 'Create once, apply everywhere. Shared credentials automatically sync across all trip sources, eliminating duplicate work.',
  },
  {
    icon: UserCheck,
    title: 'Driver Self-Service',
    description: 'Drivers sign up for work opportunities in their area and complete credentials at their own pace. No more chasing paperwork.',
  },
  {
    icon: Sparkles,
    title: 'AI Credential Builder',
    description: 'Describe what you need, and AI generates the complete workflow — training, quizzes, documents, signatures. Fully customizable.',
  },
  {
    icon: Car,
    title: 'Vehicle Credentialing',
    description: 'Track vehicle-specific requirements separately from drivers. Inspections, registrations, insurance — all in one place.',
  },
  {
    icon: ClipboardCheck,
    title: 'Smart Review Queue',
    description: 'Streamlined admin review with all submitted documents, quiz results, and driver info in one view. Approve or request changes in seconds.',
  },
];

export function FeaturesSection() {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-300">Why Flowcred</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Built for Modern Fleets
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            From single-operator companies to enterprise fleets, our platform scales with your needs.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-6 rounded-2xl bg-gray-800/20 border border-gray-700/50 hover:border-gray-600/50 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                <feature.icon className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Bottom highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-amber-500/10 border border-amber-500/20"
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0">
              <Zap className="w-8 h-8 text-black" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-semibold text-white mb-2">
                Reduce onboarding time by 90%
              </h3>
              <p className="text-gray-400">
                Companies using Flowcred report drivers going from application to road-ready in hours instead of weeks.
                No more paper forms, no more manual follow-ups.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
