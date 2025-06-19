"use client";

import { useEffect, useMemo, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '@/components/ui/card';
import { useQuery } from '@/contexts/query-context';
import { useSSESubscription } from '@/contexts/sse-context';

interface ProcessingFlowProps {
  requestId: string | null;
  isProcessing: boolean;
}

interface StepState {
  [key: string]: 'pending' | 'processing' | 'completed';
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
  
  const [stepStates, setStepStates] = useState<StepState>({
    planning: 'pending',
    pii_detection: 'pending',
    fragmentation: 'pending',
    enhancement: 'pending',
    distribution: 'pending',
    aggregation: 'pending',
    final_response: 'pending',
  });

  // Subscribe to step progress updates from global SSE connection
  useSSESubscription('step_progress', (message) => {
    console.log('🎯 Flow SSE Event:', JSON.stringify(message, null, 2));
    
    if (message.data) {
      const { step, status } = message.data;
      const mappedStep = stepMapping[step] || step;
      console.log(`🔄 Flow Step Update: ${step} (mapped to ${mappedStep}) -> ${status}`);
      
      // Handle all SSE updates normally - no artificial delays needed
      setStepStates(prev => {
        // For processing status, only update if not already completed
        if (status === 'processing' && prev[mappedStep] === 'completed') {
          console.log(`⚠️ Skipping processing update for already completed step: ${mappedStep}`);
          return prev;
        }
        
        const newState = {
          ...prev,
          [mappedStep]: status
        };
        console.log(`📊 Updating stepStates from:`, prev, `to:`, newState);
        return newState;
      });
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

  // Generate nodes based on current step states
  const nodes: Node[] = useMemo(() => {
    console.log('📊 Generating nodes with stepStates:', stepStates);
    return [
    {
      id: 'planning',
      position: { x: 100, y: 100 },
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
      position: { x: 300, y: 100 },
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
      position: { x: 500, y: 100 },
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
      position: { x: 700, y: 100 },
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
      position: { x: 400, y: 250 },
      data: { 
        label: '🚀 Distribution',
        status: stepStates.distribution 
      },
      style: {
        background: stepStates.distribution === 'completed' ? '#10b981' : 
                   stepStates.distribution === 'processing' ? '#3b82f6' : '#e5e7eb',
        color: stepStates.distribution === 'pending' ? '#6b7280' : 'white',
        border: '2px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 'bold',
        padding: '10px'
      }
    },
    {
      id: 'aggregation',
      position: { x: 100, y: 400 },
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
      position: { x: 300, y: 400 },
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
  }, [stepStates]);

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
      </div>
    </Card>
  );
}