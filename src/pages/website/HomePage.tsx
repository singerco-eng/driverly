import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FleetOrchestrationSection } from '@/components/website/FleetOrchestrationSection';
import { GlobalCredentialsSection } from '@/components/website/GlobalCredentialsSection';
import { TripSourcesSection } from '@/components/website/TripSourcesSection';

// Import new agentic chat demo
import DemoAgenticChat from './demo/DemoAgenticChat';
import { DemoThemeWrapper } from '@/components/website/demo/DemoThemeWrapper';

export default function HomePage() {

  return (
    <div className="min-h-screen bg-[#1a1917]">
      {/* Hero section - Cursor style minimal */}
      <section className="pt-8 pb-8 md:pt-12 md:pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Tagline - Cursor style left-aligned */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-xl md:text-2xl font-normal text-gray-400 leading-relaxed max-w-2xl">
              Built to make credentialing effortless,
              <br />
              <span className="text-white">Flowcred is the AI-powered way to onboard drivers.</span>
            </h1>
            <div className="mt-5">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-gray-900 text-sm font-medium rounded-full hover:bg-amber-400 transition-colors"
              >
                Try Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

          {/* Product Demo - Agentic Chat + Preview */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Glow effect */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-amber-500/20 rounded-3xl blur-2xl opacity-40" />

              {/* Browser window */}
              <div className="relative bg-[#1a1917] rounded-2xl border border-[#353330]/60 overflow-hidden shadow-2xl">
                {/* Browser chrome - simplified */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#232220] border-b border-[#353330]/60">
                  <div className="flex items-center gap-4">
                    {/* Traffic lights */}
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                      <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                      <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                    </div>

                    {/* Title */}
                    <span className="text-sm font-medium text-gray-300">
                      AI Credential Builder
                    </span>
                  </div>

                  {/* URL bar */}
                  <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-[#1a1917] rounded-lg text-sm text-[#918e8a] min-w-[200px]">
                    <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                    app.flowcred.ai/builder
                  </div>
                </div>

                {/* Content area - Agentic Chat Demo */}
                <DemoThemeWrapper>
                  <DemoAgenticChat embedded />
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
