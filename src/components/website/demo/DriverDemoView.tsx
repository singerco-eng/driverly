import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  ArrowRight,
  FileCheck,
  Car,
  User,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  mockDriver,
  mockOnboardingStatus,
  CATEGORY_LABELS,
  type MockOnboardingItem,
} from '@/pages/website/demo-data/mockDriver';

interface DriverDemoViewProps {
  isActive: boolean;
}

type DemoStage = 'dashboard' | 'expand' | 'click' | 'complete';

export function DriverDemoView({ isActive }: DriverDemoViewProps) {
  const [stage, setStage] = useState<DemoStage>('dashboard');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set(['personal_info', 'drivers_license']));
  const [progress, setProgress] = useState(25);

  // Reset on deactivation
  useEffect(() => {
    if (!isActive) {
      setStage('dashboard');
      setExpandedCategory(null);
      setHighlightedItem(null);
      setCompletedItems(new Set(['personal_info', 'drivers_license']));
      setProgress(25);
    }
  }, [isActive]);

  // Scripted demo flow
  useEffect(() => {
    if (!isActive) return;

    const timers: NodeJS.Timeout[] = [];

    // Stage 1: Expand credentials category
    timers.push(
      setTimeout(() => {
        setExpandedCategory('credentials');
        setStage('expand');
      }, 1500)
    );

    // Stage 2: Highlight background check
    timers.push(
      setTimeout(() => {
        setHighlightedItem('background_check');
        setStage('click');
      }, 2500)
    );

    // Stage 3: Complete it
    timers.push(
      setTimeout(() => {
        setCompletedItems((prev) => new Set([...prev, 'background_check']));
        setProgress(38);
        setStage('complete');
      }, 4000)
    );

    // Stage 4: Complete another
    timers.push(
      setTimeout(() => {
        setHighlightedItem('drug_test');
      }, 5000)
    );

    timers.push(
      setTimeout(() => {
        setCompletedItems((prev) => new Set([...prev, 'drug_test']));
        setProgress(50);
      }, 6000)
    );

    // Stage 5: Reset and loop
    timers.push(
      setTimeout(() => {
        setStage('dashboard');
        setExpandedCategory(null);
        setHighlightedItem(null);
        setCompletedItems(new Set(['personal_info', 'drivers_license']));
        setProgress(25);
      }, 9000)
    );

    return () => timers.forEach(clearTimeout);
  }, [isActive, stage === 'dashboard']);

  // Group items by category
  const groupedItems = mockOnboardingStatus.items.reduce<
    Record<string, MockOnboardingItem[]>
  >((acc, item) => {
    const key = item.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const completedCount = [...completedItems].length;
  const totalCount = mockOnboardingStatus.items.length;

  return (
    <div className="flex h-full min-h-[500px]">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-800/50 p-4 flex flex-col">
        {/* User info */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
            <span className="text-lg font-semibold text-amber-400">
              {mockDriver.avatarInitials}
            </span>
          </div>
          <div>
            <p className="font-medium text-white">{mockDriver.name}</p>
            <p className="text-xs text-gray-500">{mockDriver.employmentType} Driver</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {[
            { icon: User, label: 'Dashboard', active: true },
            { icon: FileCheck, label: 'Credentials', active: false },
            { icon: Car, label: 'Vehicles', active: false },
          ].map((item) => (
            <div
              key={item.label}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                item.active
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </div>
          ))}
        </nav>

        {/* Status toggle preview */}
        <div className="mt-auto pt-4 border-t border-gray-800/50">
          <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-700/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Status</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                Onboarding
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Complete requirements to go active
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">
            Good morning, {mockDriver.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-sm text-gray-400">
            Complete your onboarding to start receiving trips
          </p>
        </div>

        {/* Progress card */}
        <div className="mb-6 p-5 rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Getting Started
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Complete these steps to start receiving trips
              </p>
            </div>
            <div className="text-right">
              <motion.p
                key={progress}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-3xl font-bold text-amber-400"
              >
                {progress}%
              </motion.p>
              <p className="text-xs text-gray-500">
                {completedCount} of {totalCount} complete
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
              initial={{ width: '25%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Checklist sections */}
        <div className="space-y-4">
          {Object.entries(groupedItems).map(([category, items]) => {
            const isExpanded = expandedCategory === category || expandedCategory === null;
            const categoryCompleted = items.filter((i) =>
              completedItems.has(i.key)
            ).length;

            return (
              <div
                key={category}
                className="rounded-xl border border-gray-700/30 overflow-hidden"
              >
                {/* Category header */}
                <button
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
                  onClick={() =>
                    setExpandedCategory(isExpanded ? null : category)
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-white">
                      {CATEGORY_LABELS[category]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {categoryCompleted}/{items.length}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {/* Items */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-2 space-y-1">
                        {items.map((item) => {
                          const isCompleted = completedItems.has(item.key);
                          const isHighlighted = highlightedItem === item.key;

                          return (
                            <motion.div
                              key={item.key}
                              className={cn(
                                'flex items-center justify-between p-3 rounded-lg transition-all',
                                isCompleted
                                  ? 'bg-amber-500/10 border border-amber-500/20'
                                  : isHighlighted
                                  ? 'bg-amber-500/10 border border-amber-500/30'
                                  : 'bg-gray-800/20 border border-transparent hover:bg-gray-800/40'
                              )}
                              animate={
                                isHighlighted && !isCompleted
                                  ? { scale: [1, 1.01, 1] }
                                  : {}
                              }
                              transition={{ duration: 0.5, repeat: isHighlighted && !isCompleted ? Infinity : 0 }}
                            >
                              <div className="flex items-center gap-3">
                                {isCompleted ? (
                                  <CheckCircle2 className="w-5 h-5 text-amber-400" />
                                ) : item.missingInfo ? (
                                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                                ) : (
                                  <Circle className="w-5 h-5 text-gray-500" />
                                )}
                                <div>
                                  <p
                                    className={cn(
                                      'text-sm font-medium',
                                      isCompleted ? 'text-amber-400' : 'text-white'
                                    )}
                                  >
                                    {item.label}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {item.description}
                                  </p>
                                </div>
                              </div>
                              <button
                                className={cn(
                                  'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors',
                                  isCompleted
                                    ? 'text-gray-400 hover:bg-white/5'
                                    : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                )}
                              >
                                {isCompleted ? 'View' : 'Complete'}
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
