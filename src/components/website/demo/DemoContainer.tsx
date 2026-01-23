import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DemoContainerProps {
  children: React.ReactNode;
  activeTab: string;
  tabs: { id: string; label: string }[];
  onTabChange: (tabId: string) => void;
  url?: string;
}

export function DemoContainer({
  children,
  activeTab,
  tabs,
  onTabChange,
  url = 'app.acme.io',
}: DemoContainerProps) {
  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-amber-500/20 rounded-3xl blur-2xl opacity-40" />

      {/* Browser window */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative bg-[#1a1917] rounded-2xl border border-[#353330]/60 overflow-hidden shadow-2xl"
      >
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
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    'px-4 py-1.5 text-sm font-medium rounded-lg transition-all',
                    activeTab === tab.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* URL bar */}
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-[#1a1917] rounded-lg text-sm text-[#918e8a] min-w-[200px]">
            <div className="w-3 h-3 rounded-full bg-amber-500/50" />
            {url}
          </div>
        </div>

        {/* Content area */}
        <div className="relative min-h-[500px] md:min-h-[550px] overflow-hidden bg-[#1a1917]">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

// Animated indicator showing demo is auto-playing
export function DemoAutoPlayIndicator({ isPlaying }: { isPlaying: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isPlaying ? 1 : 0 }}
      className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20"
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="w-2 h-2 rounded-full bg-amber-400"
      />
      <span className="text-xs text-amber-400 font-medium">Demo</span>
    </motion.div>
  );
}

// Typing animation component
export function TypingText({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);
    let index = 0;

    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setIsComplete(true);
        onComplete?.();
      }
    }, 30);

    return () => clearInterval(timer);
  }, [text, onComplete]);

  return (
    <span>
      {displayedText}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-0.5 h-4 bg-amber-400 ml-0.5 align-middle"
        />
      )}
    </span>
  );
}
