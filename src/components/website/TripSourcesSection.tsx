import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Hospital, Shield, Users, Briefcase } from 'lucide-react';
import { useState, useEffect } from 'react';

const tripSources = [
  {
    type: 'state_broker',
    label: 'State Brokers',
    description: 'Medicaid transportation brokers like MTM, LogistiCare, ModivCare',
    icon: Building2,
    credentials: ['Background Check', 'Drug Screening', 'HIPAA Training', 'Defensive Driving'],
  },
  {
    type: 'facility',
    label: 'Private Facilities',
    description: 'Hospitals, dialysis centers, nursing homes with direct contracts',
    icon: Hospital,
    credentials: ['Facility Orientation', 'TB Test', 'Vaccination Records', 'Badge Photo'],
  },
  {
    type: 'insurance',
    label: 'Insurance & Payers',
    description: 'Medicare Advantage, managed care, health plan networks',
    icon: Shield,
    credentials: ['Insurance Verification', 'W-9 Form', 'Service Agreement', 'Rate Acknowledgment'],
  },
  {
    type: 'private',
    label: 'Private Clients',
    description: 'Families, seniors, and recurring individual clients',
    icon: Users,
    credentials: ['Driver Profile', 'Photo ID', 'References', 'Client Agreement'],
  },
  {
    type: 'corporate',
    label: 'Corporate Contracts',
    description: 'Employer transportation, events, and shuttle services',
    icon: Briefcase,
    credentials: ['Corporate Policy', 'NDA', 'Uniform Guidelines', 'Route Training'],
  },
];

export function TripSourcesSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance carousel every 5 seconds (pauses briefly after manual click)
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % tripSources.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Handle manual dot click - pause auto-advance for 8 seconds
  const handleDotClick = (index: number) => {
    setActiveIndex(index);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 6000);
  };

  const activeSource = tripSources[activeIndex];

  return (
    <section className="py-20 px-4 border-t border-[#353330]/50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-medium text-white mb-3">
            Built for medical transport.{' '}
            <span className="text-gray-500">Ready for anything.</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Every trip source has unique requirements. Define credentials once per source, 
            and drivers see exactly what they need.
          </p>
        </motion.div>

        {/* Carousel Card */}
        <div className="relative min-h-[180px] md:min-h-[140px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSource.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="p-6 rounded-xl border bg-[#232220] border-[#353330]"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-5">
                {/* Source info */}
                <div className="flex items-center gap-4 md:w-80 shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-[#353330] flex items-center justify-center shrink-0">
                    <activeSource.icon className="w-6 h-6 text-gray-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">{activeSource.label}</h3>
                    <p className="text-sm text-gray-500">{activeSource.description}</p>
                  </div>
                </div>

                {/* Credentials */}
                <div className="flex-1 flex flex-wrap gap-2">
                  {activeSource.credentials.map((credential, credIndex) => (
                    <motion.div
                      key={credential}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: credIndex * 0.08 }}
                      className="px-3 py-1.5 rounded-lg text-sm bg-[#353330] text-gray-300 border border-[#454340]"
                    >
                      {credential}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {tripSources.map((source, index) => (
            <button
              key={source.type}
              onClick={() => handleDotClick(index)}
              className={`
                w-2 h-2 rounded-full transition-all duration-300
                ${index === activeIndex 
                  ? 'bg-white w-6' 
                  : 'bg-[#454340] hover:bg-[#555550]'
                }
              `}
              aria-label={`Go to ${source.label}`}
            />
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-sm text-gray-500"
        >
          Create unlimited custom credentials for any trip source. AI helps you build them in seconds.
        </motion.p>
      </div>
    </section>
  );
}
