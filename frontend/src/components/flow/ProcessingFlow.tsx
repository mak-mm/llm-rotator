"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  NodeChange,
  EdgeChange,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, Plus } from 'lucide-react';
import { useQuery } from '@/contexts/query-context';
import { useSSESubscription, useSSEContext } from '@/contexts/sse-context';
import { ProcessingFlowNode } from './ProcessingFlowNode';
import { NewChatModal } from '@/components/query/NewChatModal';

interface ProcessingFlowProps {
  requestId: string | null;
  isProcessing: boolean;
  onNodeSelect?: (nodeId: string | null) => void;
  onStepStatesChange?: (stepStates: Record<string, 'pending' | 'processing' | 'completed'>, stepDetails: Record<string, any>, fragments: any[]) => void;
}

interface StepState {
  [key: string]: 'pending' | 'processing' | 'completed' | 'skipped';
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

// Node types for React Flow - defined outside component to prevent re-creation
const nodeTypes: NodeTypes = {
  processingNode: ProcessingFlowNode,
} as const;

console.log('🔧 NodeTypes registered:', nodeTypes);
console.log('🔧 ProcessingFlowNode component:', ProcessingFlowNode);

interface StepDetails {
  [key: string]: any;
}

export function ProcessingFlow({ requestId, isProcessing, onNodeSelect, onStepStatesChange }: ProcessingFlowProps) {
  const { processingSteps, setIsProcessing } = useQuery();
  const { isConnected } = useSSEContext();
  
  // Debug nodeTypes
  console.log('🔍 NodeTypes defined:', nodeTypes);
  console.log('🔍 ProcessingFlowNode:', ProcessingFlowNode);
  
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
  const [selectedFragment, setSelectedFragment] = useState<string | null>(null);
  
  // Store detailed information for each step
  const [stepDetails, setStepDetails] = useState<StepDetails>({
    planning: {},
    pii_detection: {},
    fragmentation: {},
    enhancement: {},
    distribution: {},
    aggregation: {},
    final_response: {},
  });

  // Debug logging
  console.log('🎯 ProcessingFlow render - requestId:', requestId, 'isProcessing:', isProcessing, 'SSE connected:', isConnected);
  
  // Subscribe to step progress updates from global SSE connection
  useSSESubscription(['step_progress', 'complete', 'step_detail'], (message) => {
    console.log('🎯 Flow SSE Event:', JSON.stringify(message, null, 2));
    
    if (message.type === 'step_progress' && message.data) {
      const { step, status, message: stepMessage, details } = message.data;
      const mappedStep = stepMapping[step] || step;
      console.log(`🔄 Flow Step Update: ${step} (mapped to ${mappedStep}) -> ${status}`);
      console.log(`🔄 Step Message: "${stepMessage}"`);
      
      // Update step details if provided
      if (details) {
        setStepDetails(prev => ({
          ...prev,
          [mappedStep]: details
        }));
      }
      
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
    
    // Handle completion to get final metrics
    if (message.type === 'complete' && message.data) {
      console.log('🎯 Complete event with data:', message.data);
      console.log('🎯 Final response in completion:', message.data.final_response || message.data.aggregated_response);
      const { fragments: responseFragments, privacy_score, response_quality, total_cost, total_time } = message.data;
      
      // Processing completed - no toast needed as we have the overlay
      
      // Clear processing state to allow new queries
      setIsProcessing(false);
      console.log('🔄 Processing completed, clearing isProcessing state');
      
      // Mark appropriate steps as completed or skipped based on whether fragmentation occurred
      setStepStates(prev => {
        // Check if this was a simple query (no fragments)
        const wasSimpleQuery = !responseFragments || responseFragments.length === 0;
        
        const finalStates = {
          planning: 'completed' as const,
          pii_detection: 'completed' as const,
          fragmentation: wasSimpleQuery ? 'skipped' as const : 'completed' as const,
          enhancement: wasSimpleQuery ? 'skipped' as const : 'completed' as const,
          distribution: wasSimpleQuery ? 'skipped' as const : 'completed' as const,
          aggregation: wasSimpleQuery ? 'skipped' as const : 'completed' as const,
          final_response: 'completed' as const,
        };
        
        console.log('📊 Setting final step states:', finalStates);
        return finalStates;
      });
      
      // Update final response details
      if (privacy_score !== undefined || response_quality !== undefined) {
        setStepDetails(prev => ({
          ...prev,
          final_response: {
            privacy_score,
            response_quality,
            total_cost,
            total_time,
            final_response: message.data.final_response || message.data.aggregated_response
          }
        }));
      }
      
      if (responseFragments && Array.isArray(responseFragments)) {
        console.log('🎯 Response fragments:', responseFragments);
        setFragments(prev => {
          const updatedFragments = responseFragments.map((frag: any, idx: number) => {
            const existingFragment = prev[idx];
            return {
              id: frag.id || existingFragment?.id || `fragment-${idx + 1}`,
              provider: frag.provider || existingFragment?.provider || 'openai',
              status: 'completed' as const,
              content: frag.content || frag.original_content || `Fragment ${idx + 1}: ${frag.content || 'No content available'}`,
              processingTime: frag.processing_time
            };
          });
          console.log('🎯 Updated fragments with content:', updatedFragments);
          return updatedFragments;
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

  // Clean Apple-style node styling
  const getAppleNodeStyle = (step: string) => ({
    background: stepStates[step] === 'completed' 
      ? '#34d399' 
      : stepStates[step] === 'processing' 
      ? '#3b82f6' 
      : '#f1f5f9',
    color: stepStates[step] === 'pending' ? '#64748b' : 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '500',
    padding: '12px 16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
    cursor: step === 'distribution' && fragments.length > 0 ? 'pointer' : 'default'
  });

  // Helper function to create detailed node data
  const getNodeDetails = (step: string) => {
    const details = stepDetails[step] || {};
    
    switch (step) {
      case 'planning':
        return {
          title: 'Query Analysis',
          items: [
            { label: 'Complexity score', value: details.complexity_score ?? 'NaN', highlight: true },
            { label: 'Domains detected', value: details.domains ?? 'NaN' },
            { label: 'Estimated fragments', value: details.estimated_fragments ?? 'NaN' }
          ],
          subItems: details.decision ? [
            { text: `Decision: ${details.decision}`, type: 'info' as const }
          ] : []
        };
        
      case 'pii_detection':
        return {
          title: 'PII Found',
          items: [
            { label: 'Entities detected', value: details.entity_count ?? 'NaN', highlight: true },
            { label: 'Sensitivity score', value: details.sensitivity_score ? `${(details.sensitivity_score * 100).toFixed(0)}%` : 'NaN' },
            { label: 'Confidence', value: details.confidence ?? 'NaN' }
          ],
          subItems: details.entities ? details.entities.map((e: string) => ({
            text: e,
            type: 'warning' as const
          })) : []
        };
        
      case 'fragmentation':
        return {
          title: 'Fragmentation Strategy',
          items: [
            { label: 'Strategy', value: details.strategy ?? 'NaN' },
            { label: 'Fragments created', value: details.fragment_count ?? (fragments.length || 'NaN'), highlight: true },
            { label: 'Context isolation', value: details.isolation ?? 'NaN' }
          ],
          subItems: details.overlap_minimized ? [
            { text: 'Overlap minimized ✓', type: 'success' as const }
          ] : []
        };
        
      case 'enhancement':
        return {
          title: 'Fragment Optimization',
          items: [
            { label: 'Fragments enhanced', value: details.fragments_enhanced ?? 'NaN' },
            { label: 'Context quality', value: details.context_quality ?? 'NaN', highlight: true }
          ],
          subItems: details.context_additions ? details.context_additions.slice(0, 2).map((a: string) => ({
            text: a,
            type: 'info' as const
          })) : []
        };
        
      case 'distribution':
        return {
          title: 'Fragment Routing',
          items: [
            { label: 'Fragments sent', value: fragments.length || 'NaN', highlight: true },
            { label: 'Providers used', value: details.provider_count ?? 'NaN' },
            { label: 'Parallel processing', value: details.parallel_processing ?? 'NaN' }
          ],
          subItems: fragments.slice(0, 3).map((f, i) => ({
            text: `Fragment ${i + 1} → ${f.provider.toUpperCase()}`,
            type: 'info' as const
          }))
        };
        
      case 'aggregation':
        return {
          title: 'Intelligent Aggregation',
          items: [
            { label: 'Responses received', value: details.received ? `${details.received}/${fragments.length || '?'}` : 'NaN' },
            { label: 'Coherence score', value: details.coherence ?? 'NaN', highlight: true },
            { label: 'Aggregation method', value: details.method ?? 'NaN' }
          ],
          subItems: details.deanonymization_complete ? [
            { text: 'De-anonymization: Complete', type: 'success' as const }
          ] : []
        };
        
      case 'final_response':
        return {
          title: 'Performance Metrics',
          items: [
            { label: 'Privacy score', value: details.privacy_score ? `${(details.privacy_score * 100).toFixed(0)}%` : 'NaN', highlight: true },
            { label: 'Response quality', value: (details.response_quality && typeof details.response_quality === 'number') ? details.response_quality.toFixed(2) : 'NaN' },
            { label: 'Total latency', value: (details.total_time && typeof details.total_time === 'number') ? `${details.total_time.toFixed(1)}s` : 'NaN' },
            { label: 'Cost', value: (details.total_cost && typeof details.total_cost === 'number') ? `$${details.total_cost.toFixed(4)}` : 'NaN' }
          ]
        };
        
      default:
        return undefined;
    }
  };

  // Generate initial nodes based on current step states and fragments
  const initialNodes: Node[] = useMemo(() => {
    console.log('📊 Generating nodes with stepStates:', stepStates, 'fragments:', fragments, 'selectedNode:', selectedNode);
    console.log('🔧 Using custom node type: processingNode');
    console.log('🔍 Creating nodes with type:', 'processingNode');
    
    // Calculate horizontal positions for left-to-right layout
    const startX = 20;
    const nodeSpacing = 320;
    const centerY = 150;
    
    const baseNodes: Node[] = [
      {
        id: 'planning',
        type: 'processingNode',
        position: { x: startX, y: centerY },
        data: { 
          label: '🧠 Planning',
          status: stepStates.planning,
          details: getNodeDetails('planning')
        },
        draggable: true
      },
      {
        id: 'pii_detection',
        type: 'processingNode',
        position: { x: startX + nodeSpacing, y: centerY },
        data: { 
          label: '🔍 PII Detection',
          status: stepStates.pii_detection,
          details: getNodeDetails('pii_detection')
        },
        draggable: true
      },
      {
        id: 'fragmentation',
        type: 'processingNode',
        position: { x: startX + (2 * nodeSpacing), y: centerY },
        data: { 
          label: '✂️ Fragmentation',
          status: stepStates.fragmentation,
          details: getNodeDetails('fragmentation')
        },
        draggable: true
      },
      {
        id: 'enhancement',
        type: 'processingNode',
        position: { x: startX + (3 * nodeSpacing), y: centerY },
        data: { 
          label: '🎯 Enhancement',
          status: stepStates.enhancement,
          details: getNodeDetails('enhancement')
        },
        draggable: true
      },
      {
        id: 'distribution',
        type: 'processingNode',
        position: { x: startX + (4 * nodeSpacing), y: centerY },
        data: { 
          label: fragments.length > 0 ? `🚀 Distribution (${fragments.length})` : '🚀 Distribution',
          status: stepStates.distribution,
          details: getNodeDetails('distribution')
        },
        draggable: true
      },
      {
        id: 'aggregation',
        type: 'processingNode',
        position: { x: startX + (5 * nodeSpacing), y: centerY },
        data: { 
          label: '🔗 Aggregation',
          status: stepStates.aggregation,
          details: getNodeDetails('aggregation')
        },
        draggable: true
      },
      {
        id: 'final_response',
        type: 'processingNode',
        position: { x: startX + (6 * nodeSpacing), y: centerY },
        data: { 
          label: '✅ Final Response',
          status: stepStates.final_response,
          details: getNodeDetails('final_response')
        },
        draggable: true
      }
    ];
    
    return baseNodes;
  }, [stepStates, fragments, selectedNode, stepDetails]);

  const initialEdges: Edge[] = useMemo(() => [
    {
      id: 'planning-pii',
      source: 'planning',
      target: 'pii_detection',
      type: 'straight',
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: stepStates.pii_detection === 'processing',
      style: { strokeWidth: 2, stroke: '#64748b' }
    },
    {
      id: 'pii-fragmentation',
      source: 'pii_detection',
      target: 'fragmentation',
      type: 'straight',
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: stepStates.fragmentation === 'processing',
      style: { strokeWidth: 2, stroke: '#64748b' }
    },
    {
      id: 'fragmentation-enhancement',
      source: 'fragmentation',
      target: 'enhancement',
      type: 'straight',
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: stepStates.enhancement === 'processing',
      style: { strokeWidth: 2, stroke: '#64748b' }
    },
    {
      id: 'enhancement-distribution',
      source: 'enhancement',
      target: 'distribution',
      type: 'straight',
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: stepStates.distribution === 'processing',
      style: { strokeWidth: 2, stroke: '#64748b' }
    },
    {
      id: 'distribution-aggregation',
      source: 'distribution',
      target: 'aggregation',
      type: 'straight',
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: stepStates.aggregation === 'processing',
      style: { strokeWidth: 2, stroke: '#64748b' }
    },
    {
      id: 'aggregation-final',
      source: 'aggregation',
      target: 'final_response',
      type: 'straight',
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: stepStates.final_response === 'processing',
      style: { strokeWidth: 2, stroke: '#64748b' }
    }
  ], [stepStates]);

  // Use React Flow state hooks for draggable nodes
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when step states or details change
  useEffect(() => {
    console.log('📝 Updating nodes with initialNodes:', initialNodes);
    setNodes(initialNodes);
  }, [initialNodes]);

  // Update edges when step states change
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges]);

  // Notify parent of step state changes
  useEffect(() => {
    onStepStatesChange?.(stepStates, stepDetails, fragments);
  }, [stepStates, stepDetails, fragments, onStepStatesChange]);
  
  // Debug current nodes
  console.log('🎯 Current nodes in state:', nodes);

  // Reset nodes to default positions
  const resetLayout = useCallback(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Resizable container state
  const [containerHeight, setContainerHeight] = useState(200);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newHeight = e.clientY - containerRect.top;
      
      // Set min and max heights
      if (newHeight >= 200 && newHeight <= 1200) {
        setContainerHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Change cursor while resizing
      document.body.style.cursor = 'ns-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isResizing]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Privacy-Preserving Processing Pipeline</h3>
        <div className="flex items-center gap-3">
          <NewChatModal>
            <Button
              variant="default"
              size="sm"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              title="Start a new privacy-preserving chat"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </NewChatModal>
          <Button
            variant="outline"
            size="sm"
            onClick={resetLayout}
            className="flex items-center gap-2"
            title="Reset layout to default positions"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Layout
          </Button>
          <span className="text-sm text-gray-500">
            Height: {containerHeight}px
          </span>
        </div>
      </div>
      <div 
        ref={containerRef}
        className="relative w-full border rounded-lg bg-gray-50"
        style={{ height: `${containerHeight}px` }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          attributionPosition="bottom-left"
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          fitView
          fitViewOptions={{ padding: 0.05, maxZoom: 1, minZoom: 0.3 }}
          minZoom={0.3}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
          panOnScroll={true}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
          onNodeClick={(event, node) => {
            console.log('🎯 Node clicked:', node.id, 'Current selectedNode:', selectedNode, 'Fragments:', fragments.length);
            
            // Toggle node selection
            const newSelection = selectedNode === node.id ? null : node.id;
            setSelectedNode(newSelection);
            
            // Notify parent component of selection
            onNodeSelect?.(newSelection);
            
            // Handle distribution node click for fragment panel
            if (node.id === 'distribution' && fragments.length > 0) {
              setSelectedFragment(null); // Clear fragment selection
            }
          }}
          onPaneClick={() => {
            console.log('🎯 Pane clicked, clearing selections');
            setSelectedNode(null);
            setSelectedFragment(null);
            onNodeSelect?.(null);
          }}
        >
          <Background color="#f0f0f0" gap={16} />
          <Controls />
        </ReactFlow>
        
        {/* Resize handle */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize flex items-center justify-center transition-all group ${
            isResizing ? 'bg-blue-500/20' : 'hover:bg-gray-200'
          }`}
          onMouseDown={handleMouseDown}
          title="Drag to resize"
        >
          <div className={`flex gap-1 transition-opacity ${isResizing ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`}>
            <div className="w-8 h-0.5 bg-gray-400 rounded-full" />
            <div className="w-8 h-0.5 bg-gray-400 rounded-full" />
            <div className="w-8 h-0.5 bg-gray-400 rounded-full" />
          </div>
        </div>
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
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-400 rounded opacity-60"></div>
          <span>Skipped</span>
        </div>
        {fragments.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded animate-pulse"></div>
            <span>Click Distribution to view fragments</span>
          </div>
        )}
      </div>
      
      {/* Clean Fragment Panel */}
      {selectedNode === 'distribution' && fragments.length > 0 && (
        <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">
                Fragments ({fragments.length})
              </h4>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2">
              {fragments.map((fragment, index) => (
                <div
                  key={fragment.id}
                  onClick={() => setSelectedFragment(selectedFragment === fragment.id ? null : fragment.id)}
                  className="p-3 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium">Fragment {index + 1}</span>
                      <span className="text-xs text-gray-500">{fragment.provider.toUpperCase()}</span>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      fragment.status === 'completed' ? 'bg-green-400' : 'bg-blue-400'
                    }`}></div>
                  </div>
                  
                  {selectedFragment === fragment.id && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Content:</div>
                      <div className="text-sm text-gray-800 font-mono">
                        {fragment.content || 'Fragment content not available'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}