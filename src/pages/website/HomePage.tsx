import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FleetOrchestrationSection } from '@/components/website/FleetOrchestrationSection';
import { GlobalCredentialsSection } from '@/components/website/GlobalCredentialsSection';
import { TripSourcesSection } from '@/components/website/TripSourcesSection';

// Import demo components directly (no iframe needed)
import DemoAdminReview from './demo/DemoAdminReview';
import DemoDriverDashboard from './demo/DemoDriverDashboard';
import DemoCredentialBuilder from './demo/DemoCredentialBuilder';
import { DemoThemeWrapper } from '@/components/website/demo/DemoThemeWrapper';

const DEMO_TABS = [
  { id: 'builder', label: 'AI Credential Builder' },
  { id: 'admin', label: 'Admin Review' },
  { id: 'driver', label: 'Driver Dashboard' },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('builder');
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would submit to your backend
    console.log('Waitlist signup:', email);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#1a1917]">
      {/* Hero section - Cursor style minimal */}
      <section className="pt-8 pb-12 md:pt-12 md:pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-medium text-white leading-tight max-w-3xl mx-auto">
              Driver credentialing that{' '}
              <span className="text-gray-400">actually gets completed.</span>
            </h1>
            <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
              From application to road-ready in hours, not weeks.
            </p>
          </motion.div>

          {/* CTA - Join Waitlist */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex justify-center mb-12"
          >
            {!isSubmitted ? (
              <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your work email"
                  required
                  className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-gray-700/50 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 shrink-0"
                >
                  Join Waitlist
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 px-6 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
              >
                <CheckCircle2 className="w-5 h-5 text-amber-400" />
                <span className="text-amber-400 font-medium">
                  You're on the list! We'll be in touch soon.
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* Product Demo - REAL APP rendered inline (no iframe!) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* Glow effect */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-amber-500/20 rounded-3xl blur-2xl opacity-40" />

              {/* Browser window */}
              <div className="relative bg-[#1a1917] rounded-2xl border border-[#353330]/60 overflow-hidden shadow-2xl">
                {/* Browser chrome */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#232220] border-b border-[#353330]/60">
                  <div className="flex items-center gap-4">
                    {/* Traffic lights */}
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                      <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                      <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                    </div>

                    {/* Tab bar */}
                    <div className="flex gap-1">
                      {DEMO_TABS.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                            activeTab === tab.id
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* URL bar */}
                  <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-[#1a1917] rounded-lg text-sm text-[#918e8a] min-w-[200px]">
                    <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                    app.flowcred.ai/{activeTab}
                  </div>
                </div>

                {/* Content area - REAL APP rendered inline with matching theme */}
                {/* Wrapper prevents actual navigation from demo links using capture phase */}
                <DemoThemeWrapper>
                  <div 
                    className="relative h-[550px] md:h-[600px] overflow-auto"
                    onClickCapture={(e) => {
                      // Prevent any link navigation within the demo (capture phase to intercept before React Router)
                      const target = e.target as HTMLElement;
                      const link = target.closest('a');
                      if (link) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  >
                    {activeTab === 'builder' && <DemoCredentialBuilder embedded />}
                    {activeTab === 'admin' && <DemoAdminReview embedded />}
                    {activeTab === 'driver' && <DemoDriverDashboard embedded />}
                  </div>
                </DemoThemeWrapper>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Fleet Orchestration Section - Animated W2/1099 & Vehicle Management */}
      <FleetOrchestrationSection />

      {/* Global Credentials Section */}
      <GlobalCredentialsSection />

      {/* Trip Sources Section */}
      <TripSourcesSection />

      {/* CTA Section */}
      <section className="py-20 px-4 border-t border-gray-800/50">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">
              Ready to fix driver credentialing?
            </h2>
            <p className="text-gray-500 mb-8">
              Join our carefully curated waitlist. We're onboarding select partners who want to shape the future of driver operations.
            </p>
            
            {!isSubmitted ? (
              <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your work email"
                  required
                  className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-gray-700/50 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
                >
                  Join Waitlist
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-center gap-3 px-6 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 max-w-md mx-auto">
                <CheckCircle2 className="w-5 h-5 text-amber-400" />
                <span className="text-amber-400 font-medium">
                  You're on the list!
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Learn more link */}
      <section className="pb-20 px-4">
        <div className="text-center">
          <Link
            to="/website/credentialing"
            onClick={() => window.scrollTo(0, 0)}
            className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors"
          >
            Learn more about our credentialing platform
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
