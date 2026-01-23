import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export function FooterCTA() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Waitlist signup:', email);
    setIsSubmitted(true);
  };

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 mb-8 shadow-lg shadow-amber-500/25">
            <Sparkles className="w-8 h-8 text-[#1a1917]" />
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-[#e8e6e0] mb-6">
            Ready to modernize your
            <br />
            <span className="ws-text-gradient">driver management?</span>
          </h2>
          
          <p className="text-xl text-[#918e8a] mb-10 max-w-2xl mx-auto">
            Join our carefully curated waitlist. We're onboarding select partners 
            who want to shape the future of driver operations.
          </p>

          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your work email"
                required
                className="w-full sm:flex-1 px-4 py-3.5 rounded-lg bg-[#232220]/60 border border-[#353330]/60 text-[#e8e6e0] placeholder-[#6b6865] focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
              />
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3.5 rounded-lg bg-amber-500 text-[#1a1917] font-medium hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 shrink-0"
              >
                Join Waitlist
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-3 px-6 py-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30"
            >
              <CheckCircle2 className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-medium">
                You're on the list! We'll be in touch soon.
              </span>
            </motion.div>
          )}

          <p className="mt-8 text-sm text-[#6b6865]">
            Limited spots available • Early access for select partners
          </p>
        </motion.div>
      </div>
    </section>
  );
}
