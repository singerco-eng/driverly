import { motion } from 'framer-motion';
import { Shield, ChevronDown } from 'lucide-react';

const globalCredentials = [
  "Driver's License",
  "Background Check", 
  "Drug Screening",
  "Insurance",
  "Profile Photo",
];

const tripSourceAdditions = [
  {
    name: 'State Brokers',
    shortName: 'MTM / LogistiCare',
    additions: ['HIPAA Training', 'Defensive Driving'],
  },
  {
    name: 'Private Facilities',
    shortName: 'Hospitals / Dialysis',
    additions: ['TB Test', 'Badge Photo'],
  },
  {
    name: 'Insurance Payers',
    shortName: 'Medicare Advantage',
    additions: ['W-9 Form', 'Rate Agreement'],
  },
];

export function GlobalCredentialsSection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-medium text-white mb-3">
            Set it once.{' '}
            <span className="text-gray-500">Apply everywhere.</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Global credentials streamline every driver's onboarding. Trip sources inherit the base 
            and add only what's unique to them.
          </p>
        </motion.div>

        {/* Foundation Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <div className="p-6 rounded-2xl bg-[#232220] border border-[#353330]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#353330] flex items-center justify-center">
                <Shield className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Global Foundation</h3>
                <p className="text-xs text-gray-500">Applies to ALL drivers automatically</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {globalCredentials.map((cred, index) => (
                <motion.div
                  key={cred}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className="px-3 py-1.5 rounded-lg text-sm bg-[#353330] text-gray-300 border border-[#454340]"
                >
                  {cred}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Connecting arrows */}
          <div className="flex justify-center py-4">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-8 text-gray-600"
            >
              <ChevronDown className="w-5 h-5" />
              <ChevronDown className="w-5 h-5" />
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </div>

          {/* Trip Source Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tripSourceAdditions.map((source, index) => (
              <motion.div
                key={source.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="p-4 rounded-2xl bg-[#232220] border border-[#353330]"
              >
                <div className="mb-3">
                  <h4 className="font-medium text-white text-sm">{source.name}</h4>
                  <p className="text-xs text-gray-500">{source.shortName}</p>
                </div>
                
                <div className="space-y-1.5">
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="text-gray-400">✓</span> Inherits global
                  </div>
                  {source.additions.map((addition) => (
                    <div
                      key={addition}
                      className="px-2 py-1 rounded-lg text-xs bg-[#353330] text-gray-300 border border-[#454340]"
                    >
                      + {addition}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center text-sm text-gray-500"
        >
          No duplicate setup. Drivers complete global credentials once, then only the extras per trip source.
        </motion.p>
      </div>
    </section>
  );
}
