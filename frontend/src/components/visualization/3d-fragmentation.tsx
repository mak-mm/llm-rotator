"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCw, Maximize2, Shield, Zap, Eye, TrendingUp } from "lucide-react";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  // Debug logging to see if data is flowing
  useEffect(() => {
    console.log('🔍 3D Visualization - Query Data:', queryData);
    console.log('🔍 3D Visualization - Is Processing:', isProcessing);
  }, [queryData, isProcessing]);

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
      const realFragments = queryData.fragments.map((fragment) => {
        const provider = providers.find(p => p.id === fragment.provider);
        const targetPos = provider?.position || { x: 0, y: 0, z: 0 };
        
        return {
          id: fragment.id,
          text: fragment.content,
          provider: fragment.provider,
          color: provider?.color || "#888",
          position: { x: 0, y: 0, z: 0 },
          targetPosition: {
            x: targetPos.x + (Math.random() - 0.5) * 40, // Add slight randomization
            y: targetPos.y + (Math.random() - 0.5) * 40,
            z: targetPos.z
          },
          processed: true,
          anonymized: fragment.anonymized
        };
      });
      
      setFragments(realFragments);
      
      // Update active providers
      const activeProviderIds = new Set(queryData.fragments.map(f => f.provider));
      setProviders(prev => prev.map(p => ({ ...p, active: activeProviderIds.has(p.id) })));
    } else if (isProcessing) {
      // Show processing state
      setFragments([]);
    } else {
      // Idle state - no fragments to display until user submits a query
      setFragments([]);
      setProviders(prev => prev.map(p => ({ ...p, active: false })));
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

      // Animate fragments
      if (isPlaying) {
        timeRef.current += 0.02;
        const progress = Math.min(timeRef.current, 1);

        // Update fragment positions
        fragments.forEach((fragment, index) => {
          const delay = index * 0.2;
          const fragmentProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
          
          // Easing function
          const easeProgress = 1 - Math.pow(1 - fragmentProgress, 3);

          // Calculate current position
          const currentX = fragment.position.x + (fragment.targetPosition.x - fragment.position.x) * easeProgress;
          const currentY = fragment.position.y + (fragment.targetPosition.y - fragment.position.y) * easeProgress;

          // Draw fragment
          const x = centerX + currentX * 0.8;
          const y = centerY + currentY * 0.8;

          // Fragment box
          const boxWidth = 150;
          const boxHeight = 40;
          ctx.fillStyle = fragment.color + "15";
          ctx.fillRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);
          ctx.strokeStyle = fragment.color;
          ctx.lineWidth = 2;
          ctx.strokeRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);

          // Fragment text
          ctx.font = "14px Inter";
          ctx.fillStyle = "#000";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(fragment.text, x, y);
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
      
      if (queryData?.original_query) {
        // Show real query data
        if (timeRef.current < 0.5) {
          const displayQuery = queryData.original_query.length > 50 
            ? queryData.original_query.substring(0, 47) + "..."
            : queryData.original_query;
          ctx.fillText(displayQuery, centerX, centerY);
        } else {
          ctx.fillText(`${fragments.length} Fragments Distributed`, centerX, centerY);
        }
      } else if (isProcessing) {
        ctx.fillText("Processing Query...", centerX, centerY);
      } else {
        // Idle state - ready for queries
        ctx.fillText("Enter a query to see real-time fragmentation", centerX, centerY);
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

  // Dynamic steps based on query data
  const getSteps = () => {
    if (!queryData && !isProcessing) {
      return [
        { title: "Original Query", description: "Ready to process your query", icon: <Eye className="h-4 w-4" /> },
        { title: "PII Detection", description: "Will identify personal data and sensitive content", icon: <Shield className="h-4 w-4" /> },
        { title: "Fragmentation", description: "Will split query into privacy-preserving fragments", icon: <Zap className="h-4 w-4" /> },
        { title: "Distribution", description: "Will route fragments to optimal LLM providers", icon: <TrendingUp className="h-4 w-4" /> },
      ];
    } else if (isProcessing) {
      return [
        { title: "Original Query", description: "Processing your query...", icon: <Eye className="h-4 w-4" /> },
        { title: "PII Detection", description: "Identifying personal data and sensitive content...", icon: <Shield className="h-4 w-4" /> },
        { title: "Fragmentation", description: "Splitting query into privacy-preserving fragments...", icon: <Zap className="h-4 w-4" /> },
        { title: "Distribution", description: "Routing fragments to optimal LLM providers...", icon: <TrendingUp className="h-4 w-4" /> },
      ];
    }

    const piiCount = queryData.detection.pii_entities.length;
    const fragmentCount = queryData.fragments.length;
    const providers = Array.from(new Set(queryData.fragments.map(f => f.provider)));

    return [
      { 
        title: "Original Query", 
        description: `Query: "${queryData.original_query.substring(0, 30)}..."`,
        icon: <Eye className="h-4 w-4" />
      },
      { 
        title: "PII Detection", 
        description: `${piiCount} PII entities detected (${queryData.detection.has_pii ? 'sensitive' : 'clean'})`,
        icon: <Shield className="h-4 w-4" />
      },
      { 
        title: "Fragmentation", 
        description: `Split into ${fragmentCount} privacy-preserving fragments`,
        icon: <Zap className="h-4 w-4" />
      },
      { 
        title: "Distribution", 
        description: `Routed to ${providers.length} providers: ${providers.join(', ')}`,
        icon: <TrendingUp className="h-4 w-4" />
      },
    ];
  };

  const steps = getSteps();

  return (
    <Card className="overflow-hidden">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">3D Query Fragmentation Visualization</h3>
            <p className="text-sm text-muted-foreground">Watch how queries are securely fragmented and distributed</p>
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
          
          {/* Overlay badges */}
          <div className="absolute top-4 left-4 space-y-2">
            <Badge variant="secondary" className="bg-white/90 dark:bg-black/90 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Privacy Score: {queryData ? Math.round(queryData.privacy_score * 100) : 'No Data'}%
            </Badge>
            <Badge variant="secondary" className="bg-white/90 dark:bg-black/90 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Cost Savings: {queryData?.cost_comparison ? Math.round(queryData.cost_comparison.savings_percentage) : 'No Data'}%
            </Badge>
            {queryData && (
              <Badge variant="secondary" className="bg-white/90 dark:bg-black/90 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {queryData.total_time.toFixed(1)}s
              </Badge>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="grid grid-cols-4 gap-2">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`p-3 rounded-lg border transition-all ${
                currentStep >= index
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-muted/50 border-muted-foreground/20 text-muted-foreground"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    currentStep >= index ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {step.icon}
                  </div>
                  <p className="font-medium text-sm">{step.title}</p>
                </div>
                <p className="text-xs opacity-80">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Card>
  );
}