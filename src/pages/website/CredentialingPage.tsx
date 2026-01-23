import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Sparkles, 
  Building2, 
  Globe, 
  UserCheck, 
  Car,
  ClipboardCheck,
  Layers,
  CheckCircle2,
  ChevronRight,
  Users,
  FileCheck2
} from 'lucide-react';
import { CredentialBlocksShowcase } from '@/components/website/CredentialBlocksShowcase';
import { FooterCTA } from '@/components/website/FooterCTA';

export default function CredentialingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 ws-bg-grid opacity-20" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold text-[#e8e6e0] mb-6">
                Credentials That
                <br />
                <span className="ws-text-gradient">Actually Get Completed</span>
              </h1>
              
              <p className="text-xl text-gray-400 mb-8 max-w-xl">
                AI-powered credential workflows that drivers finish on the first try.
                From background checks to vehicle inspections, all in one platform.
              </p>

              <div className="flex flex-wrap gap-4">
                <a
                  href="#waitlist"
                  onClick={(e) => {
                    e.preventDefault();
                    document.querySelector('input[type="email"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => document.querySelector<HTMLInputElement>('input[type="email"]')?.focus(), 500);
                  }}
                  className="ws-btn-primary inline-flex items-center gap-2"
                >
                  Join Waitlist
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="#how-it-works"
                  className="ws-btn-secondary inline-flex items-center gap-2"
                >
                  See How It Works
                </a>
              </div>
            </motion.div>

            {/* Floating credential cards */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative h-[500px]">
                {/* Card 1 */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-0 left-0 w-72 p-5 rounded-xl bg-[#232220]/90 border border-[#353330]/60 backdrop-blur"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#e8e6e0]">Background Check</div>
                      <div className="text-xs text-amber-400">Approved</div>
                    </div>
                  </div>
                  <div className="h-2 bg-[#353330] rounded-full overflow-hidden">
                    <div className="h-full w-full bg-amber-500 rounded-full" />
                  </div>
                </motion.div>

                {/* Card 2 */}
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-32 right-0 w-72 p-5 rounded-xl bg-[#232220]/90 border border-amber-500/30 backdrop-blur"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <FileCheck2 className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#e8e6e0]">Drug Test</div>
                      <div className="text-xs text-amber-400">In Review</div>
                    </div>
                  </div>
                  <div className="h-2 bg-[#353330] rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-amber-500 rounded-full" />
                  </div>
                </motion.div>

                {/* Card 3 */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute bottom-20 left-10 w-72 p-5 rounded-xl bg-[#232220]/90 border border-[#353330]/60 backdrop-blur"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Car className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#e8e6e0]">Vehicle Inspection</div>
                      <div className="text-xs text-[#918e8a]">3 of 5 steps</div>
                    </div>
                  </div>
                  <div className="h-2 bg-[#353330] rounded-full overflow-hidden">
                    <div className="h-full w-3/5 bg-amber-500 rounded-full" />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              A complete system for managing credentials across trip sources, drivers, and vehicles.
            </p>
          </motion.div>

          {/* Three column flow */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Trip Sources */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="p-8 rounded-2xl bg-[#232220]/50 border border-[#353330]/60 h-full">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center mb-6">
                  <Building2 className="w-7 h-7 text-[#1a1917]" />
                </div>
                <h3 className="text-2xl font-semibold text-[#e8e6e0] mb-3">1. Trip Sources</h3>
                <p className="text-[#918e8a] mb-6">
                  Connect your brokers, platforms, and facilities. Each source has unique credential requirements.
                </p>
                <ul className="space-y-3">
                  {['Healthcare Partners', 'Medical Facilities', 'Private Facilities', 'Medical Transport Brokers'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-[#b5b2ad]">
                      <ChevronRight className="w-4 h-4 text-amber-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-[#494644] to-transparent" />
            </motion.div>

            {/* Global Credentials */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="relative"
            >
              <div className="p-8 rounded-2xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/30 h-full">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mb-6">
                  <Globe className="w-7 h-7 text-[#1a1917]" />
                </div>
                <h3 className="text-2xl font-semibold text-[#e8e6e0] mb-3">2. Global Credentials</h3>
                <p className="text-[#918e8a] mb-6">
                  Create universal credentials that apply everywhere. No more duplicate work.
                </p>
                <ul className="space-y-3">
                  {['Background Checks', 'Drug Tests', 'Training Modules', 'Certifications'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-[#b5b2ad]">
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-[#494644] to-transparent" />
            </motion.div>

            {/* Driver & Vehicle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="p-8 rounded-2xl bg-[#232220]/50 border border-[#353330]/60 h-full">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mb-6">
                  <Users className="w-7 h-7 text-[#1a1917]" />
                </div>
                <h3 className="text-2xl font-semibold text-[#e8e6e0] mb-3">3. Drivers & Vehicles</h3>
                <p className="text-[#918e8a] mb-6">
                  Separate tracking for driver and vehicle credentials. Everything in one place.
                </p>
                <ul className="space-y-3">
                  {['Driver License Verification', 'Vehicle Registration', 'Insurance Documents', 'Inspection Reports'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-[#b5b2ad]">
                      <ChevronRight className="w-4 h-4 text-amber-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* AI Credential Builder Section */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-[#e8e6e0] mb-6">
                AI Credential Builder
              </h2>
              
              <p className="text-xl text-gray-400 mb-8">
                Describe what you need in plain English. Our AI generates complete credential 
                workflows with training, quizzes, document collection, and e-signatures.
              </p>

              <div className="space-y-4">
                {[
                  'Describe your credential requirements in natural language',
                  'AI generates multi-step workflows automatically',
                  'Customize with 12 different block types',
                  'Preview and test before deploying to drivers',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-amber-400">{i + 1}</span>
                    </div>
                    <span className="text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Demo mockup */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative bg-[#1a1917] rounded-2xl border border-[#353330]/60 overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-[#353330]/60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-[#1a1917]" />
                    </div>
                    <span className="font-medium text-[#e8e6e0]">AI Credential Builder</span>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="mb-4 p-4 rounded-xl bg-[#232220]/60 border border-[#353330]/50">
                    <p className="text-sm text-[#b5b2ad] italic">
                      "Create a HIPAA compliance credential with training video, 
                      quiz questions, acknowledgment form, and e-signature"
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-amber-400 text-sm mb-6">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </motion.div>
                    Generating workflow...
                  </div>

                  <div className="space-y-3">
                    {['Video Block: HIPAA Training', 'Quiz: Comprehension Check', 'Form: Acknowledgment', 'Signature: Compliance Agreement'].map((block, i) => (
                      <motion.div
                        key={block}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.15 }}
                        className="p-3 rounded-lg bg-[#232220]/40 border border-[#353330]/40 text-sm text-[#b5b2ad]"
                      >
                        {block}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Block Types Showcase */}
      <CredentialBlocksShowcase />

      {/* Driver Experience Section */}
      <section className="relative py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Driver Self-Service
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Drivers choose the work they want and complete credentials at their own pace.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Feature list */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              {[
                {
                  icon: UserCheck,
                  title: 'Sign Up for Trip Sources',
                  description: 'Drivers browse available trip sources in their area and sign up for the ones they want to work with.',
                },
                {
                  icon: Layers,
                  title: 'Clear Progress Tracking',
                  description: 'Visual progress bars and step-by-step guidance. Drivers always know exactly what\'s left to complete.',
                },
                {
                  icon: ClipboardCheck,
                  title: 'Complete on Any Device',
                  description: 'Responsive interface works on phones, tablets, and desktops. Drivers complete credentials wherever they are.',
                },
              ].map((feature, i) => (
                <div key={feature.title} className="flex gap-4 p-6 rounded-xl bg-[#232220]/50 border border-[#353330]/60">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <feature.icon className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#e8e6e0] mb-2">{feature.title}</h3>
                    <p className="text-[#918e8a] text-sm">{feature.description}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Mock UI */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-[#1a1917] rounded-2xl border border-[#353330]/60 overflow-hidden">
                <div className="p-4 border-b border-[#353330]/60 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <span className="text-amber-400 font-semibold">JD</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#e8e6e0]">John Driver</div>
                    <div className="text-xs text-[#6b6865]">3 of 5 credentials complete</div>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="text-xs font-medium text-[#6b6865] uppercase">Your Trip Sources</div>
                  {[
                    { name: 'HealthFirst Transport', progress: 100, status: 'complete' },
                    { name: 'MedTrans', progress: 60, status: 'in-progress' },
                    { name: 'Private Facility A', progress: 0, status: 'not-started' },
                  ].map((source) => (
                    <div key={source.name} className="p-4 rounded-xl bg-[#232220]/60 border border-[#353330]/40">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[#e8e6e0]">{source.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          source.status === 'complete' 
                            ? 'bg-amber-500/20 text-amber-400'
                            : source.status === 'in-progress'
                            ? 'bg-amber-500/10 text-amber-300'
                            : 'bg-[#353330]/50 text-[#6b6865]'
                        }`}>
                          {source.status === 'complete' ? 'Complete' : source.status === 'in-progress' ? 'In Progress' : 'Not Started'}
                        </span>
                      </div>
                      <div className="h-2 bg-[#353330] rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all bg-amber-500"
                          style={{ width: `${source.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Admin Review Queue Section */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Streamlined Review Queue
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              See everything in one place. Review documents, quiz results, and approve credentials in seconds.
            </p>
          </motion.div>

          {/* Review UI mockup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-[#1a1917] rounded-2xl border border-[#353330]/60 overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="p-4 border-b border-[#353330]/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="w-5 h-5 text-amber-400" />
                  <span className="font-medium text-[#e8e6e0]">Credential Review Queue</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#918e8a]">12 pending</span>
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                </div>
              </div>
              
              {/* Queue list */}
              <div className="divide-y divide-[#353330]/60">
                {[
                  { name: 'John Driver', cred: 'Background Check', type: 'driver', time: '2 min ago' },
                  { name: 'Toyota Camry (ABC-123)', cred: 'Vehicle Inspection', type: 'vehicle', time: '15 min ago' },
                  { name: 'Sarah Smith', cred: 'Drug Test', type: 'driver', time: '1 hour ago' },
                ].map((item, i) => (
                  <div key={i} className="p-4 flex items-center gap-4 hover:bg-[#232220]/50 transition-colors cursor-pointer">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      item.type === 'driver' ? 'bg-amber-500/20' : 'bg-amber-600/20'
                    }`}>
                      {item.type === 'driver' 
                        ? <Users className="w-5 h-5 text-amber-400" />
                        : <Car className="w-5 h-5 text-amber-500" />
                      }
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[#e8e6e0]">{item.name}</div>
                      <div className="text-xs text-[#6b6865]">{item.cred}</div>
                    </div>
                    <div className="text-xs text-[#6b6865]">{item.time}</div>
                    <button className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors">
                      Review
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <FooterCTA />
    </>
  );
}
