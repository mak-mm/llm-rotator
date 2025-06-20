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

export function ProcessingFlow({ requestId, isProcessing }: ProcessingFlowProps) {
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
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Debug logging
  console.log('🎯 ProcessingFlow render - requestId:', requestId, 'isProcessing:', isProcessing, 'SSE connected:', isConnected);
  
  // Subscribe to step progress updates from global SSE connection
  useSSESubscription(['step_progress', 'complete'], (message) => {
    console.log('🎯 Flow SSE Event:', JSON.stringify(message, null, 2));
    
    if (message.type === 'step_progress' && message.data) {
      const { step, status, message: stepMessage } = message.data;
      const mappedStep = stepMapping[step] || step;
      console.log(`🔄 Flow Step Update: ${step} (mapped to ${mappedStep}) -> ${status}`);
      console.log(`🔄 Step Message: "${stepMessage}"`);
      
      // Handle distribution step specially to show fragments
      if (step === 'distribution') {
        console.log('🎯 Distribution step detected!', { status, stepMessage });
        
        if (status === 'processing') {
          console.log('🎯 Distribution is processing, checking for fragment message...');
          
          // Check for various possible message formats
          if (stepMessage?.includes('fragments') || stepMessage?.includes('fragment')) {
            console.log('🎯 Found fragment-related message!');
            
            // Try different patterns to extract fragment count
            let fragmentMatch = stepMessage.match(/(\d+) fragments/);
            if (!fragmentMatch) {
              fragmentMatch = stepMessage.match(/Sending (\d+)/);
            }
            if (!fragmentMatch) {
              fragmentMatch = stepMessage.match(/(\d+)/); // Any number
            }
            
            if (fragmentMatch) {
              const totalFragments = parseInt(fragmentMatch[1]);
              console.log(`🎯 Creating ${totalFragments} fragment nodes for visualization`);
              
              // Create fragments with round-robin provider assignment
              const newFragments = Array.from({ length: totalFragments }, (_, i) => ({
                id: `fragment-${i + 1}`,
                provider: (['openai', 'anthropic', 'google'] as const)[i % 3],
                status: 'processing' as const
              }));
              
              setFragments(newFragments);
              // Don't automatically show fragments - wait for distribution node click
              console.log('🎯 Fragment nodes created:', newFragments);
            } else {
              console.log('🎯 Could not extract fragment count from message:', stepMessage);
              // Fallback: create 3 fragments
              const newFragments = Array.from({ length: 3 }, (_, i) => ({
                id: `fragment-${i + 1}`,
                provider: (['openai', 'anthropic', 'google'] as const)[i % 3],
                status: 'processing' as const
              }));
              
              setFragments(newFragments);
              console.log('🎯 Using fallback: 3 fragments created');
            }
          } else {
            console.log('🎯 No fragment message found in:', stepMessage);
          }
        } else if (status === 'completed') {
          console.log('🎯 Distribution completed, marking fragments as completed');
          // Mark all fragments as completed - keep them persistent
          setFragments(prev => prev.map(f => ({ ...f, status: 'completed' as const })));
        }
      }
      
      // Handle all SSE updates normally
      setStepStates(prev => {
        const newState = {
          ...prev,
          [mappedStep]: status
        };
        console.log(`📊 Updating stepStates from:`, prev, `to:`, newState);
        return newState;
      });
    }
    
    // Handle completion to get fragment data
    if (message.type === 'complete' && message.data) {
      const { fragments: responseFragments } = message.data;
      if (responseFragments && Array.isArray(responseFragments)) {
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
    }
  }, []);
  
  // Disable context-based updates since we're using SSE directly
  // This prevents conflicts between the two update sources
  /*
  useEffect(() => {
    console.log('🎯 Processing steps from context:', processingSteps);
    console.log('🎯 Current step states:', stepStates);
    
    // Convert context processing steps to local step states
    const newStepStates = { ...stepStates };
    let hasChanges = false;
    
    Object.entries(processingSteps).forEach(([step, data]) => {
      const currentStatus = newStepStates[step];
      let newStatus = currentStatus;
      
      if (data.status === 'completed' && currentStatus !== 'completed') {
        newStatus = 'completed';
        hasChanges = true;
        console.log(`🔄 Step ${step} completed`);
      } else if (data.status === 'processing' && currentStatus === 'pending') {
        newStatus = 'processing';
        hasChanges = true;
        console.log(`🔄 Step ${step} started processing`);
      }
      
      newStepStates[step] = newStatus;
    });
    
    if (hasChanges) {
      console.log('🔄 Updating step states:', newStepStates);
      setStepStates(newStepStates);
    }
  }, [processingSteps]);
  */

  // Reset when processing starts or requestId changes
  useEffect(() => {
    if (isProcessing && requestId) {
      console.log('🔄 Resetting flow for new request:', requestId);
      setStepStates({
        planning: 'processing',
        pii_detection: 'pending',
        fragmentation: 'pending',
        enhancement: 'pending',
        distribution: 'pending',
        aggregation: 'pending',
        final_response: 'pending',
      });
    } else if (!isProcessing) {
      // When processing stops, ensure we don't keep stale state
      console.log('🔄 Processing stopped, maintaining final state');
    }
  }, [isProcessing, requestId]);
  
  // Force reset when a new requestId is set (even if processing was already true)
  const prevRequestIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (requestId && requestId !== prevRequestIdRef.current) {
      console.log('🔄 New request ID detected, forcing reset:', requestId);
      prevRequestIdRef.current = requestId;
      setStepStates({
        planning: 'processing',
        pii_detection: 'pending',
        fragmentation: 'pending',
        enhancement: 'pending',
        distribution: 'pending',
        aggregation: 'pending',
        final_response: 'pending',
      });
    }
  }, [requestId]);

  // Provider colors and styles
  const providerStyles = {
    openai: {
      background: 'linear-gradient(135deg, #10a37f 0%, #1a7f64 100%)',
      border: '2px solid #10a37f',
      shadow: '0 8px 32px rgba(16, 163, 127, 0.3)'
    },
    anthropic: {
      background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
      border: '2px solid #d97706', 
      shadow: '0 8px 32px rgba(217, 119, 6, 0.3)'
    },
    google: {
      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
      border: '2px solid #dc2626',
      shadow: '0 8px 32px rgba(220, 38, 38, 0.3)'
    }
  };

  // Generate nodes based on current step states and fragments
  const nodes: Node[] = useMemo(() => {
    console.log('📊 Generating nodes with stepStates:', stepStates, 'fragments:', fragments, 'selectedNode:', selectedNode);
    
    const baseNodes = [
    {
      id: 'planning',
      type: 'default',
      position: { x: 150, y: 50 },
      data: { 
        label: '🧠 Planning',
        status: stepStates.planning 
      },
      style: {
        background: stepStates.planning === 'completed' ? '#10b981' : 
                   stepStates.planning === 'processing' ? '#3b82f6' : '#e5e7eb',
        color: stepStates.planning === 'pending' ? '#6b7280' : 'white',
        border: '2px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 'bold',
        padding: '10px'
      }
    },
    {
      id: 'pii_detection',
      type: 'default',
      position: { x: 50, y: 150 },
      data: { 
        label: '🔍 PII Detection',
        status: stepStates.pii_detection 
      },
      style: {
        background: stepStates.pii_detection === 'completed' ? '#10b981' : 
                   stepStates.pii_detection === 'processing' ? '#3b82f6' : '#e5e7eb',
        color: stepStates.pii_detection === 'pending' ? '#6b7280' : 'white',
        border: '2px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 'bold',
        padding: '10px'
      }
    },
    {
      id: 'fragmentation',
      type: 'default',
      position: { x: 200, y: 150 },
      data: { 
        label: '✂️ Fragmentation',
        status: stepStates.fragmentation 
      },
      style: {
        background: stepStates.fragmentation === 'completed' ? '#10b981' : 
                   stepStates.fragmentation === 'processing' ? '#3b82f6' : '#e5e7eb',
        color: stepStates.fragmentation === 'pending' ? '#6b7280' : 'white',
        border: '2px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 'bold',
        padding: '10px'
      }
    },
    {
      id: 'enhancement',
      type: 'default',
      position: { x: 350, y: 150 },
      data: { 
        label: '🎯 Enhancement',
        status: stepStates.enhancement 
      },
      style: {
        background: stepStates.enhancement === 'completed' ? '#10b981' : 
                   stepStates.enhancement === 'processing' ? '#3b82f6' : '#e5e7eb',
        color: stepStates.enhancement === 'pending' ? '#6b7280' : 'white',
        border: '2px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 'bold',
        padding: '10px'
      }
    },
    {
      id: 'distribution',
      type: 'default',
      position: { x: 200, y: 250 },
      data: { 
        label: fragments.length > 0 ? `🚀 Distribution (${fragments.length})` : '🚀 Distribution',
        status: stepStates.distribution 
      },
      style: {
        background: stepStates.distribution === 'completed' ? '#10b981' : 
                   stepStates.distribution === 'processing' ? '#3b82f6' : '#e5e7eb',
        color: stepStates.distribution === 'pending' ? '#6b7280' : 'white',
        border: fragments.length > 0 && selectedNode === 'distribution' ? '3px solid #1e40af' : '2px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 'bold',
        padding: '10px',
        cursor: fragments.length > 0 ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        boxShadow: fragments.length > 0 && selectedNode === 'distribution' ? '0 0 0 3px rgba(59, 130, 246, 0.2)' : 'none'
      }
    },
    {
      id: 'aggregation',
      type: 'default',
      position: { x: 100, y: 350 },
      data: { 
        label: '🔗 Aggregation',
        status: stepStates.aggregation 
      },
      style: {
        background: stepStates.aggregation === 'completed' ? '#10b981' : 
                   stepStates.aggregation === 'processing' ? '#3b82f6' : '#e5e7eb',
        color: stepStates.aggregation === 'pending' ? '#6b7280' : 'white',
        border: '2px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 'bold',
        padding: '10px'
      }
    },
    {
      id: 'final_response',
      type: 'default',
      position: { x: 300, y: 350 },
      data: { 
        label: '✅ Final Response',
        status: stepStates.final_response 
      },
      style: {
        background: stepStates.final_response === 'completed' ? '#10b981' : 
                   stepStates.final_response === 'processing' ? '#3b82f6' : '#e5e7eb',
        color: stepStates.final_response === 'pending' ? '#6b7280' : 'white',
        border: '2px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 'bold',
        padding: '10px'
      }
    }
  ];
  
  // Add fragment nodes when distribution node is selected
  if (selectedNode === 'distribution' && fragments.length > 0) {
    const fragmentNodes = fragments.map((fragment, index) => {
      const angle = (index / fragments.length) * 2 * Math.PI;
      const radius = 100;
      const centerX = 200; // Distribution node x position
      const centerY = 250; // Distribution node y position
      
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      // Provider colors
      const providerColors = {
        openai: '#10a37f',
        anthropic: '#d97706', 
        google: '#dc2626'
      };
      
      return {
        id: fragment.id,
        type: 'default',
        position: { x: x - 40, y: y - 15 },
        data: { 
          label: `Fragment ${index + 1}`,
          provider: fragment.provider.toUpperCase(),
          status: fragment.status
        },
        style: {
          background: fragment.status === 'completed' 
            ? `${providerColors[fragment.provider]}dd` // Slightly transparent when completed
            : providerColors[fragment.provider] || '#6b7280',
          color: 'white',
          border: fragment.status === 'processing' ? '2px solid #ffffff' : '1px solid #ffffff',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 'bold',
          padding: '6px 10px',
          minWidth: '80px',
          textAlign: 'center',
          opacity: fragment.status === 'completed' ? 0.8 : 1,
          boxShadow: fragment.status === 'processing' 
            ? '0 0 8px rgba(255, 255, 255, 0.5)' 
            : '0 2px 4px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease'
        }
      };
    });
    
    baseNodes.push(...fragmentNodes);
  }
  
  return baseNodes;
  }, [stepStates, fragments, selectedNode]);

  const edges: Edge[] = useMemo(() => [
    {
      id: 'planning-pii',
      source: 'planning',
      target: 'pii_detection',
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: stepStates.pii_detection === 'processing',
      style: { strokeWidth: 2 }
    },
    {
      id: 'pii-fragmentation',
      source: 'pii_detection',
      target: 'fragmentation',
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: stepStates.fragmentation === 'processing',
      style: { strokeWidth: 2 }
    },
    {
      id: 'fragmentation-enhancement',
      source: 'fragmentation',
      target: 'enhancement',
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: stepStates.enhancement === 'processing',
      style: { strokeWidth: 2 }
    },
    {
      id: 'enhancement-distribution',
      source: 'enhancement',
      target: 'distribution',
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: stepStates.distribution === 'processing',
      style: { strokeWidth: 2 }
    },
    {
      id: 'distribution-aggregation',
      source: 'distribution',
      target: 'aggregation',
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: stepStates.aggregation === 'processing',
      style: { strokeWidth: 2 }
    },
    {
      id: 'aggregation-final',
      source: 'aggregation',
      target: 'final_response',
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: stepStates.final_response === 'processing',
      style: { strokeWidth: 2 }
    }
  ], [stepStates]);

  // Force re-render when stepStates change
  const [flowKey, setFlowKey] = useState(0);
  useEffect(() => {
    setFlowKey(prev => prev + 1);
  }, [stepStates]);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Privacy-Preserving Processing Pipeline</h3>
      <div className="w-full h-[500px] border rounded-lg">
        <ReactFlow
          key={flowKey}
          nodes={nodes}
          edges={edges}
          fitView
          attributionPosition="bottom-left"
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          onNodeClick={(event, node) => {
            console.log('🎯 Node clicked:', node.id, 'Current selectedNode:', selectedNode, 'Fragments:', fragments.length);
            if (node.id === 'distribution' && fragments.length > 0) {
              const newSelection = selectedNode === 'distribution' ? null : 'distribution';
              console.log('🎯 Setting selectedNode to:', newSelection);
              setSelectedNode(newSelection);
            }
          }}
          onPaneClick={() => {
            console.log('🎯 Pane clicked, hiding fragments');
            setSelectedNode(null);
          }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      <div className="flex gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-300 rounded"></div>
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Processing</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Completed</span>
        </div>
        {fragments.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded animate-pulse"></div>
            <span>Click Distribution to view fragments</span>
          </div>
        )}
      </div>
    </Card>
  );
}