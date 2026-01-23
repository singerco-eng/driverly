import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCheck2,
  User,
  Car,
  CheckCircle2,
  Clock,
  ChevronRight,
  FileText,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  mockReviewQueue,
  formatTimeAgo,
  type MockCredential,
} from '@/pages/website/demo-data/mockCredentials';

interface AdminDemoViewProps {
  isActive: boolean;
}

type DemoStage = 'queue' | 'detail' | 'approving' | 'approved';

export function AdminDemoView({ isActive }: AdminDemoViewProps) {
  const [stage, setStage] = useState<DemoStage>('queue');
  const [selectedCredential, setSelectedCredential] = useState<MockCredential | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  // Reset on deactivation
  useEffect(() => {
    if (!isActive) {
      setStage('queue');
      setSelectedCredential(null);
      setHighlightedIndex(null);
    }
  }, [isActive]);

  // Scripted demo flow
  useEffect(() => {
    if (!isActive) return;

    const timers: NodeJS.Timeout[] = [];

    // Stage 1: Highlight first item
    timers.push(
      setTimeout(() => {
        setHighlightedIndex(0);
      }, 1500)
    );

    // Stage 2: Select it
    timers.push(
      setTimeout(() => {
        setSelectedCredential(mockReviewQueue[0]);
        setStage('detail');
      }, 2500)
    );

    // Stage 3: Show approving state
    timers.push(
      setTimeout(() => {
        setStage('approving');
      }, 5500)
    );

    // Stage 4: Show approved
    timers.push(
      setTimeout(() => {
        setStage('approved');
      }, 7000)
    );

    // Stage 5: Reset and loop
    timers.push(
      setTimeout(() => {
        setStage('queue');
        setSelectedCredential(null);
        setHighlightedIndex(null);
      }, 9500)
    );

    return () => timers.forEach(clearTimeout);
  }, [isActive, stage === 'queue']);

  return (
    <div className="flex h-full min-h-[500px]">
      {/* Left sidebar - Queue */}
      <div className="w-80 border-r border-gray-800/50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-white">Review Queue</span>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">
              {mockReviewQueue.length} pending
            </span>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 text-xs">
            <button className="px-3 py-1.5 rounded-md bg-white/10 text-white font-medium">
              All
            </button>
            <button className="px-3 py-1.5 rounded-md text-gray-400 hover:bg-white/5">
              Drivers
            </button>
            <button className="px-3 py-1.5 rounded-md text-gray-400 hover:bg-white/5">
              Vehicles
            </button>
          </div>
        </div>

        {/* Queue list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {mockReviewQueue.map((credential, index) => (
            <motion.div
              key={credential.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'p-3 rounded-lg border transition-all cursor-pointer',
                selectedCredential?.id === credential.id
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : highlightedIndex === index
                  ? 'bg-white/5 border-amber-500/20'
                  : 'border-transparent hover:bg-white/5'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium shrink-0',
                    credential.driver
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-amber-500/20 text-amber-400'
                  )}
                >
                  {credential.driver ? (
                    credential.driver.initials
                  ) : (
                    <Car className="w-4 h-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-white truncate">
                      {credential.driver?.name ||
                        `${credential.vehicle?.year} ${credential.vehicle?.make}`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {credential.credentialType.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {credential.credentialType.broker && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">
                        {credential.credentialType.broker.name}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {credential.submittedAt && formatTimeAgo(credential.submittedAt)}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right panel - Detail view */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {!selectedCredential ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center"
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-500">Select a credential to review</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col"
            >
              {/* Detail header */}
              <div className="p-4 border-b border-gray-800/50 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">
                    {selectedCredential.credentialType.name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {selectedCredential.driver?.name} · {selectedCredential.driver?.type}
                  </p>
                </div>
                <AnimatePresence mode="wait">
                  {stage === 'approving' && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Clock className="w-4 h-4" />
                      </motion.div>
                      <span className="text-sm font-medium">Processing...</span>
                    </motion.div>
                  )}
                  {stage === 'approved' && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Approved</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Detail content */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {/* Submitted document */}
                <div className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/30">
                  <h4 className="text-sm font-medium text-white mb-3">
                    Uploaded Document
                  </h4>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-white">
                        background_check_authorization.pdf
                      </p>
                      <p className="text-xs text-gray-500">245 KB · Uploaded today</p>
                    </div>
                  </div>
                </div>

                {/* Quiz results */}
                <div className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-white">Quiz Results</h4>
                    <span className="text-sm text-amber-400">3/3 Correct</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      'Purpose of background check',
                      'Validity period',
                      'Data handling consent',
                    ].map((question, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20"
                      >
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-sm text-gray-300">{question}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signature */}
                <div className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/30">
                  <h4 className="text-sm font-medium text-white mb-3">E-Signature</h4>
                  <div className="h-20 rounded-lg bg-gray-900/50 border border-gray-700/30 flex items-center justify-center">
                    <span className="text-2xl italic text-gray-400 font-serif">
                      Marcus Johnson
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Signed on {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              {stage === 'detail' && (
                <div className="p-4 border-t border-gray-800/50 flex gap-3">
                  <button className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500/20 text-amber-400 font-medium hover:bg-amber-500/30 transition-colors flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button className="flex-1 px-4 py-2.5 rounded-lg bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2">
                    <X className="w-4 h-4" />
                    Request Changes
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
