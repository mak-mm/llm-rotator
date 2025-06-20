"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Clock, Loader2, Shield, Zap, Brain, Network, Sparkles } from 'lucide-react';
import { useSSESubscription } from '@/contexts/sse-context';

interface ProcessingOverlayProps {
  isVisible: boolean;
  requestId: string | null;
  onComplete: () => void;
}

interface StepState {
  status: 'pending' | 'processing' | 'completed' | 'skipped';
  message: string;
  details?: any;
  progress: number;
}

const PROCESSING_STEPS = [
  {
    id: 'planning',
    label: 'Query Analysis',
    icon: Brain,
    color: 'from-purple-500 to-blue-500',
    description: 'Analyzing query complexity and privacy requirements'
  },
  {
    id: 'pii_detection',
    label: 'PII Detection',
    icon: Shield,
    color: 'from-red-500 to-orange-500',
    description: 'Scanning for sensitive information'
  },
  {
    id: 'fragmentation',
    label: 'Query Fragmentation',
    icon: Zap,
    color: 'from-blue-500 to-cyan-500',
    description: 'Creating privacy-preserving fragments'
  },
  {
    id: 'enhancement',
    label: 'Fragment Optimization',
    icon: Sparkles,
    color: 'from-yellow-500 to-orange-500',
    description: 'Adding context and optimizing fragments'
  },
  {
    id: 'distribution',
    label: 'Multi-Provider Distribution',
    icon: Network,
    color: 'from-green-500 to-teal-500',
    description: 'Routing to optimal LLM providers'
  },
  {
    id: 'aggregation',
    label: 'Intelligent Aggregation',
    icon: Brain,
    color: 'from-indigo-500 to-purple-500',
    description: 'Combining responses with AI intelligence'
  },
  {
    id: 'final_response',
    label: 'Final Response',
    icon: CheckCircle,
    color: 'from-emerald-500 to-green-500',
    description: 'Preparing your privacy-protected response'
  }
];

