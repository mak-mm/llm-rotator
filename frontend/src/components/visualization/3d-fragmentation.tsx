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

interface Fragment {
  id: string;
  text: string;
  provider: string;
  color: string;
  position: { x: number; y: number; z: number };
  targetPosition: { x: number; y: number; z: number };
  processed?: boolean;
  anonymized?: boolean;
  index?: number;
}

interface Provider {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  color: string;
  icon: string;
  active?: boolean;
}

interface VisualizationProps {
  queryData?: AnalyzeResponse | null;
  isProcessing?: boolean;
}

export function ThreeDFragmentation({ queryData, isProcessing }: VisualizationProps) {
  // Access current query and investor metrics from context
  const { 
    currentQuery, 
    investorMetrics, 
    realTimeData, 
    updateInvestorMetrics, 
    updateRealTimeData,
    resetInvestorData 
  } = useQuery();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);
  const [realTimeLogs, setRealTimeLogs] = useState<any[]>([]);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [hasCompletedProcessing, setHasCompletedProcessing] = useState(false);
  const [stepCompletionStatus, setStepCompletionStatus] = useState<{[key: number]: boolean}>({});
  const animationRef = useRef<number>();
  const timeRef = useRef(0);
  // WebSocket removed - using SSE instead
  /* WebSocket functionality disabled
  useEffect(() => {
    const connectLogStream = () => {
      const wsUrl = process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://localhost:8000';
      const ws = new WebSocket(`${wsUrl}/ws/logs`);
      
      ws.onopen = () => {
        console.log('🔗 Connected to log stream');
        wsRef.current = ws;
      };
      
      ws.onmessage = (event) => {
        try {
          const logData = JSON.parse(event.data);
          console.log('📋 Real-time log received:', logData);
          console.log('📋 Step info - step:', logData.step, 'status:', logData.step_status);
          
          // Update real-time logs
          setRealTimeLogs(prev => [...prev.slice(-50), logData]); // Keep last 50 logs
          
          // Track current request ID
          if (logData.request_id && logData.request_id !== currentRequestId) {
            console.log('📋 New request ID detected:', logData.request_id);
            setCurrentRequestId(logData.request_id);
            setRealTimeLogs([logData]); // Reset logs for new request
            setStepCompletionStatus({}); // Reset step completion for new request
            resetInvestorData(); // Reset investor metrics for new request
          }
          
          // Use step and step_status from structured log data
          console.log('📋 WebSocket log received:', {
            step: logData.step,
            step_status: logData.step_status,
            message: logData.raw_message || logData.message
          });
          
          if (logData.step && logData.step_status === 'completed') {
            console.log(`📋 Step ${logData.step} completed via WebSocket`);
            setStepCompletionStatus(prev => ({ 
              ...prev, 
              [logData.step]: true 
            }));
          }
          
        } catch (error) {
          console.error('Error parsing log data:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('🔗 Log stream disconnected, reconnecting...');
        wsRef.current = null;
        setTimeout(connectLogStream, 1000);
      };
      
      ws.onerror = (error) => {
        console.error('Log stream error:', error);
      };
    };
    
    const connectInvestorStream = () => {
      const wsUrl = process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://localhost:8000';
      const demoWs = new WebSocket(`${wsUrl}/ws/updates`);
      
      demoWs.onopen = () => {
        console.log('🎯 Connected to investor demo stream');
      };
      
      demoWs.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'investor_demo') {
            console.log('💼 Investor demo data received:', message.data);
            
            const { message_type, data } = message.data;
            
            // Update real-time data in context
            updateRealTimeData({ [message_type]: data });
            
            // Handle specific investor demo message types
            switch (message_type) {
              case 'privacy_update':
                console.log('🔒 Privacy metrics update:', data);
                updateInvestorMetrics({
                  privacy_score: data.privacy_score,
                  pii_entities_found: data.pii_entities_found
                });
                break;
              case 'cost_calculation':
                console.log('💰 Cost optimization update:', data);
                updateInvestorMetrics({
                  cost_savings: data.total_cost,
                  savings_percentage: data.savings_percentage,
                  provider_breakdown: data.provider_breakdown
                });
                break;
              case 'provider_routing':
                console.log('🧠 Provider routing decision:', data);
                updateInvestorMetrics({
                  routing_decisions: [
                    ...(investorMetrics.routing_decisions || []),
                    {
                      fragment_id: data.fragment_id,
                      provider_selected: data.provider_selected,
                      reasoning: data.reasoning,
                      confidence: data.confidence
                    }
                  ]
                });
                break;
              case 'performance_metric':
                console.log('⚡ Performance metrics update:', data);
                updateInvestorMetrics({
                  processing_time: data.total_processing_time,
                  system_efficiency: data.system_efficiency,
                  throughput_rate: data.throughput_rate
                });
                break;
              case 'executive_summary':
                console.log('📊 Executive summary generated:', data);
                updateInvestorMetrics({
                  executive_summary: data.executive_summary,
                  business_insights: data.business_insights
                });
                break;
              case 'step_progress':
                console.log('📋 Step progress update:', data);
                if (data.step && data.status === 'completed') {
                  setStepCompletionStatus(prev => ({ 
                    ...prev, 
                    [data.step]: true 
                  }));
                }
                break;
            }
          }
        } catch (error) {
          console.error('Error parsing investor demo data:', error);
        }
      };
      
      demoWs.onclose = () => {
        console.log('🎯 Demo stream disconnected, reconnecting...');
        setTimeout(connectInvestorStream, 1000);
      };
      
      demoWs.onerror = (error) => {
        console.error('Demo stream error:', error);
      };
    };
    
    connectLogStream();
    connectInvestorStream();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [currentRequestId]);
  */ // End WebSocket functionality block

  // Track processing start time for real-time metrics
  useEffect(() => {
    if (isProcessing && !processingStartTime) {
      setProcessingStartTime(new Date());
      // When processing starts, immediately show step 1 as completed
      setCurrentStep(1);
      setHasCompletedProcessing(false);
      setRealTimeLogs([]); // Reset logs for new query
      setStepCompletionStatus({ 1: true }); // Step 1 (Original Query) is immediately complete
    } else if (!isProcessing && processingStartTime) {
      setProcessingStartTime(null);
    }
  }, [isProcessing, processingStartTime]);

  // When queryData arrives, mark processing as complete
  useEffect(() => {
    if (queryData && !hasCompletedProcessing) {
      console.log('✅ 3D Viz - Query completed, marking all steps as complete');
      setHasCompletedProcessing(true);
      // Don't override currentStep - let real-time updates handle it
      // The final step should already be set by WebSocket updates
    }
  }, [queryData, hasCompletedProcessing]);

  // Provider color mapping
  const providerColors = {
    openai: "#10b981",
    anthropic: "#3b82f6", 
    google: "#f59e0b"
  };

  // Providers positioned in 3D space
  const [providers, setProviders] = useState<Provider[]>([
    { id: "openai", name: "GPT-4.1", position: { x: -200, y: 100, z: 50 }, color: providerColors.openai, icon: "🤖" },
    { id: "anthropic", name: "Claude Sonnet 4", position: { x: 200, y: 100, z: 50 }, color: providerColors.anthropic, icon: "🧠" },
    { id: "google", name: "Gemini 2.5 Flash", position: { x: 0, y: -150, z: 50 }, color: providerColors.google, icon: "⚡" },
  ]);

  // Dynamic fragments based on real query data
  const [fragments, setFragments] = useState<Fragment[]>([]);
  
  // Update fragments when query data changes
  useEffect(() => {
    if (queryData?.fragments) {
      const totalFragments = queryData.fragments.length;
      
      const realFragments = queryData.fragments.map((fragment, globalIndex) => {
        const provider = providers.find(p => p.id === fragment.provider);
        
        // Distribute fragments in a larger circle pattern
        // This creates a nice spread regardless of fragment count
        const angle = (globalIndex / totalFragments) * Math.PI * 2 - Math.PI / 2; // Start from top
        const baseRadius = 120; // Base radius for fragment distribution
        
        // Add some variation to radius to avoid perfect circle
        const radiusVariation = 20 * Math.sin(globalIndex * 1.5);
        const radius = baseRadius + radiusVariation;
        
        // Calculate fragment position
        const fragmentX = Math.cos(angle) * radius;
        const fragmentY = Math.sin(angle) * radius;
        
        return {
          id: fragment.id,
          text: fragment.content.length > 40 
            ? fragment.content.substring(0, 37) + "..." 
            : fragment.content,
          provider: fragment.provider,
          color: provider?.color || "#888",
          position: { x: 0, y: 0, z: 0 },
          targetPosition: {
            x: fragmentX,
            y: fragmentY,
            z: 0
          },
          processed: true,
          anonymized: fragment.anonymized,
          index: globalIndex + 1 // For display
        };
      });
      
      setFragments(realFragments);
      
      // Reset animation when new fragments arrive
      timeRef.current = 0;
      
      // Update active providers
      const activeProviderIds = new Set(queryData.fragments.map(f => f.provider));
      setProviders(prev => prev.map(p => ({ ...p, active: activeProviderIds.has(p.id) })));
    } else if (isProcessing) {
      // Show processing state
      setFragments([]);
      setHasCompletedProcessing(false); // Reset completion state for new query
    } else {
      // Idle state - no fragments to display until user submits a query
      setFragments([]);
      setProviders(prev => prev.map(p => ({ ...p, active: false })));
      setStepCompletionStatus({}); // Reset step completion for idle state
    }
  }, [queryData, isProcessing]); // Remove cyclical dependencies

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
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

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Center of canvas
      const centerX = canvas.offsetWidth / 2;
      const centerY = canvas.offsetHeight / 2;

      // Draw connections
      ctx.strokeStyle = "rgba(100, 100, 100, 0.2)";
      ctx.lineWidth = 1;
      providers.forEach((provider) => {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        const provX = centerX + provider.position.x * 0.8;
        const provY = centerY + provider.position.y * 0.8;
        ctx.lineTo(provX, provY);
        ctx.stroke();
      });

      // Draw providers
      providers.forEach((provider) => {
        const x = centerX + provider.position.x * 0.8;
        const y = centerY + provider.position.y * 0.8;
        const size = 60;

        // Provider circle
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = provider.color + "20";
        ctx.fill();
        ctx.strokeStyle = provider.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Provider icon
        ctx.font = "24px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(provider.icon, x, y - 10);

        // Provider name
        ctx.font = "12px Inter";
        ctx.fillStyle = "#666";
        ctx.fillText(provider.name, x, y + 25);
      });

      // Animate fragments as individual circles
      if (isPlaying) {
        timeRef.current += 0.02;
        const progress = Math.min(timeRef.current, 1);

        // Update fragment positions
        fragments.forEach((fragment, index) => {
          const delay = index * 0.1; // Faster stagger for more fragments
          const fragmentProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
          
          // Easing function
          const easeProgress = 1 - Math.pow(1 - fragmentProgress, 3);

          // Calculate current position
          const currentX = fragment.position.x + (fragment.targetPosition.x - fragment.position.x) * easeProgress;
          const currentY = fragment.position.y + (fragment.targetPosition.y - fragment.position.y) * easeProgress;

          // Draw fragment as a circle
          const x = centerX + currentX * 0.8;
          const y = centerY + currentY * 0.8;

          // Fragment circle
          const circleRadius = 35;
          
          // Gradient fill for fragment circle
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, circleRadius);
          gradient.addColorStop(0, fragment.color + "60");
          gradient.addColorStop(0.7, fragment.color + "40");
          gradient.addColorStop(1, fragment.color + "20");
          
          // Draw circle with glow effect
          ctx.shadowColor = fragment.color;
          ctx.shadowBlur = fragmentProgress > 0.8 ? 20 : 5;
          ctx.beginPath();
          ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
          ctx.strokeStyle = fragment.color;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Fragment number in center
          ctx.font = "bold 20px Inter";
          ctx.fillStyle = fragment.color;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(fragment.index?.toString() || (index + 1).toString(), x, y);

          // Provider label below circle
          ctx.font = "11px Inter";
          ctx.fillStyle = "#666";
          ctx.fillText(fragment.provider.toUpperCase(), x, y + circleRadius + 15);
          
          // Show anonymization indicator
          if (fragment.anonymized) {
            ctx.font = "16px Arial";
            ctx.fillText("🔒", x + circleRadius - 10, y - circleRadius + 10);
          }

          // Draw connection line to provider
          const provider = providers.find(p => p.id === fragment.provider);
          if (provider && fragmentProgress > 0.2) {
            const provX = centerX + provider.position.x * 0.8;
            const provY = centerY + provider.position.y * 0.8;
            
            ctx.strokeStyle = fragment.color + "40";
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(provX, provY);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });

        // Update step based on query data state
        if (queryData) {
          // Query complete - show all steps
          setCurrentStep(4);
        } else if (isProcessing) {
          // Processing - show progress through steps
          if (progress >= 0.8) {
            setCurrentStep(3); // Distribution
          } else if (progress >= 0.5) {
            setCurrentStep(2); // Fragmentation
          } else if (progress >= 0.2) {
            setCurrentStep(1); // PII Detection
          } else {
            setCurrentStep(0); // Original Query
          }
        } else {
          // Idle state - ready for queries
          setCurrentStep(0);
        }
      }

      // Draw center query box
      const queryBoxWidth = 300;
      const queryBoxHeight = 60;
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillRect(centerX - queryBoxWidth / 2, centerY - queryBoxHeight / 2, queryBoxWidth, queryBoxHeight);
      ctx.strokeStyle = "#ddd";
      ctx.lineWidth = 2;
      ctx.strokeRect(centerX - queryBoxWidth / 2, centerY - queryBoxHeight / 2, queryBoxWidth, queryBoxHeight);

      // Query text
      ctx.font = "16px Inter";
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Draw query text with proper wrapping for long queries
      const maxWidth = queryBoxWidth - 20;
      const lineHeight = 20;
      
      // Determine what text to show
      const displayText = queryData?.original_query || currentQuery || (isProcessing ? "Processing..." : "Enter a query to see real-time fragmentation");
      
      if (displayText && displayText !== "Enter a query to see real-time fragmentation") {
        // Show query with word wrapping
        const words = displayText.split(' ');
        const lines = [];
        let currentLine = '';
        
        // Word wrapping
        for (const word of words) {
          const testLine = currentLine + word + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine.trim());
            currentLine = word + ' ';
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine.trim());
        
        // Draw wrapped text
        ctx.font = "14px Inter";
        const startY = centerY - (lines.length - 1) * lineHeight / 2;
        lines.forEach((line, index) => {
          ctx.fillText(line, centerX, startY + index * lineHeight);
        });
        
        // Show processing indicator
        if (isProcessing && !queryData) {
          ctx.font = "italic 12px Inter";
          ctx.fillStyle = "#666";
          ctx.fillText("🔄 Analyzing...", centerX, centerY + 25);
        }
      } else {
        // Idle state
        ctx.fillText(displayText, centerX, centerY);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, fragments, providers, queryData, isProcessing]);

  const resetAnimation = () => {
    timeRef.current = 0;
    setCurrentStep(0);
  };

  // Get real-time processing duration
  const getProcessingDuration = () => {
    if (!processingStartTime) return 0;
    return (new Date().getTime() - processingStartTime.getTime()) / 1000;
  };

  // Get real-time log information for current step
  const getCurrentStepInfo = (stepNumber: number) => {
    const stepLogs = realTimeLogs.filter(log => log.step === stepNumber);
    const latestLog = stepLogs[stepLogs.length - 1];
    
    if (!latestLog) return null;
    
    return {
      status: latestLog.step_status,
      message: latestLog.raw_message,
      timestamp: latestLog.timestamp
    };
  };

  // Dynamic steps based on query data with investor-focused metrics
  const getSteps = () => {
    const duration = getProcessingDuration();
    
    console.log('📋 getSteps called with:', { 
      queryData: !!queryData, 
      isProcessing, 
      realTimeLogsLength: realTimeLogs.length,
      currentStep 
    });
    
    // If we have queryData, use persistent step completion status
    if (queryData) {
      const piiCount = queryData.detection.pii_entities.length;
      const fragmentCount = queryData.fragments.length;
      const providers = Array.from(new Set(queryData.fragments.map(f => f.provider)));
      const savingsPercent = queryData.cost_comparison?.savings_percentage || 0;

      return [
        { 
          title: "Original Query", 
          description: `📊 ${queryData.original_query.length} chars • Privacy Score: ${Math.round(queryData.privacy_score * 100)}%`,
          icon: <Database className="h-4 w-4" />,
          status: 'completed' // Always completed first
        },
        { 
          title: "PII Detection", 
          description: piiCount > 0 
            ? `🚨 Found ${piiCount} entities: ${queryData.detection.pii_entities.slice(0,2).map(e => e.type).join(', ')}${piiCount > 2 ? '...' : ''}`
            : '✅ No PII detected - Query is clean',
          icon: <Shield className="h-4 w-4" />,
          status: stepCompletionStatus[2] ? 'completed' : 'processing'
        },
        { 
          title: "Fragmentation", 
          description: `⚡ ${fragmentCount} fragments • ${Math.round((fragmentCount / queryData.original_query.length) * 1000)}% density`,
          icon: <Network className="h-4 w-4" />,
          status: stepCompletionStatus[3] ? 'completed' : (stepCompletionStatus[2] ? 'processing' : 'pending')
        },
        { 
          title: "Distribution", 
          description: `💰 ${savingsPercent}% cost savings • ${providers.length} providers • ${queryData.total_time.toFixed(1)}s`,
          icon: <Cpu className="h-4 w-4" />,
          status: stepCompletionStatus[4] ? 'completed' : (stepCompletionStatus[3] ? 'processing' : 'pending')
        },
      ];
    }
    
    if (!isProcessing && realTimeLogs.length === 0) {
      return [
        { 
          title: "Original Query", 
          description: "Ready to analyze your query for privacy risks", 
          icon: <Database className="h-4 w-4" />,
          status: 'ready'
        },
        { 
          title: "PII Detection", 
          description: "AI-powered detection using Microsoft Presidio", 
          icon: <Shield className="h-4 w-4" />,
          status: 'ready'
        },
        { 
          title: "Fragmentation", 
          description: "Semantic anonymization & context preservation", 
          icon: <Network className="h-4 w-4" />,
          status: 'ready'
        },
        { 
          title: "Distribution", 
          description: "Multi-provider orchestration for cost optimization", 
          icon: <Cpu className="h-4 w-4" />,
          status: 'ready'
        },
      ];
    }
    
    // Processing state - use persistent step completion status
    if (isProcessing || realTimeLogs.length > 0) {
      // Use real-time logs to determine step descriptions
      const step2Info = getCurrentStepInfo(2);
      const step3Info = getCurrentStepInfo(3);
      const step4Info = getCurrentStepInfo(4);
      
      console.log('📋 Step completion status:', stepCompletionStatus);
      console.log('📋 Current step:', currentStep);
      
      return [
        { 
          title: "Query Received", 
          description: `📊 ${currentQuery?.length || 0} chars • ${duration.toFixed(1)}s elapsed`,
          icon: <Database className="h-4 w-4" />,
          status: currentQuery ? 'completed' : 'ready'
        },
        { 
          title: "PII Detection", 
          description: stepCompletionStatus['pii_detection'] ? 
            "🔍 PII detection completed" :
            (isProcessing && currentStep >= 1 ? "🔍 Scanning for 50+ PII types..." : "⏳ Ready"),
          icon: <Shield className="h-4 w-4" />,
          status: stepCompletionStatus['pii_detection'] ? 'completed' : (isProcessing && currentStep >= 1 ? 'processing' : 'pending')
        },
        { 
          title: "Fragmentation", 
          description: stepCompletionStatus['fragmentation'] ? 
            "⚡ Fragmentation completed" :
            stepCompletionStatus['pii_detection'] ? "⚡ Creating privacy-preserving fragments..." : "⏳ Queued",
          icon: <Network className="h-4 w-4" />,
          status: stepCompletionStatus['fragmentation'] ? 'completed' : (stepCompletionStatus['pii_detection'] ? 'processing' : 'pending')
        },
        { 
          title: "Planning", 
          description: stepCompletionStatus['planning'] ? 
            "🤖 Orchestration planning completed" :
            stepCompletionStatus['fragmentation'] ? "🤖 Optimizing provider routing..." : "⏳ Queued",
          icon: <Activity className="h-4 w-4" />,
          status: stepCompletionStatus['planning'] ? 'completed' : (stepCompletionStatus['fragmentation'] ? 'processing' : 'pending')
        },
        { 
          title: "Distribution", 
          description: stepCompletionStatus['distribution'] ? 
            "🚀 All providers responded" :
            stepCompletionStatus['planning'] ? "🚀 Routing to OpenAI, Anthropic, Google..." : "⏳ Queued",
          icon: <Cpu className="h-4 w-4" />,
          status: stepCompletionStatus['distribution'] ? 'completed' : (stepCompletionStatus['planning'] ? 'processing' : 'pending')
        },
        { 
          title: "Aggregation", 
          description: stepCompletionStatus['aggregation'] ? 
            "🎯 Response aggregated successfully" :
            stepCompletionStatus['distribution'] ? "🎯 Combining fragment responses..." : "⏳ Queued",
          icon: <Layers className="h-4 w-4" />,
          status: stepCompletionStatus['aggregation'] ? 'completed' : (stepCompletionStatus['distribution'] ? 'processing' : 'pending')
        },
        { 
          title: "Final Response", 
          description: stepCompletionStatus['final_response'] ? 
            "✅ Response delivered" :
            stepCompletionStatus['aggregation'] ? "📦 Preparing final response..." : "⏳ Queued",
          icon: <CheckCircle2 className="h-4 w-4" />,
          status: stepCompletionStatus['final_response'] ? 'completed' : (stepCompletionStatus['aggregation'] ? 'processing' : 'pending')
        },
      ];
    }
    
    // Default fallback - should not reach here
    return [
      { title: "Query Received", description: "Ready", icon: <Database className="h-4 w-4" />, status: 'ready' },
      { title: "PII Detection", description: "Ready", icon: <Shield className="h-4 w-4" />, status: 'ready' },
      { title: "Fragmentation", description: "Ready", icon: <Network className="h-4 w-4" />, status: 'ready' },
      { title: "Planning", description: "Ready", icon: <Activity className="h-4 w-4" />, status: 'ready' },
      { title: "Distribution", description: "Ready", icon: <Cpu className="h-4 w-4" />, status: 'ready' },
      { title: "Aggregation", description: "Ready", icon: <Layers className="h-4 w-4" />, status: 'ready' },
      { title: "Final Response", description: "Ready", icon: <CheckCircle2 className="h-4 w-4" />, status: 'ready' },
    ];
  };

  // Render step modal content based on step type
  const renderStepModal = (stepIndex: number) => {
    const step = steps[stepIndex];
    if (!step) return null;

    switch (stepIndex) {
      case 0: // Original Query
        return (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Original Query Analysis
              </DialogTitle>
              <DialogDescription>
                Real-time query processing and privacy risk assessment
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{(queryData?.original_query || currentQuery || '').length}</div>
                    <div className="text-sm text-muted-foreground">Characters</div>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {queryData ? `${Math.round(queryData.privacy_score * 100)}%` : (isProcessing ? `${getProcessingDuration().toFixed(1)}s` : '0')}
                    </div>
                    <div className="text-sm text-muted-foreground">{queryData ? 'Privacy Score' : 'Processing Time'}</div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold mb-2">Query Content:</h4>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border font-mono text-sm max-h-48 overflow-y-auto">
                    {queryData?.original_query || currentQuery || 'No query submitted yet'}
                  </div>
                </div>
                
                {(queryData || isProcessing) && (
                  <div>
                    <h4 className="font-semibold mb-2">Processing Metrics:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>Word Count:</span>
                        <span className="font-mono">{(queryData?.original_query || currentQuery || '').split(' ').length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Estimated Tokens:</span>
                        <span className="font-mono">{Math.round((queryData?.original_query || currentQuery || '').length / 4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Risk Level:</span>
                        <span className={`font-medium ${
                          queryData ? (queryData.detection.has_pii ? 'text-red-600' : 'text-green-600') : 'text-yellow-600'
                        }`}>
                          {queryData ? (queryData.detection.has_pii ? 'High (PII Found)' : 'Low (Clean)') : 'Analyzing...'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processing Time:</span>
                        <span className="font-mono">
                          {queryData ? `${queryData.total_time.toFixed(2)}s` : `${getProcessingDuration().toFixed(1)}s`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        );
        
      case 1: // PII Detection
        return (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                PII Detection & Privacy Analysis
              </DialogTitle>
              <DialogDescription>
                Microsoft Presidio-powered detection of 50+ PII entity types
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {queryData?.detection.pii_entities.length || (isProcessing ? '...' : '0')}
                    </div>
                    <div className="text-sm text-muted-foreground">PII Entities</div>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {queryData ? Math.round(queryData.detection.sensitivity_score * 100) : (isProcessing ? '...' : '0')}%
                    </div>
                    <div className="text-sm text-muted-foreground">Sensitivity</div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {queryData?.detection.has_code ? 'YES' : (isProcessing ? '...' : 'NO')}
                    </div>
                    <div className="text-sm text-muted-foreground">Code Detected</div>
                  </div>
                </div>
                
                <Separator />
                
                {queryData?.detection.pii_entities.length > 0 ? (
                  <div>
                    <h4 className="font-semibold mb-2">Detected PII Entities:</h4>
                    <div className="space-y-2">
                      {queryData.detection.pii_entities.map((entity, idx) => (
                        <div key={idx} className="p-3 border rounded-lg bg-red-50 dark:bg-red-950/20">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="destructive">{entity.type}</Badge>
                            <span className="text-xs text-muted-foreground">Confidence: {Math.round(entity.score * 100)}%</span>
                          </div>
                          <div className="font-mono text-sm bg-white dark:bg-gray-900 p-2 rounded border">
                            "{entity.text}" → anonymized as {entity.type}_{idx + 1}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Position: {entity.start}-{entity.end}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-green-600 font-medium">No PII detected in your query!</p>
                    <p className="text-sm text-muted-foreground">Your query is privacy-safe and contains no personal identifiable information.</p>
                  </div>
                )}
                
                {queryData?.detection.has_code && (
                  <div>
                    <h4 className="font-semibold mb-2">Code Detection:</h4>
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary">Code Language</Badge>
                        <span className="font-mono">{queryData.detection.code_language || 'Unknown'}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Code content detected and will be handled with extra security precautions.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        );
        
      case 2: // Fragmentation
        return (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Semantic Fragmentation & Anonymization
              </DialogTitle>
              <DialogDescription>
                Privacy-preserving query decomposition with context preservation
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {queryData?.fragments.length || (isProcessing ? '...' : '0')}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Fragments</div>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {queryData ? queryData.fragments.filter(f => f.anonymized).length : (isProcessing ? '...' : '0')}
                    </div>
                    <div className="text-sm text-muted-foreground">Anonymized</div>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {queryData ? Math.round(queryData.fragments.reduce((sum, f) => sum + f.content.length, 0) / queryData.fragments.length) : '...'}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Length</div>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {queryData ? new Set(queryData.fragments.map(f => f.provider)).size : (isProcessing ? '...' : '0')}
                    </div>
                    <div className="text-sm text-muted-foreground">Providers</div>
                  </div>
                </div>
                
                <Separator />
                
                {queryData?.fragments.length > 0 ? (
                  <div>
                    <h4 className="font-semibold mb-3">Fragment Breakdown:</h4>
                    <div className="space-y-3">
                      {queryData.fragments.map((fragment, idx) => {
                        const providerColors = {
                          openai: 'bg-green-50 border-green-200 dark:bg-green-950/20',
                          anthropic: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20',
                          google: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20'
                        };
                        
                        return (
                          <div key={fragment.id} className={`p-4 rounded-lg border ${providerColors[fragment.provider] || 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                  fragment.provider === 'openai' ? 'bg-green-500' :
                                  fragment.provider === 'anthropic' ? 'bg-blue-500' : 'bg-orange-500'
                                }`}>
                                  {idx + 1}
                                </div>
                                <span className="font-medium">Fragment {idx + 1}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{fragment.provider.toUpperCase()}</Badge>
                                {fragment.anonymized && (
                                  <Badge variant="secondary" className="text-xs">
                                    🔒 Anonymized
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(fragment.context_percentage * 100)}% context
                                </Badge>
                              </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 p-3 rounded border font-mono text-sm">
                              {fragment.content}
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">
                              Length: {fragment.content.length} chars • ID: {fragment.id}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                    <p className="text-yellow-600 font-medium">{isProcessing ? 'Creating fragments...' : 'No fragments created yet'}</p>
                    <p className="text-sm text-muted-foreground">
                      {isProcessing ? 'Your query is being intelligently split into privacy-preserving fragments.' : 'Submit a query to see the fragmentation process.'}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        );
        
      case 3: // Planning
        return (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Orchestration Planning
              </DialogTitle>
              <DialogDescription>
                AI-powered provider routing and cost optimization
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <h4 className="font-semibold mb-2">Planning Phase</h4>
                  <p className="text-sm text-muted-foreground">
                    The orchestrator intelligence is analyzing fragment types, provider capabilities, 
                    and cost factors to determine optimal routing.
                  </p>
                </div>
                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="animate-pulse h-2 w-2 bg-blue-600 rounded-full" />
                      <span className="text-sm">Analyzing fragment semantics...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="animate-pulse h-2 w-2 bg-green-600 rounded-full" />
                      <span className="text-sm">Evaluating provider specializations...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="animate-pulse h-2 w-2 bg-orange-600 rounded-full" />
                      <span className="text-sm">Optimizing for cost and performance...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        );
        
      case 4: // Distribution
        return (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Multi-Provider Distribution & Cost Optimization
              </DialogTitle>
              <DialogDescription>
                Smart routing to OpenAI, Anthropic, and Google for optimal cost and performance
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {queryData?.cost_comparison ? `${queryData.cost_comparison.savings_percentage}%` : (isProcessing ? '...' : '0%')}
                    </div>
                    <div className="text-sm text-muted-foreground">Cost Savings</div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {queryData ? `$${queryData.cost_comparison.fragmented_cost.toFixed(4)}` : (isProcessing ? '...' : '$0')}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Cost</div>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {queryData ? `${queryData.total_time.toFixed(1)}s` : (isProcessing ? `${getProcessingDuration().toFixed(1)}s` : '0s')}
                    </div>
                    <div className="text-sm text-muted-foreground">Processing Time</div>
                  </div>
                </div>
                
                <Separator />
                
                {queryData?.fragments.length > 0 ? (
                  <div>
                    <h4 className="font-semibold mb-3">Provider Distribution:</h4>
                    <div className="space-y-4">
                      {['openai', 'anthropic', 'google'].map(providerId => {
                        const providerFragments = queryData.fragments.filter(f => f.provider === providerId);
                        if (providerFragments.length === 0) return null;
                        
                        const providerInfo = {
                          openai: { name: 'OpenAI GPT-4.1', icon: '🤖', color: 'bg-green-500', cost: 0.01 },
                          anthropic: { name: 'Anthropic Claude Sonnet 4', icon: '🧠', color: 'bg-blue-500', cost: 0.003 },
                          google: { name: 'Google Gemini 2.5 Flash', icon: '⚡', color: 'bg-orange-500', cost: 0.00075 }
                        }[providerId] || { name: providerId, icon: '🔧', color: 'bg-gray-500', cost: 0.001 };
                        
                        return (
                          <div key={providerId} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${providerInfo.color}`}>
                                  {providerInfo.icon}
                                </div>
                                <div>
                                  <h5 className="font-medium">{providerInfo.name}</h5>
                                  <p className="text-xs text-muted-foreground">${providerInfo.cost}/1K tokens</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold">{providerFragments.length}</div>
                                <div className="text-xs text-muted-foreground">fragments</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {providerFragments.map((fragment, idx) => (
                                <div key={fragment.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                                  <div className="flex items-center gap-1 mb-1">
                                    <span className="font-medium">Fragment {queryData.fragments.indexOf(fragment) + 1}</span>
                                    {fragment.anonymized && <span className="text-xs">🔒</span>}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {fragment.content.substring(0, 40)}...
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                    <p className="text-yellow-600 font-medium">{isProcessing ? 'Routing fragments...' : 'No distribution data yet'}</p>
                    <p className="text-sm text-muted-foreground">
                      {isProcessing ? 'Fragments are being intelligently routed to optimal providers.' : 'Submit a query to see provider distribution.'}
                    </p>
                  </div>
                )}
                
                {queryData?.cost_comparison && (
                  <div>
                    <Separator />
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Cost Analysis
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 border rounded-lg">
                        <div className="text-lg font-bold text-green-600">${queryData.cost_comparison.fragmented_cost.toFixed(4)}</div>
                        <div className="text-sm text-muted-foreground">Fragmented Query Cost</div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="text-lg font-bold text-red-600">${queryData.cost_comparison.single_provider_cost.toFixed(4)}</div>
                        <div className="text-sm text-muted-foreground">Single Provider Cost</div>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{queryData.cost_comparison.savings_percentage}%</div>
                        <div className="text-sm text-green-700">Cost Savings with Privacy Preservation</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        );
        
      case 5: // Aggregation
        return (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Response Aggregation
              </DialogTitle>
              <DialogDescription>
                Combining fragment responses into coherent output
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <h4 className="font-semibold mb-2">Semantic Merging</h4>
                  <p className="text-sm text-muted-foreground">
                    Using advanced NLP techniques to combine responses while maintaining coherence 
                    and removing redundancy.
                  </p>
                </div>
                {queryData?.fragment_responses && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Fragment Responses:</h4>
                    {queryData.fragment_responses.map((resp, idx) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline">{resp.provider.toUpperCase()}</Badge>
                          <span className="text-xs text-muted-foreground">{resp.processing_time.toFixed(2)}s</span>
                        </div>
                        <p className="text-sm">{resp.response.substring(0, 100)}...</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        );
        
      case 6: // Final Response
        return (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Final Response
              </DialogTitle>
              <DialogDescription>
                Privacy-preserved response with complete context
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                {queryData?.aggregated_response && (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <h4 className="font-semibold mb-2">Response:</h4>
                    <p className="text-sm whitespace-pre-wrap">{queryData.aggregated_response}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">
                      {queryData ? Math.round(queryData.privacy_score * 100) : 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Privacy Score</div>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      {queryData?.cost_comparison ? queryData.cost_comparison.savings_percentage : 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Cost Savings</div>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">
                      {queryData ? queryData.total_time.toFixed(1) : 0}s
                    </div>
                    <div className="text-sm text-muted-foreground">Total Time</div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        );
        
      default:
        return null;
    }
  };

  const steps = getSteps();

  return (
    <Card className="overflow-hidden">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">3D Query Fragmentation Visualization</h3>
            <p className="text-sm text-muted-foreground">Real-time privacy-preserving query processing with cost optimization</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={resetAnimation}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-[400px]"
          />
          
          {/* Enhanced Investor Demo Overlay */}
          <div className="absolute top-4 left-4 space-y-2">
            {/* Privacy Protection Score */}
            <Badge variant="secondary" className="bg-white/90 dark:bg-black/90 flex items-center gap-1 px-3 py-1">
              <Shield className="h-3 w-3" />
              Privacy Score: {
                realTimeData.privacy_update?.privacy_score || 
                (queryData ? Math.round(queryData.privacy_score * 100) : 'No Data')
              }%
            </Badge>
            
            {/* Cost Optimization */}
            <Badge variant="secondary" className="bg-white/90 dark:bg-black/90 flex items-center gap-1 px-3 py-1">
              <TrendingUp className="h-3 w-3" />
              Cost Savings: {
                realTimeData.cost_calculation?.savings_percentage || 
                (queryData?.cost_comparison ? Math.round(queryData.cost_comparison.savings_percentage) : 'No Data')
              }%
            </Badge>
            
            {/* Performance Metrics */}
            {(realTimeData.performance_metric || queryData) && (
              <Badge variant="secondary" className="bg-white/90 dark:bg-black/90 flex items-center gap-1 px-3 py-1">
                <Zap className="h-3 w-3" />
                {realTimeData.performance_metric?.total_processing_time?.toFixed(1) || queryData?.total_time?.toFixed(1)}s
              </Badge>
            )}
            
            {/* System Efficiency */}
            {realTimeData.performance_metric?.system_efficiency && (
              <Badge variant="secondary" className="bg-white/90 dark:bg-black/90 flex items-center gap-1 px-3 py-1">
                <Cpu className="h-3 w-3" />
                Efficiency: {Math.round(realTimeData.performance_metric.system_efficiency)}%
              </Badge>
            )}
            
            {/* ROI Calculation */}
            {realTimeData.cost_calculation?.roi_calculation && (
              <Badge variant="secondary" className="bg-white/90 dark:bg-black/90 flex items-center gap-1 px-3 py-1">
                <DollarSign className="h-3 w-3" />
                ROI: {Math.round(realTimeData.cost_calculation.roi_calculation)}%
              </Badge>
            )}
          </div>
          
          {/* Right side - Business Intelligence */}
          <div className="absolute top-4 right-4 space-y-2">
            {/* Provider Health */}
            <Badge variant="secondary" className="bg-green-50/90 dark:bg-green-950/90 border-green-200 text-green-700 flex items-center gap-1 px-3 py-1">
              <Network className="h-3 w-3" />
              {providers.filter(p => p.active).length} Providers Active
            </Badge>
            
            {/* Security Compliance */}
            <Badge variant="secondary" className="bg-blue-50/90 dark:bg-blue-950/90 border-blue-200 text-blue-700 flex items-center gap-1 px-3 py-1">
              <Shield className="h-3 w-3" />
              Enterprise Grade Security
            </Badge>
            
            {/* Market Opportunity Indicator */}
            {investorMetrics?.business_insights?.market_validation && (
              <Badge variant="secondary" className="bg-purple-50/90 dark:bg-purple-950/90 border-purple-200 text-purple-700 flex items-center gap-1 px-3 py-1">
                <TrendingUp className="h-3 w-3" />
                $2.3B TAM
              </Badge>
            )}
          </div>
        </div>

        {/* Progress Steps - Interactive with Real-time Updates */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {steps.map((step, index) => {
            const isCompleted = step.status === 'completed';
            const isProcessing = step.status === 'processing';
            const isPending = step.status === 'pending' || step.status === 'ready';
            const isClickable = isCompleted || (isProcessing && queryData);
            
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-lg border transition-all cursor-pointer transform hover:scale-105 ${
                  isCompleted
                    ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-300"
                    : isProcessing
                    ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-300 animate-pulse"
                    : "bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-950/20 dark:border-gray-800 dark:text-gray-400"
                } ${
                  isClickable ? "hover:shadow-md" : "cursor-not-allowed opacity-60"
                }`}
                onClick={() => {
                  if (isClickable) {
                    setSelectedStep(index);
                  }
                }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isProcessing
                        ? "bg-blue-500 text-white"
                        : "bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                    }`}>
                      {isCompleted ? <CheckCircle2 className="h-3 w-3" /> : step.icon}
                    </div>
                    <p className="font-medium text-sm">{step.title}</p>
                  </div>
                  <p className="text-xs">{step.description}</p>
                  {isClickable && (
                    <p className="text-xs opacity-60 italic">Click for details</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {/* Modal for Step Details */}
        <Dialog open={selectedStep !== null} onOpenChange={() => setSelectedStep(null)}>
          {selectedStep !== null && renderStepModal(selectedStep)}
        </Dialog>
      </div>
    </Card>
  );
}