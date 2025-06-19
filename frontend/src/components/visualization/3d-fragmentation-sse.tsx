"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Pause, 
  RotateCw, 
  Maximize2, 
  Shield, 
  Zap, 
  Eye, 
  TrendingUp, 
  CheckCircle2,
  Clock, 
  AlertTriangle, 
  DollarSign, 
  Cpu, 
  Database, 
  Network,
  Activity,
  Layers
} from "lucide-react";
import { useQuery } from "@/contexts/query-context";
import type { AnalyzeResponse } from "@/lib/api";
import { useSSE } from "@/hooks/useSSE";

interface StepCompletionStatus {
  [key: string]: boolean;
}

interface StepProgress {
  [key: string]: number; // 0-100
}

export function ThreeDFragmentationSSE() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepCompletionStatus, setStepCompletionStatus] = useState<StepCompletionStatus>({});
  const [stepProgress, setStepProgress] = useState<StepProgress>({});
  const [currentStepMessage, setCurrentStepMessage] = useState<string>("");
  
  const { 
    queryResult, 
    isProcessing, 
    processingStartTime,
    realTimeData,
    investorMetrics,
    updateRealTimeData,
    updateInvestorMetrics,
    currentQuery
  } = useQuery();

  const queryData = queryResult as AnalyzeResponse | null;

  // Disable SSE in this component to prevent conflicts - handled by parent
  const sseUrl = null; // queryData?.request_id ? `/api/v1/stream/${queryData.request_id}` : null;
  
  // Commented out to prevent duplicate SSE connections
  /*
  useSSE(sseUrl, {
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 SSE Update:', data);
        
        switch (data.type) {
          case 'step_progress':
            const stepData = data.data;
            
            // Update step progress
            if (stepData.status === 'processing') {
              setStepProgress(prev => ({
                ...prev,
                [stepData.step]: stepData.progress || 0
              }));
              setCurrentStepMessage(stepData.message || "");
            }
            
            // Mark step as completed
            if (stepData.status === 'completed') {
              setStepCompletionStatus(prev => ({
                ...prev,
                [stepData.step]: true
              }));
              setStepProgress(prev => ({
                ...prev,
                [stepData.step]: 100
              }));
            }
            
            // Update current step index based on step name
            const stepMap: { [key: string]: number } = {
              'query_received': 0,
              'pii_detection': 1,
              'fragmentation': 2,
              'planning': 3,
              'distribution': 4,
              'aggregation': 5,
              'final_response': 6
            };
            
            if (stepMap[stepData.step] !== undefined) {
              setCurrentStep(stepMap[stepData.step]);
            }
            break;
            
          case 'investor_privacy':
            updateInvestorMetrics({ privacy_score: data.data.privacy_score });
            updateRealTimeData({ privacy_update: data.data });
            break;
            
          case 'investor_cost':
            updateInvestorMetrics({ 
              cost_savings: data.data.savings_percentage,
              cost_breakdown: data.data.provider_breakdown
            });
            updateRealTimeData({ cost_calculation: data.data });
            break;
            
          case 'investor_performance':
            updateInvestorMetrics({
              processing_time: data.data.total_processing_time,
              throughput_rate: data.data.throughput_rate,
              system_efficiency: data.data.system_efficiency
            });
            updateRealTimeData({ performance_metric: data.data });
            break;
            
          case 'complete':
            console.log('✅ Processing complete:', data.data);
            // Final update with complete results
            break;
            
          case 'error':
            console.error('❌ Processing error:', data.data);
            break;
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    },
    onOpen: () => {
      console.log('✅ SSE connection established');
      // Reset progress when starting new stream
      setStepCompletionStatus({});
      setStepProgress({});
      setCurrentStep(0);
    }
  });
  */

  // Calculate elapsed time
  const [elapsedTime, setElapsedTime] = useState(0);
  useEffect(() => {
    if (processingStartTime && isProcessing) {
      const interval = setInterval(() => {
        const elapsed = (new Date().getTime() - processingStartTime.getTime()) / 1000;
        setElapsedTime(elapsed);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [processingStartTime, isProcessing]);

  const duration = queryData?.total_time || elapsedTime;

  // Get step information based on current state
  const getSteps = () => {
    return [
      { 
        title: "Query Received", 
        description: stepCompletionStatus['query_received'] 
          ? `📊 ${currentQuery?.length || 0} chars • Received`
          : (isProcessing ? "📊 Receiving query..." : "⏳ Ready"),
        icon: <Database className="h-4 w-4" />,
        status: stepCompletionStatus['query_received'] ? 'completed' : (isProcessing ? 'processing' : 'ready'),
        progress: stepProgress['query_received'] || 0
      },
      { 
        title: "PII Detection", 
        description: stepCompletionStatus['pii_detection'] 
          ? "🔍 PII detection completed"
          : (stepProgress['pii_detection'] > 0 ? currentStepMessage || "🔍 Scanning for PII..." : "⏳ Ready"),
        icon: <Shield className="h-4 w-4" />,
        status: stepCompletionStatus['pii_detection'] ? 'completed' : (stepProgress['pii_detection'] > 0 ? 'processing' : 'pending'),
        progress: stepProgress['pii_detection'] || 0
      },
      { 
        title: "Fragmentation", 
        description: stepCompletionStatus['fragmentation'] 
          ? "⚡ Fragmentation completed"
          : (stepProgress['fragmentation'] > 0 ? currentStepMessage || "⚡ Creating fragments..." : "⏳ Queued"),
        icon: <Network className="h-4 w-4" />,
        status: stepCompletionStatus['fragmentation'] ? 'completed' : (stepProgress['fragmentation'] > 0 ? 'processing' : 'pending'),
        progress: stepProgress['fragmentation'] || 0
      },
      { 
        title: "Planning", 
        description: stepCompletionStatus['planning'] 
          ? "🤖 Planning completed"
          : (stepProgress['planning'] > 0 ? currentStepMessage || "🤖 Optimizing routing..." : "⏳ Queued"),
        icon: <Activity className="h-4 w-4" />,
        status: stepCompletionStatus['planning'] ? 'completed' : (stepProgress['planning'] > 0 ? 'processing' : 'pending'),
        progress: stepProgress['planning'] || 0
      },
      { 
        title: "Distribution", 
        description: stepCompletionStatus['distribution'] 
          ? "🚀 All providers responded"
          : (stepProgress['distribution'] > 0 ? currentStepMessage || "🚀 Routing to providers..." : "⏳ Queued"),
        icon: <Cpu className="h-4 w-4" />,
        status: stepCompletionStatus['distribution'] ? 'completed' : (stepProgress['distribution'] > 0 ? 'processing' : 'pending'),
        progress: stepProgress['distribution'] || 0
      },
      { 
        title: "Aggregation", 
        description: stepCompletionStatus['aggregation'] 
          ? "🎯 Response aggregated"
          : (stepProgress['aggregation'] > 0 ? currentStepMessage || "🎯 Combining responses..." : "⏳ Queued"),
        icon: <Layers className="h-4 w-4" />,
        status: stepCompletionStatus['aggregation'] ? 'completed' : (stepProgress['aggregation'] > 0 ? 'processing' : 'pending'),
        progress: stepProgress['aggregation'] || 0
      },
      { 
        title: "Final Response", 
        description: stepCompletionStatus['final_response'] 
          ? "✅ Response delivered"
          : (stepProgress['final_response'] > 0 ? currentStepMessage || "📦 Preparing response..." : "⏳ Queued"),
        icon: <CheckCircle2 className="h-4 w-4" />,
        status: stepCompletionStatus['final_response'] ? 'completed' : (stepProgress['final_response'] > 0 ? 'processing' : 'pending'),
        progress: stepProgress['final_response'] || 0
      },
    ];
  };

  const steps = getSteps();

  // 3D visualization code (canvas animation) - simplified for SSE demo
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Simple visualization showing current step progress
      const centerX = canvas.offsetWidth / 2;
      const centerY = canvas.offsetHeight / 2;
      const radius = 100;

      // Draw progress circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(100, 100, 100, 0.2)";
      ctx.lineWidth = 20;
      ctx.stroke();

      // Draw progress
      const progress = (currentStep + 1) / 7;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 20;
      ctx.stroke();

      // Draw current step
      ctx.font = "24px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#333";
      ctx.fillText(`Step ${currentStep + 1} of 7`, centerX, centerY);

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [currentStep]);

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Privacy-Preserving Query Fragmentation</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {duration.toFixed(1)}s
            </Badge>
          </div>
        </div>

        {/* Canvas Visualization */}
        <div className="relative h-64 bg-white dark:bg-gray-950 rounded-lg shadow-inner">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
          />
        </div>

        {/* Progress Steps - SSE Updated */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {steps.map((step, index) => {
            const isCompleted = step.status === 'completed';
            const isProcessing = step.status === 'processing';
            const isPending = step.status === 'pending' || step.status === 'ready';
            
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-lg border transition-all cursor-pointer transform hover:scale-105 relative overflow-hidden ${
                  isCompleted
                    ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-300"
                    : isProcessing
                    ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-300"
                    : "bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-950/20 dark:border-gray-800 dark:text-gray-400"
                }`}
                onClick={() => setSelectedStep(index)}
              >
                {/* Progress bar background */}
                {isProcessing && (
                  <motion.div
                    className="absolute inset-0 bg-blue-100 dark:bg-blue-900/20"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: step.progress / 100 }}
                    style={{ transformOrigin: 'left' }}
                    transition={{ duration: 0.3 }}
                  />
                )}
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    {step.icon}
                    {isCompleted && <CheckCircle2 className="h-4 w-4" />}
                    {isProcessing && (
                      <div className="animate-pulse h-2 w-2 bg-blue-600 rounded-full" />
                    )}
                  </div>
                  <h4 className="font-medium text-sm">{step.title}</h4>
                  <p className="text-xs mt-1 opacity-80">{step.description}</p>
                  {isProcessing && (
                    <div className="text-xs mt-1 font-mono">
                      {step.progress}%
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}