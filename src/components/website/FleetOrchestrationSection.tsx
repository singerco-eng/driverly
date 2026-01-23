import { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, User, Building2 } from 'lucide-react';

// Shared animation context to keep both cards in sync
const AnimationContext = createContext<{ tick: number }>({ tick: 0 });

const employees = [
  { name: 'Sarah M.' },
  { name: 'David K.' },
  { name: 'Lisa T.' },
];

// W2 Fleet Assignment - Company assigns to employee, fades to next employee, repeat
function W2FleetCard() {
  const { tick } = useContext(AnimationContext);
  
  // Map tick to phase: 0=ready, 1=moving, 2=has it, 3=fade
  const cyclePosition = tick % 4;
  const employeeIndex = Math.floor(tick / 4) % employees.length;
  
  const phase = cyclePosition;
  const currentEmployee = employees[employeeIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-2xl bg-[#232220] border border-[#353330] p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">W-2 Fleet Assignment</h3>
          <p className="text-sm text-gray-500">Company assigns vehicles to employees</p>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-[#353330] border border-[#454340]">
          <span className="text-xs font-medium text-gray-300">W-2</span>
        </div>
      </div>

      {/* Animation area */}
      <div className="relative h-36 flex items-center justify-center bg-[#1a1917] rounded-xl">
        {/* Company node - always visible */}
        <div className="flex flex-col items-center gap-2 z-10">
          <div className={`
            w-14 h-14 rounded-xl flex items-center justify-center border-2 transition-all duration-700
            ${phase === 0 ? 'bg-amber-500/10 border-amber-500/50' : 'bg-[#353330] border-[#454340]'}
          `}>
            <Building2 className={`w-6 h-6 transition-colors duration-700 ${phase === 0 ? 'text-amber-400' : 'text-gray-500'}`} />
          </div>
          <span className="text-xs text-gray-500">Company</span>
        </div>

        {/* Connection line */}
        <div className="relative w-24 h-0.5 mx-6">
          <div className="absolute inset-0 bg-[#353330] rounded-full" />
          <motion.div 
            className="absolute inset-0 bg-amber-500/50 rounded-full origin-left"
            animate={{ scaleX: phase >= 1 && phase < 3 ? 1 : 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </div>

        {/* Driver node - fades between employees */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={employeeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 3 ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center gap-2 z-10"
          >
            <div className="relative">
              <div className={`
                w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-700
                ${phase === 2 ? 'bg-amber-500/10 border-amber-500/50' : 'bg-[#353330] border-[#454340]'}
              `}>
                <User className={`w-6 h-6 transition-colors duration-700 ${phase === 2 ? 'text-amber-400' : 'text-gray-500'}`} />
              </div>
              {/* Vehicle badge on driver */}
              <AnimatePresence>
                {phase === 2 && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-md"
                  >
                    <Car className="w-3 h-3 text-[#1a1917]" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <span className="text-xs text-gray-500">{currentEmployee.name}</span>
          </motion.div>
        </AnimatePresence>

        {/* Moving vehicle (only during transit phase) */}
        <AnimatePresence>
          {phase === 1 && (
            <motion.div
              key={`w2-vehicle-${tick}`}
              initial={{ x: -60, opacity: 0 }}
              animate={{ x: 60, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
              className="absolute z-20"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Car className="w-5 h-5 text-[#1a1917]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status text */}
      <div className="mt-4 text-center h-5">
        <AnimatePresence mode="wait">
          <motion.span
            key={`${phase}-${employeeIndex}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.4 }}
            className="text-sm text-gray-500"
          >
            {phase === 0 && "Vehicle ready in fleet"}
            {phase === 1 && `Assigning to ${currentEmployee.name}...`}
            {phase === 2 && `${currentEmployee.name} is using it now`}
            {phase === 3 && ""}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// 1099 Vehicle Sharing - Back and forth between two contractors
function ContractorLoanCard() {
  const { tick } = useContext(AnimationContext);
  
  // Map tick to phase: 0=James has, 1=moving to Mike, 2=Mike has, 3=moving to James
  const phase = tick % 4;

  const jamesHasIt = phase === 0;
  const mikeHasIt = phase === 2;
  const movingToMike = phase === 1;
  const movingToJames = phase === 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl bg-[#232220] border border-[#353330] p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">1099 Vehicle Sharing</h3>
          <p className="text-sm text-gray-500">Contractors loan vehicles to each other</p>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-[#353330] border border-[#454340]">
          <span className="text-xs font-medium text-gray-300">1099</span>
        </div>
      </div>

      {/* Animation area */}
      <div className="relative h-36 flex items-center justify-center bg-[#1a1917] rounded-xl">
        {/* James */}
        <div className="flex flex-col items-center gap-2 z-10">
          <div className="relative">
            <div className={`
              w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-700
              ${jamesHasIt ? 'bg-amber-500/10 border-amber-500/50' : 'bg-[#353330] border-[#454340]'}
            `}>
              <User className={`w-6 h-6 transition-colors duration-700 ${jamesHasIt ? 'text-amber-400' : 'text-gray-500'}`} />
            </div>
            {/* Vehicle badge */}
            <AnimatePresence>
              {jamesHasIt && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-md"
                >
                  <Car className="w-3 h-3 text-[#1a1917]" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <span className="text-xs text-gray-500">James R.</span>
        </div>

        {/* Connection line */}
        <div className="relative w-24 h-0.5 mx-6">
          <div className="absolute inset-0 bg-[#353330] rounded-full" />
          <div className="absolute inset-0 bg-amber-500/30 rounded-full" />
        </div>

        {/* Mike */}
        <div className="flex flex-col items-center gap-2 z-10">
          <div className="relative">
            <div className={`
              w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-700
              ${mikeHasIt ? 'bg-amber-500/10 border-amber-500/50' : 'bg-[#353330] border-[#454340]'}
            `}>
              <User className={`w-6 h-6 transition-colors duration-700 ${mikeHasIt ? 'text-amber-400' : 'text-gray-500'}`} />
            </div>
            {/* Vehicle badge */}
            <AnimatePresence>
              {mikeHasIt && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-md"
                >
                  <Car className="w-3 h-3 text-[#1a1917]" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <span className="text-xs text-gray-500">Mike L.</span>
        </div>

        {/* Moving vehicle */}
        <AnimatePresence>
          {(movingToMike || movingToJames) && (
            <motion.div
              key={`1099-vehicle-${tick}`}
              initial={{ x: movingToMike ? -60 : 60, opacity: 0 }}
              animate={{ x: movingToMike ? 60 : -60, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
              className="absolute z-20"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Car className="w-5 h-5 text-[#1a1917]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status text */}
      <div className="mt-4 text-center h-5">
        <AnimatePresence mode="wait">
          <motion.span
            key={phase}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.4 }}
            className="text-sm text-gray-500"
          >
            {phase === 0 && "James is using it now"}
            {phase === 1 && "Loaning to Mike..."}
            {phase === 2 && "Mike is using it now"}
            {phase === 3 && "Returning to James..."}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function FleetOrchestrationSection() {
  // Single shared tick that drives both animations
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 2200); // Each phase lasts 2.2 seconds
    
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimationContext.Provider value={{ tick }}>
      <section className="py-20 px-4 border-t border-[#353330]/50">
        <div className="max-w-5xl mx-auto">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-medium text-white mb-3">
              W-2 employees. 1099 contractors.{' '}
              <span className="text-gray-500">Every vehicle tracked.</span>
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Whether you assign company vehicles to employees or let contractors share their own, 
              every transfer is tracked with complete history.
            </p>
          </motion.div>

          {/* Two card grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <W2FleetCard />
            <ContractorLoanCard />
          </div>
        </div>
      </section>
    </AnimationContext.Provider>
  );
}
