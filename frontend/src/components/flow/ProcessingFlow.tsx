"use client";

import { useEffect, useMemo, useState } from 'react';
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

interface ProcessingFlowProps {
  requestId: string | null;
  isProcessing: boolean;
}

interface StepState {
  [key: string]: 'pending' | 'processing' | 'completed';
}

export function ProcessingFlow({ requestId, isProcessing }: ProcessingFlowProps) {
  const { processingSteps } = useQuery();
  
  const [stepStates, setStepStates] = useState<StepState>({
    planning: 'pending',
    pii_detection: 'pending',
    fragmentation: 'pending',
    distribution: 'pending',
    aggregation: 'pending',
    final_response: 'pending',
  });

  // SSE connection disabled to prevent conflicts with main query interface
  // const sseUrl = requestId && isProcessing ? `/api/v1/stream/${requestId}` : null;
  
  // Get step states from the shared context instead of SSE
  useEffect(() => {
    console.log('🎯 Processing steps from context:', processingSteps);
    
    // Convert context processing steps to local step states
    const newStepStates = { ...stepStates };
    Object.entries(processingSteps).forEach(([step, data]) => {
      if (data.status === 'completed') {
        newStepStates[step] = 'completed';
      } else if (data.status === 'processing') {
        newStepStates[step] = 'processing';
      }
    });
    
    setStepStates(newStepStates);
  }, [processingSteps]);

  // Reset when processing starts
  useEffect(() => {
    if (isProcessing && requestId) {
      console.log('🔄 Resetting flow for new request:', requestId);
      setStepStates({
        planning: 'processing',
        pii_detection: 'pending',
        fragmentation: 'pending',
        distribution: 'pending',
        aggregation: 'pending',
        final_response: 'pending',
      });
    }
  }, [isProcessing, requestId]);

  // Generate nodes based on current step states
  const nodes: Node[] = useMemo(() => [
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
      id: 'distribution',
      position: { x: 300, y: 250 },
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
  ], [stepStates]);

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
      id: 'fragmentation-distribution',
      source: 'fragmentation',
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

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Privacy-Preserving Processing Pipeline</h3>
      <div className="w-full h-[500px] border rounded-lg">
        <ReactFlow
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