export function ProcessingOverlay({ isVisible, requestId, onComplete }: ProcessingOverlayProps) {
  const [stepStates, setStepStates] = useState<Record<string, StepState>>(() => {
    const initialStates: Record<string, StepState> = {};
    PROCESSING_STEPS.forEach(step => {
      initialStates[step.id] = {
        status: 'pending',
        message: 'Waiting to start...',
        progress: 0
      };
    });
    return initialStates;
  });

  const [currentActiveStep, setCurrentActiveStep] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  // Subscribe to SSE events
  useSSESubscription(['step_progress', 'complete'], (message) => {
    if (message.type === 'step_progress' && message.data) {
      const { step, status, message: stepMessage, progress, details } = message.data;
      
      // Map backend step names to frontend steps
      const stepMapping: Record<string, string> = {
        'query_received': 'planning',
        'query_analysis': 'planning', 
        'pii_detection': 'pii_detection',
        'fragmentation': 'fragmentation',
        'enhancement': 'enhancement',
        'planning': 'distribution',
        'distribution': 'distribution',
        'aggregation': 'aggregation',
        'final_response': 'final_response'
      };
      
      const mappedStep = stepMapping[step] || step;
      
      setStepStates(prev => ({
        ...prev,
        [mappedStep]: {
          status: status as any,
          message: stepMessage || 'Processing...',
          progress: progress || 0,
          details
        }
      }));
      
      if (status === 'processing') {
        setCurrentActiveStep(mappedStep);
      }
    }
    
    if (message.type === 'complete') {
      setIsCompleting(true);
      
      // Mark all steps as completed or skipped
      setStepStates(prev => {
        const wasSimpleQuery = !message.data?.fragments || message.data.fragments.length === 0;
        const newStates = { ...prev };
        
        PROCESSING_STEPS.forEach(step => {
          if (step.id === 'planning' || step.id === 'pii_detection' || step.id === 'final_response') {
            newStates[step.id] = {
              ...newStates[step.id],
              status: 'completed',
              progress: 100
            };
          } else if (wasSimpleQuery) {
            newStates[step.id] = {
              ...newStates[step.id],
              status: 'skipped',
              progress: 100,
              message: 'Skipped for simple query'
            };
          } else {
            newStates[step.id] = {
              ...newStates[step.id],
              status: 'completed',
              progress: 100
            };
          }
        });
        
        return newStates;
      });
      
      setOverallProgress(100);
      setCurrentActiveStep(null);
      
      // Auto-close after a brief delay to show completion
      setTimeout(() => {
        onComplete();
      }, 2000);
    }
  }, []);

  // Calculate overall progress
  useEffect(() => {
    const completedSteps = Object.values(stepStates).filter(state => 
      state.status === 'completed' || state.status === 'skipped'
    ).length;
    const totalSteps = PROCESSING_STEPS.length;
    const newProgress = (completedSteps / totalSteps) * 100;
    setOverallProgress(newProgress);
  }, [stepStates]);

  const getStepIcon = (step: typeof PROCESSING_STEPS[0], state: StepState) => {
    const IconComponent = step.icon;
    
    if (state.status === 'completed') {
      return <CheckCircle className="w-8 h-8 text-green-400" />;
    } else if (state.status === 'processing') {
      return <Loader2 className="w-8 h-8 text-white animate-spin" />;
    } else if (state.status === 'skipped') {
      return <IconComponent className="w-8 h-8 text-gray-400 opacity-50" />;
    } else {
      return <Clock className="w-8 h-8 text-gray-400" />;
    }
  };

  const getStepAnimation = (stepId: string, index: number) => {
    const state = stepStates[stepId];
    const isActive = currentActiveStep === stepId;
    const isCompleted = state.status === 'completed';
    const isSkipped = state.status === 'skipped';
    
    return {
      initial: { opacity: 0, y: 50, scale: 0.8 },
      animate: { 
        opacity: 1, 
        y: 0, 
        scale: isActive ? 1.05 : 1,
        transition: { 
          delay: index * 0.1,
          duration: 0.6,
          type: "spring"
        }
      },
      whileHover: { scale: 1.02 },
      className: `
        relative p-6 rounded-2xl border-2 transition-all duration-500
        ${isActive ? 'border-white/30 shadow-2xl' : 'border-white/10'}
        ${isCompleted ? 'bg-green-500/20' : isSkipped ? 'bg-gray-500/20' : 'bg-white/5'}
        backdrop-blur-md
      `
    };
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900"
      >
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
              }}
              animate={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          ))}
        </div>

        {/* Main content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center p-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl font-bold text-white mb-4">
              Processing Your Query
            </h1>
            <p className="text-xl text-white/80 mb-6">
              Privacy-preserving AI analysis in progress
            </p>
            
            {/* Overall progress bar */}
            <div className="w-96 h-3 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-400 to-purple-400"
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-white/60 mt-2">{Math.round(overallProgress)}% Complete</p>
          </motion.div>

          {/* Processing steps grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl w-full">
            {PROCESSING_STEPS.map((step, index) => {
              const state = stepStates[step.id];
              const animation = getStepAnimation(step.id, index);
              
              return (
                <motion.div
                  key={step.id}
                  {...animation}
                >
                  {/* Step icon and gradient background */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.color} opacity-20`} />
                  
                  {/* Content */}
                  <div className="relative z-10">
                    {/* Icon */}
                    <div className="flex justify-center mb-4">
                      {getStepIcon(step, state)}
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-white font-semibold text-lg mb-2 text-center">
                      {step.label}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-white/70 text-sm text-center mb-3">
                      {step.description}
                    </p>
                    
                    {/* Status message */}
                    <p className="text-white/60 text-xs text-center mb-3 min-h-[2rem] flex items-center justify-center">
                      {state.message}
                    </p>
                    
                    {/* Progress bar for active step */}
                    {state.status === 'processing' && (
                      <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-white"
                          initial={{ width: 0 }}
                          animate={{ width: `${state.progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    )}
                    
                    {/* Status indicator */}
                    <div className="flex justify-center mt-2">
                      <div className={`w-2 h-2 rounded-full ${
                        state.status === 'completed' ? 'bg-green-400' :
                        state.status === 'processing' ? 'bg-blue-400 animate-pulse' :
                        state.status === 'skipped' ? 'bg-gray-400 opacity-50' :
                        'bg-white/30'
                      }`} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Completion message */}
          {isCompleting && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center mt-12"
            >
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-2">
                Processing Complete!
              </h2>
              <p className="text-white/80">
                Your privacy-protected response is ready
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}