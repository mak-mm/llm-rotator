"use client";

import { useEffect, useMemo, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '@/components/ui/card';
import { useQuery } from '@/contexts/query-context';
import { useSSESubscription, useSSEContext } from '@/contexts/sse-context';

interface ProcessingFlowProps {
  requestId: string | null;
  isProcessing: boolean;
}

interface StepState {
  [key: string]: 'pending' | 'processing' | 'completed';
}

interface Fragment {
  id: string;
  provider: 'openai' | 'anthropic' | 'google';
  status: 'pending' | 'processing' | 'completed';
  content?: string;
  processingTime?: number;
}

// Map backend step names to frontend display steps
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

export function EnhancedProcessingFlow({ requestId, isProcessing }: ProcessingFlowProps) {
  const { processingSteps } = useQuery();
  const { isConnected } = useSSEContext();
  
  const [stepStates, setStepStates] = useState<StepState>({
    planning: 'pending',
    pii_detection: 'pending',
    fragmentation: 'pending',
    enhancement: 'pending',
    distribution: 'pending',
    aggregation: 'pending',
    final_response: 'pending',
  });

  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [showFragments, setShowFragments] = useState(false);

  // Provider styles for beautiful visualization
  const providerStyles = {
    openai: {
      background: 'linear-gradient(135deg, #10a37f 0%, #1a7f64 100%)',
      border: '2px solid #10a37f',
      shadow: '0 8px 32px rgba(16, 163, 127, 0.3)',
      icon: '🤖'
    },
    anthropic: {
      background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
      border: '2px solid #d97706', 
      shadow: '0 8px 32px rgba(217, 119, 6, 0.3)',
      icon: '🧠'
    },
    google: {
      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
      border: '2px solid #dc2626',
      shadow: '0 8px 32px rgba(220, 38, 38, 0.3)',
      icon: '🔍'
    }
  };

  // Enhanced SSE subscription with fragment tracking
  useSSESubscription(['step_progress', 'complete'], (message) => {
    console.log('🎯 Enhanced Flow SSE Event:', JSON.stringify(message, null, 2));
    
    if (message.type === 'step_progress' && message.data) {
      const { step, status, message: stepMessage } = message.data;
      const mappedStep = stepMapping[step] || step;
      
      // Handle distribution step to show fragments dynamically
      if (step === 'distribution') {
        if (status === 'processing' && stepMessage?.includes('parallel')) {
          // Parse "🚀 Sending 3 fragments to providers in parallel..."
          const fragmentMatch = stepMessage.match(/(\d+) fragments/);
          if (fragmentMatch) {
            const totalFragments = parseInt(fragmentMatch[1]);
            
            // Create fragments with round-robin provider assignment
            const newFragments = Array.from({ length: totalFragments }, (_, i) => ({
              id: `fragment-${i + 1}`,
              provider: (['openai', 'anthropic', 'google'] as const)[i % 3],
              status: 'processing' as const
            }));
            
            setFragments(newFragments);
            setShowFragments(true);
          }
        } else if (status === 'completed') {
          // Mark all fragments as completed
          setFragments(prev => prev.map(f => ({ ...f, status: 'completed' as const })));
          
          // Hide fragments after 3 seconds
          setTimeout(() => {
            setShowFragments(false);
            setFragments([]);
          }, 3000);
        }
      }
      
      // Update step states
      setStepStates(prev => ({
        ...prev,
        [mappedStep]: status
      }));
    }
    
    // Handle completion to get actual fragment data
    if (message.type === 'complete' && message.data?.fragments) {
      const responseFragments = message.data.fragments;
      setFragments(prev => {
        return responseFragments.map((frag: any, idx: number) => ({
          id: frag.id || `fragment-${idx + 1}`,
          provider: frag.provider || prev[idx]?.provider || 'openai',
          status: 'completed' as const,
          content: frag.content,
          processingTime: frag.processing_time
        }));
      });
    }
  }, []);

  // Reset on new requests
  useEffect(() => {
    if (isProcessing && requestId) {
      setStepStates({
        planning: 'processing',
        pii_detection: 'pending',
        fragmentation: 'pending',
        enhancement: 'pending',
        distribution: 'pending',
        aggregation: 'pending',
        final_response: 'pending',
      });
      setFragments([]);
      setShowFragments(false);
    }
  }, [isProcessing, requestId]);

  // Generate award-winning dynamic nodes
  const nodes: Node[] = useMemo(() => {
    const getStepStyle = (step: string) => ({
      background: stepStates[step] === 'completed' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                 stepStates[step] === 'processing' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 
                 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      color: stepStates[step] === 'pending' ? '#64748b' : 'white',
      border: stepStates[step] === 'completed' ? '2px solid #10b981' :
              stepStates[step] === 'processing' ? '2px solid #3b82f6' : '2px solid #cbd5e1',
      borderRadius: '16px',
      fontSize: '14px',
      fontWeight: '600',
      padding: '16px 24px',
      boxShadow: stepStates[step] === 'processing' ? '0 20px 40px rgba(59, 130, 246, 0.4)' :
                 stepStates[step] === 'completed' ? '0 20px 40px rgba(16, 185, 129, 0.4)' : 
                 '0 4px 12px rgba(0, 0, 0, 0.1)',
      transform: stepStates[step] === 'processing' ? 'scale(1.05)' : 'scale(1)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      backdropFilter: 'blur(8px)',
      minWidth: '140px',
      textAlign: 'center'
    });

    // Base processing steps
    const baseNodes: Node[] = [
      {
        id: 'planning',
        position: { x: 200, y: 50 },
        data: { label: '🧠 Planning' },
        style: getStepStyle('planning')
      },
      {
        id: 'pii_detection',
        position: { x: 50, y: 150 },
        data: { label: '🔍 PII Detection' },
        style: getStepStyle('pii_detection')
      },
      {
        id: 'fragmentation',
        position: { x: 200, y: 150 },
        data: { label: '✂️ Fragmentation' },
        style: getStepStyle('fragmentation')
      },
      {
        id: 'enhancement',
        position: { x: 350, y: 150 },
        data: { label: '🎯 Enhancement' },
        style: getStepStyle('enhancement')
      },
      {
        id: 'distribution',
        position: { x: 200, y: 250 },
        data: { label: showFragments ? '🚀 Live Distribution' : '🚀 Distribution' },
        style: {
          ...getStepStyle('distribution'),
          background: showFragments ? 
            'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 
            getStepStyle('distribution').background,
          border: showFragments ? '2px solid #8b5cf6' : getStepStyle('distribution').border,
          boxShadow: showFragments ? 
            '0 20px 40px rgba(139, 92, 246, 0.6)' : 
            getStepStyle('distribution').boxShadow
        }
      },
      {
        id: 'aggregation',
        position: { x: 100, y: 400 },
        data: { label: '🔗 Aggregation' },
        style: getStepStyle('aggregation')
      },
      {
        id: 'final_response',
        position: { x: 300, y: 400 },
        data: { label: '✅ Final Response' },
        style: getStepStyle('final_response')
      }
    ];

    // Add dynamic fragment nodes when showing fragments
    if (showFragments && fragments.length > 0) {
      const fragmentNodes = fragments.map((fragment, index) => {
        const angle = (index / fragments.length) * 2 * Math.PI;
        const radius = 120;
        const centerX = 200;
        const centerY = 350;
        
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        const provider = providerStyles[fragment.provider];
        
        return {
          id: fragment.id,
          position: { x: x - 60, y: y - 30 },
          data: { 
            label: `${provider.icon} Fragment ${index + 1}`,
            provider: fragment.provider.toUpperCase(),
            status: fragment.status
          },
          style: {
            background: provider.background,
            border: provider.border,
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600',
            padding: '8px 12px',
            color: 'white',
            boxShadow: provider.shadow,
            transform: fragment.status === 'processing' ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.3s ease',
            minWidth: '120px',
            textAlign: 'center',
            opacity: fragment.status === 'completed' ? 0.8 : 1
          }
        };
      });
      
      // Add provider hub nodes
      const providerHubs = [
        {
          id: 'openai-hub',
          position: { x: 500, y: 250 },
          data: { label: '🤖 OpenAI' },
          style: {
            ...providerStyles.openai,
            borderRadius: '20px',
            padding: '16px 20px',
            fontSize: '14px',
            fontWeight: '700',
            color: 'white',
            minWidth: '100px',
            textAlign: 'center'
          }
        },
        {
          id: 'anthropic-hub',
          position: { x: 500, y: 350 },
          data: { label: '🧠 Anthropic' },
          style: {
            ...providerStyles.anthropic,
            borderRadius: '20px',
            padding: '16px 20px',
            fontSize: '14px',
            fontWeight: '700',
            color: 'white',
            minWidth: '100px',
            textAlign: 'center'
          }
        },
        {
          id: 'google-hub',
          position: { x: 500, y: 450 },
          data: { label: '🔍 Google' },
          style: {
            ...providerStyles.google,
            borderRadius: '20px',
            padding: '16px 20px',
            fontSize: '14px',
            fontWeight: '700',
            color: 'white',
            minWidth: '100px',
            textAlign: 'center'
          }
        }
      ];
      
      return [...baseNodes, ...fragmentNodes, ...providerHubs];
    }

    return baseNodes;
  }, [stepStates, fragments, showFragments]);

  // Generate dynamic edges
  const edges: Edge[] = useMemo(() => {
    const baseEdges: Edge[] = [
      {
        id: 'planning-pii',
        source: 'planning',
        target: 'pii_detection',
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: stepStates.pii_detection === 'processing',
        style: { 
          strokeWidth: 3,
          stroke: stepStates.pii_detection === 'processing' ? '#3b82f6' : '#cbd5e1'
        }
      },
      {
        id: 'pii-fragmentation',
        source: 'pii_detection',
        target: 'fragmentation',
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: stepStates.fragmentation === 'processing',
        style: { 
          strokeWidth: 3,
          stroke: stepStates.fragmentation === 'processing' ? '#3b82f6' : '#cbd5e1'
        }
      },
      {
        id: 'fragmentation-enhancement',
        source: 'fragmentation',
        target: 'enhancement',
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: stepStates.enhancement === 'processing',
        style: { 
          strokeWidth: 3,
          stroke: stepStates.enhancement === 'processing' ? '#3b82f6' : '#cbd5e1'
        }
      },
      {
        id: 'enhancement-distribution',
        source: 'enhancement',
        target: 'distribution',
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: stepStates.distribution === 'processing',
        style: { 
          strokeWidth: 3,
          stroke: stepStates.distribution === 'processing' ? '#8b5cf6' : '#cbd5e1'
        }
      },
      {
        id: 'distribution-aggregation',
        source: 'distribution',
        target: 'aggregation',
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: stepStates.aggregation === 'processing',
        style: { 
          strokeWidth: 3,
          stroke: stepStates.aggregation === 'processing' ? '#3b82f6' : '#cbd5e1'
        }
      },
      {
        id: 'aggregation-final',
        source: 'aggregation',
        target: 'final_response',
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: stepStates.final_response === 'processing',
        style: { 
          strokeWidth: 3,
          stroke: stepStates.final_response === 'processing' ? '#3b82f6' : '#cbd5e1'
        }
      }
    ];

    // Add dynamic fragment-to-provider edges when showing fragments
    if (showFragments && fragments.length > 0) {
      const fragmentEdges = fragments.map(fragment => ({
        id: `${fragment.id}-to-${fragment.provider}`,
        source: fragment.id,
        target: `${fragment.provider}-hub`,
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: fragment.status === 'processing',
        style: {
          strokeWidth: 2,
          stroke: fragment.status === 'processing' ? providerStyles[fragment.provider].border.split(' ')[2] : '#cbd5e1',
          strokeDasharray: fragment.status === 'completed' ? '5,5' : undefined
        }
      }));

      return [...baseEdges, ...fragmentEdges];
    }

    return baseEdges;
  }, [stepStates, fragments, showFragments]);

  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🚀 Privacy-Preserving Processing Pipeline
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-gray-600">Live Processing</span>
          </div>
        </div>
        
        <div className="w-full h-[600px] border rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            attributionPosition="bottom-left"
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1} 
              color="#e2e8f0"
            />
            <Controls 
              showZoom={true}
              showFitView={true}
              showInteractive={false}
            />
          </ReactFlow>
        </div>
        
        <div className="flex gap-6 mt-4 text-sm justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-r from-slate-200 to-slate-300 rounded"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded"></div>
            <span>Processing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-green-600 rounded"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded"></div>
            <span>Live Distribution</span>
          </div>
        </div>
      </div>
    </Card>
  );
}