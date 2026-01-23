import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Upload, 
  Sparkles,
  ChevronRight,
  Building2,
  User,
  Car,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

type DemoStep = 'builder' | 'driver' | 'review';

const demoSteps: { id: DemoStep; label: string; icon: React.ElementType }[] = [
  { id: 'builder', label: 'AI Credential Builder', icon: Sparkles },
  { id: 'driver', label: 'Driver Experience', icon: User },
  { id: 'review', label: 'Admin Review', icon: Shield },
];

export function LiveDemoShowcase() {
  const [activeStep, setActiveStep] = useState<DemoStep>('builder');
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-advance demo
  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => {
        const currentIndex = demoSteps.findIndex((s) => s.id === prev);
        const nextIndex = (currentIndex + 1) % demoSteps.length;
        return demoSteps[nextIndex].id;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Section header */}
      <div className="max-w-7xl mx-auto px-6 mb-16 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-bold text-white mb-4"
        >
          See It In Action
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-xl text-gray-400 max-w-2xl mx-auto"
        >
          From AI-generated credentials to driver completion to admin review — 
          all in one seamless workflow.
        </motion.p>
      </div>

      {/* Demo tabs */}
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {demoSteps.map((step) => (
            <button
              key={step.id}
              onClick={() => {
                setActiveStep(step.id);
                setIsAutoPlaying(false);
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeStep === step.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-gray-400 hover:text-white border border-transparent'
              )}
            >
              <step.icon className="w-4 h-4" />
              {step.label}
            </button>
          ))}
        </div>
      </div>

      {/* Demo window */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-5xl mx-auto px-6"
      >
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-amber-500/20 rounded-3xl blur-2xl opacity-50" />
          
          {/* Browser window */}
          <div className="relative bg-gray-900 rounded-2xl border border-gray-700/50 overflow-hidden shadow-2xl">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 border-b border-gray-700/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 ml-4">
                <div className="max-w-md mx-auto bg-gray-700/50 rounded-lg px-4 py-1.5 text-sm text-gray-400">
                  app.acme.io/credentials
                </div>
              </div>
            </div>

            {/* Demo content */}
            <div className="h-[500px] md:h-[550px] overflow-hidden">
              <AnimatePresence mode="wait">
                {activeStep === 'builder' && <BuilderDemo key="builder" />}
                {activeStep === 'driver' && <DriverDemo key="driver" />}
                {activeStep === 'review' && <ReviewDemo key="review" />}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// AI Credential Builder Demo
function BuilderDemo() {
  const [generating, setGenerating] = useState(false);
  const [blocks, setBlocks] = useState<string[]>([]);
  
  useEffect(() => {
    const timer = setTimeout(() => setGenerating(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!generating) return;
    const blockTypes = ['heading', 'paragraph', 'quiz', 'upload', 'signature'];
    let index = 0;
    const timer = setInterval(() => {
      if (index < blockTypes.length) {
        setBlocks((prev) => [...prev, blockTypes[index]]);
        index++;
      }
    }, 600);
    return () => clearInterval(timer);
  }, [generating]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full"
    >
      {/* Sidebar */}
      <div className="w-64 bg-gray-800/30 border-r border-gray-700/50 p-4">
        <div className="text-xs font-medium text-gray-500 uppercase mb-3">Trip Sources</div>
        <div className="space-y-1">
          {['Uber Health', 'Lyft', 'Private Facility A', 'MedTrans'].map((source, i) => (
            <div
              key={source}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                i === 0 ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'text-gray-400'
              )}
            >
              <Building2 className="w-4 h-4" />
              {source}
            </div>
          ))}
        </div>
        
        <div className="mt-6 text-xs font-medium text-gray-500 uppercase mb-3">Credentials</div>
        <div className="space-y-1">
          {['Background Check', 'Drug Test', 'Vehicle Inspection'].map((cred) => (
            <div key={cred} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400">
              <FileText className="w-4 h-4" />
              {cred}
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6">
        {/* AI prompt */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            <span className="font-medium text-white">AI Credential Builder</span>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
            <div className="text-sm text-gray-300 mb-3">
              "Create a background check credential for Uber Health with document upload, quiz verification, and e-signature"
            </div>
            {generating && (
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-4 h-4" />
                </motion.div>
                Generating credential workflow...
              </div>
            )}
          </div>
        </div>

        {/* Generated blocks */}
        <div className="space-y-3">
          <AnimatePresence>
            {blocks.map((block, i) => (
              <motion.div
                key={`${block}-${i}`}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-4"
              >
                <BlockPreview type={block} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function BlockPreview({ type }: { type: string }) {
  switch (type) {
    case 'heading':
      return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-400">H</div>
          <div>
            <div className="text-sm font-medium text-white">Heading Block</div>
            <div className="text-xs text-gray-500">Background Check Verification</div>
          </div>
        </div>
      );
    case 'paragraph':
      return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gray-500/20 flex items-center justify-center text-gray-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-medium text-white">Instructions</div>
            <div className="text-xs text-gray-500">Please complete the following steps...</div>
          </div>
        </div>
      );
    case 'quiz':
      return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center text-purple-400">?</div>
          <div>
            <div className="text-sm font-medium text-white">Quiz Question</div>
            <div className="text-xs text-gray-500">Verify understanding of background check requirements</div>
          </div>
        </div>
      );
    case 'upload':
      return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-amber-500/20 flex items-center justify-center text-amber-400">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-medium text-white">Document Upload</div>
            <div className="text-xs text-gray-500">Upload background check certificate</div>
          </div>
        </div>
      );
    case 'signature':
      return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-amber-500/20 flex items-center justify-center text-amber-400">✍</div>
          <div>
            <div className="text-sm font-medium text-white">E-Signature</div>
            <div className="text-xs text-gray-500">Acknowledge and sign the verification</div>
          </div>
        </div>
      );
    default:
      return null;
  }
}

// Driver Experience Demo
function DriverDemo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [uploaded, setUploaded] = useState(false);
  
  useEffect(() => {
    const timers = [
      setTimeout(() => setCurrentStep(1), 1000),
      setTimeout(() => setQuizAnswer(1), 2000),
      setTimeout(() => setCurrentStep(2), 3000),
      setTimeout(() => setUploaded(true), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full"
    >
      {/* Progress sidebar */}
      <div className="w-64 bg-gray-800/30 border-r border-gray-700/50 p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <User className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-white">John Driver</div>
            <div className="text-xs text-gray-500">Completing credentials</div>
          </div>
        </div>
        
        <div className="text-xs font-medium text-gray-500 uppercase mb-3">Progress</div>
        <div className="space-y-2">
          {['Training Video', 'Knowledge Quiz', 'Document Upload', 'E-Signature'].map((step, i) => (
            <div
              key={step}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                i < currentStep ? 'text-amber-400' : i === currentStep ? 'text-white bg-gray-700/30' : 'text-gray-500'
              )}
            >
              {i < currentStep ? (
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
              ) : (
                <div className={cn(
                  'w-4 h-4 rounded-full border-2',
                  i === currentStep ? 'border-amber-400' : 'border-gray-600'
                )} />
              )}
              {step}
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-md mx-auto">
          <h3 className="text-xl font-semibold text-white mb-2">Background Check Verification</h3>
          <p className="text-sm text-gray-400 mb-6">Complete the following steps to verify your background check</p>

          {/* Quiz section */}
          <div className="mb-6 p-4 rounded-xl bg-gray-800/30 border border-gray-700/30">
            <div className="text-sm font-medium text-white mb-3">
              What documents are required for a background check?
            </div>
            <div className="space-y-2">
              {['Only driver license', 'SSN and Photo ID', 'Vehicle registration only'].map((option, i) => (
                <div
                  key={option}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer',
                    quizAnswer === i 
                      ? i === 1 
                        ? 'border-amber-500/50 bg-amber-500/10' 
                        : 'border-red-500/50 bg-red-500/10'
                      : 'border-gray-700/50 hover:border-gray-600'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2',
                    quizAnswer === i 
                      ? i === 1 ? 'border-amber-400 bg-amber-400' : 'border-red-400'
                      : 'border-gray-500'
                  )} />
                  <span className="text-sm text-gray-300">{option}</span>
                  {quizAnswer === i && i === 1 && (
                    <CheckCircle2 className="w-4 h-4 text-amber-400 ml-auto" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Upload section */}
          <div className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/30">
            <div className="text-sm font-medium text-white mb-3">Upload Background Check Certificate</div>
            {uploaded ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <CheckCircle2 className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-sm font-medium text-white">background_check.pdf</div>
                  <div className="text-xs text-gray-500">Uploaded successfully</div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
                <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <div className="text-sm text-gray-400">Drop files here or click to upload</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Admin Review Demo
function ReviewDemo() {
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setApproving(true), 2000),
      setTimeout(() => setApproved(true), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full"
    >
      {/* Queue sidebar */}
      <div className="w-64 bg-gray-800/30 border-r border-gray-700/50 p-4">
        <div className="text-xs font-medium text-gray-500 uppercase mb-3">Review Queue</div>
        <div className="space-y-2">
          {[
            { name: 'John Driver', status: approved ? 'approved' : 'pending', cred: 'Background Check' },
            { name: 'Sarah Smith', status: 'pending', cred: 'Drug Test' },
            { name: 'Mike Johnson', status: 'pending', cred: 'Vehicle Inspection' },
          ].map((item, i) => (
            <div
              key={item.name}
              className={cn(
                'p-3 rounded-lg border',
                i === 0 
                  ? approved 
                    ? 'border-amber-500/30 bg-amber-500/10' 
                    : 'border-amber-500/30 bg-amber-500/10'
                  : 'border-gray-700/50'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                  i === 0 ? 'bg-amber-500 text-black' : 'bg-gray-600 text-white'
                )}>
                  {item.name[0]}
                </div>
                <span className="text-sm text-white">{item.name}</span>
              </div>
              <div className="text-xs text-gray-500 ml-8">{item.cred}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Review panel */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-white">Review Submission</h3>
              <p className="text-sm text-gray-400">John Driver • Background Check</p>
            </div>
            {approved ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400">
                <CheckCircle2 className="w-4 h-4" />
                Approved
              </div>
            ) : approving ? (
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400"
              >
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Sparkles className="w-4 h-4" />
                </motion.div>
                Processing...
              </motion.div>
            ) : null}
          </div>

          {/* Document preview */}
          <div className="mb-6 p-4 rounded-xl bg-gray-800/30 border border-gray-700/30">
            <div className="text-sm font-medium text-white mb-3">Uploaded Document</div>
            <div className="aspect-[4/3] bg-gray-900 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <div className="text-sm text-gray-400">background_check.pdf</div>
              </div>
            </div>
          </div>

          {/* Quiz results */}
          <div className="mb-6 p-4 rounded-xl bg-gray-800/30 border border-gray-700/30">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-white">Quiz Results</div>
              <div className="text-sm text-amber-400">1/1 Correct</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="text-sm text-gray-300 mb-1">What documents are required?</div>
              <div className="text-sm text-amber-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                SSN and Photo ID ✓
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {!approved && (
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-3 rounded-lg bg-amber-500/20 text-amber-400 font-medium hover:bg-amber-500/30 transition-colors">
                Approve
              </button>
              <button className="flex-1 px-4 py-3 rounded-lg bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors">
                Request Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
