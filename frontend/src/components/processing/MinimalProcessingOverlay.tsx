"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSSESubscription } from '@/contexts/sse-context';

interface MinimalProcessingOverlayProps {
  isVisible: boolean;
  requestId: string | null;
  onComplete: (response?: string) => void;
}

const PROCESSING_MESSAGES = [
  "Analyzing your query...",
  "Detecting sensitive information...",
  "Creating privacy-preserving fragments...",
  "Optimizing fragment boundaries...",
  "Distributing to AI providers...",
  "Aggregating responses intelligently...",
  "Finalizing your response..."
];

const STEP_TO_MESSAGE_INDEX: Record<string, number> = {
  'query_analysis': 0,
  'planning': 0,
  'pii_detection': 1,
  'fragmentation': 2,
  'enhancement': 3,
  'distribution': 4,
  'aggregation': 5,
  'final_response': 6
};

export function MinimalProcessingOverlay({ isVisible, requestId, onComplete }: MinimalProcessingOverlayProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(PROCESSING_MESSAGES[0]);
  const [progress, setProgress] = useState(0);
  const [finalResponse, setFinalResponse] = useState<string | undefined>();
  const [detailedSteps, setDetailedSteps] = useState<string[]>([]);

  // Subscribe to SSE events
  useSSESubscription(['step_progress', 'complete'], (message) => {
    if (message.type === 'step_progress' && message.data) {
      const { step, status, progress: stepProgress, message: stepMessage } = message.data;
      
      // Map step to message index
      const messageIndex = STEP_TO_MESSAGE_INDEX[step];
      if (messageIndex !== undefined && status === 'processing') {
        setCurrentMessageIndex(messageIndex);
        setCurrentMessage(PROCESSING_MESSAGES[messageIndex]);
      }
      
      // Update detailed steps with the step message
      if (stepMessage && status === 'processing') {
        setDetailedSteps(prev => {
          const newSteps = [...prev];
          // Keep only the last 3 detailed steps
          if (newSteps.length >= 3) {
            newSteps.shift();
          }
          newSteps.push(stepMessage);
          return newSteps;
        });
      }
      
      // Update overall progress
      if (stepProgress) {
        // Calculate overall progress based on step index and step progress
        const stepWeight = 100 / 7; // 7 total steps
        const stepIndex = Object.keys(STEP_TO_MESSAGE_INDEX).indexOf(step);
        const overallProgress = (stepIndex * stepWeight) + (stepProgress * stepWeight / 100);
        setProgress(Math.min(overallProgress, 95)); // Cap at 95% until complete
      }
    }
    
    if (message.type === 'complete' && message.data) {
      setProgress(100);
      setCurrentMessage("Your privacy-protected response is ready!");
      
      // Extract final response
      const response = message.data.final_response || message.data.aggregated_response;
      setFinalResponse(response);
      
      // Auto-close after a brief delay
      setTimeout(() => {
        onComplete(response);
      }, 1500);
    }
  }, [onComplete]);

  // Reset state when overlay becomes visible
  useEffect(() => {
    if (isVisible) {
      setCurrentMessageIndex(0);
      setCurrentMessage(PROCESSING_MESSAGES[0]);
      setProgress(0);
      setFinalResponse(undefined);
      setDetailedSteps([]);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center"
      >
        <div className="text-center max-w-2xl mx-auto px-8">
          {/* Central animation - pulsing circle */}
          <motion.div
            className="w-32 h-32 mx-auto mb-12 relative"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {/* Outer ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-white/20"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.1, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* Inner circle with progress */}
            <div className="relative w-full h-full">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="60"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="4"
                  fill="none"
                />
                <motion.circle
                  cx="64"
                  cy="64"
                  r="60"
                  stroke="url(#gradient)"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: progress / 100 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  style={{
                    strokeDasharray: "377",
                    strokeDashoffset: "0",
                  }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Center icon or percentage */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  key={currentMessageIndex}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-white font-light text-2xl"
                >
                  {progress < 100 ? `${Math.round(progress)}%` : '✓'}
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Message text */}
          <AnimatePresence mode="wait">
            <motion.h2
              key={currentMessage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-white text-2xl font-light tracking-wide"
            >
              {currentMessage}
            </motion.h2>
          </AnimatePresence>

          {/* Subtle progress bar */}
          <div className="mt-12 w-full max-w-md mx-auto">
            <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Step indicator dots */}
          <div className="mt-8 flex justify-center gap-2">
            {PROCESSING_MESSAGES.map((_, index) => (
              <motion.div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                  index <= currentMessageIndex ? 'bg-white' : 'bg-white/20'
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
              />
            ))}
          </div>
        </div>

        {/* Detailed steps at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="sync">
              {detailedSteps.map((step, index) => (
                <motion.div
                  key={`${step}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: index === detailedSteps.length - 1 ? 1 : 0.4,
                    y: 0,
                    scale: index === detailedSteps.length - 1 ? 1 : 0.95
                  }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center mb-2"
                >
                  <div className="inline-flex items-center gap-2">
                    <motion.div
                      className={`w-2 h-2 rounded-full ${
                        index === detailedSteps.length - 1 
                          ? 'bg-gradient-to-r from-blue-400 to-purple-400' 
                          : 'bg-white/30'
                      }`}
                      animate={index === detailedSteps.length - 1 ? {
                        scale: [1, 1.5, 1],
                      } : {}}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                      }}
                    />
                    <span className={`text-sm font-light ${
                      index === detailedSteps.length - 1 
                        ? 'text-white' 
                        : 'text-white/40'
                    }`}>
                      {step}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Current action indicator */}
            {detailedSteps.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-center"
              >
                <span className="text-xs text-white/50 uppercase tracking-wider">
                  Processing Step {currentMessageIndex + 1} of {PROCESSING_MESSAGES.length}
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}