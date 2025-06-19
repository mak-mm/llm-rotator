"use client";

import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  NodeTypes,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Import custom nodes
import { QueryNode } from './nodes/QueryNode';
import { DetectionNode } from './nodes/DetectionNode';
import { FragmentationNode } from './nodes/FragmentationNode';
import { ProviderNode } from './nodes/ProviderNode';
import { AggregationNode } from './nodes/AggregationNode';

// Import hooks and types
import { useQuery } from '@/contexts/query-context';
import { useSSE } from '@/hooks/useSSE';
import type { AnalyzeResponse } from '@/lib/api';

// Define custom node types
const nodeTypes: NodeTypes = {
  queryNode: QueryNode,
  detectionNode: DetectionNode,
  fragmentationNode: FragmentationNode,
  providerNode: ProviderNode,
  aggregationNode: AggregationNode,
};

interface StepProgress {
  [key: string]: number; // 0-100
}

interface StepCompletionStatus {
  [key: string]: boolean;
}

interface StepMessages {
  [key: string]: string;
}

export function QueryFragmentationFlow() {
  const { queryResult, isProcessing, currentQuery, requestId, processingSteps } = useQuery();
  const queryData = queryResult as AnalyzeResponse | null;

  // Convert processingSteps from context to local format using useMemo to prevent infinite loops
  const { stepProgress, stepCompletionStatus, stepMessages } = useMemo(() => {
    const progress: StepProgress = {};
    const completion: StepCompletionStatus = {};
    const messages: StepMessages = {};
    
    Object.entries(processingSteps).forEach(([step, data]) => {
      completion[step] = data.status === 'completed';
      progress[step] = data.progress;
      messages[step] = data.message || '';
    });
    
    return {
      stepProgress: progress,
      stepCompletionStatus: completion,
      stepMessages: messages
    };
  }, [processingSteps]);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // SSE connection disabled in this component to prevent conflicts
  const sseUrl = null; // requestId && requestId !== 'null' ? `/api/v1/stream/${requestId}` : null;
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 React Flow Debug:', {
      hasQueryData: !!queryData,
      requestId: requestId,
      sseUrl,
      isProcessing,
      currentQuery: !!currentQuery,
      processingSteps,
      stepProgress,
      stepCompletionStatus,
      hasDetection: !!queryData?.detection,
      hasFragments: !!queryData?.fragments,
      hasResponses: !!queryData?.fragment_responses,
      hasAggregated: !!queryData?.aggregated_response,
      stepCompletionStatus,
      stepProgress
    });
  }, [queryData, requestId, sseUrl, isProcessing, currentQuery, processingSteps]);
  
  // Disabled to prevent duplicate SSE connections
  /*
  useSSE(sseUrl, {
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'step_progress') {
          const stepData = data.data;
          
          // Update step progress
          if (stepData.status === 'processing') {
            setStepProgress(prev => ({
              ...prev,
              [stepData.step]: stepData.progress || 0
            }));
            setStepMessages(prev => ({
              ...prev,
              [stepData.step]: stepData.message || ""
            }));
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
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    },
    onOpen: () => {
      // Reset progress when starting new stream
      setStepCompletionStatus({});
      setStepProgress({});
      setStepMessages({});
    }
  });
  */

  // Generate the flow layout
  const generateFlowLayout = useCallback(() => {
    if (!currentQuery && !queryData) {
      // Show empty state with placeholder nodes
      return {
        nodes: [
          {
            id: 'placeholder',
            type: 'queryNode',
            position: { x: 50, y: 200 },
            data: {
              label: 'Ready for Query',
              query: 'Submit a query to see the privacy-preserving fragmentation process...',
              status: 'pending' as const,
              progress: 0,
              charCount: 0
            }
          }
        ],
        edges: []
      };
    }

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Base layout positions
    const startX = 50;
    const startY = 200;
    const nodeSpacing = 350;
    const providerSpacing = 180;

    // 1. Query Node
    // If we have queryData with original_query, the query was received
    const queryReceived = queryData?.original_query !== undefined || stepCompletionStatus['query_received'];
    newNodes.push({
      id: 'query',
      type: 'queryNode',
      position: { x: startX, y: startY },
      data: {
        label: 'Original Query',
        query: currentQuery || queryData?.original_query || '',
        status: queryReceived ? 'completed' : (isProcessing ? 'processing' : 'pending'),
        progress: queryReceived ? 100 : (stepProgress['query_received'] || 0),
        charCount: currentQuery?.length || queryData?.original_query?.length
      }
    });

    // 2. Detection Node
    // If we have detection data, it means detection is completed
    const detectionCompleted = queryData?.detection !== undefined || stepCompletionStatus['pii_detection'];
    newNodes.push({
      id: 'detection',
      type: 'detectionNode',
      position: { x: startX + nodeSpacing, y: startY },
      data: {
        label: 'PII Detection',
        status: detectionCompleted ? 'completed' : (processingSteps['pii_detection']?.status === 'processing' ? 'processing' : (processingSteps['pii_detection']?.status === 'completed' ? 'completed' : 'pending')),
        progress: detectionCompleted ? 100 : (stepProgress['pii_detection'] || 0),
        piiEntities: queryData?.detection?.pii_entities?.length || 0,
        hasCode: queryData?.detection?.has_code,
        sensitivityScore: queryData?.detection?.sensitivity_score,
        message: stepMessages['pii_detection']
      }
    });

    // 3. Fragmentation Node
    // If we have fragments, it means fragmentation is completed
    const fragmentationCompleted = (queryData?.fragments && queryData.fragments.length > 0) || stepCompletionStatus['fragmentation'];
    newNodes.push({
      id: 'fragmentation',
      type: 'fragmentationNode',
      position: { x: startX + nodeSpacing * 2, y: startY },
      data: {
        label: 'Fragmentation',
        status: fragmentationCompleted ? 'completed' : (processingSteps['fragmentation']?.status === 'processing' ? 'processing' : (processingSteps['fragmentation']?.status === 'completed' ? 'completed' : 'pending')),
        progress: fragmentationCompleted ? 100 : (stepProgress['fragmentation'] || 0),
        fragmentsCount: queryData?.fragments?.length || 0,
        strategy: 'semantic_split',
        message: stepMessages['fragmentation']
      }
    });

    // Create edges between main pipeline
    newEdges.push({
      id: 'query-detection',
      source: 'query',
      target: 'detection',
      type: 'smoothstep',
      animated: stepProgress['pii_detection'] > 0 && stepProgress['pii_detection'] < 100 && !detectionCompleted,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2 }
    });

    newEdges.push({
      id: 'detection-fragmentation',
      source: 'detection',
      target: 'fragmentation',
      type: 'smoothstep',
      animated: stepProgress['fragmentation'] > 0 && stepProgress['fragmentation'] < 100 && !fragmentationCompleted,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2 }
    });

    // 4. Provider Nodes (if fragments exist)
    if (queryData?.fragments && queryData.fragments.length > 0) {
      const providersUsed = [...new Set(queryData.fragments.map(f => f.provider))];
      const providerYStart = startY - (providersUsed.length - 1) * providerSpacing / 2;

      providersUsed.forEach((provider, index) => {
        const fragmentsForProvider = queryData.fragments?.filter(f => f.provider === provider) || [];
        const providerId = `provider-${provider}`;
        
        // Check if this provider has a response
        const providerResponse = queryData.fragment_responses?.find(fr => fr.provider === provider);
        const providerCompleted = providerResponse !== undefined || stepCompletionStatus['distribution'];
        
        newNodes.push({
          id: providerId,
          type: 'providerNode',
          position: { x: startX + nodeSpacing * 3, y: providerYStart + index * providerSpacing },
          data: {
            label: provider.charAt(0).toUpperCase() + provider.slice(1),
            provider: provider as 'openai' | 'anthropic' | 'google',
            status: providerCompleted ? 'completed' : (stepProgress['distribution'] > 0 ? 'processing' : 'pending'),
            progress: providerCompleted ? 100 : (stepProgress['distribution'] || 0),
            fragmentId: fragmentsForProvider[0]?.id,
            response: providerResponse?.response,
            processingTime: providerResponse?.processing_time,
            tokens: providerResponse?.tokens_used,
            message: stepMessages['distribution']
          }
        });

        // Edge from fragmentation to provider
        newEdges.push({
          id: `fragmentation-${providerId}`,
          source: 'fragmentation',
          target: providerId,
          type: 'smoothstep',
          animated: stepProgress['distribution'] > 0 && stepProgress['distribution'] < 100,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { 
            strokeWidth: 2,
            stroke: provider === 'openai' ? '#10b981' : provider === 'anthropic' ? '#f97316' : '#3b82f6'
          }
        });
      });

      // 5. Aggregation Node
      // If we have an aggregated response, aggregation is completed
      const aggregationCompleted = queryData.aggregated_response !== undefined || stepCompletionStatus['aggregation'];
      newNodes.push({
        id: 'aggregation',
        type: 'aggregationNode',
        position: { x: startX + nodeSpacing * 4, y: startY },
        data: {
          label: 'Response Aggregation',
          status: aggregationCompleted ? 'completed' : (stepProgress['aggregation'] > 0 ? 'processing' : 'pending'),
          progress: aggregationCompleted ? 100 : (stepProgress['aggregation'] || 0),
          responsesCount: queryData.fragment_responses?.length || 0,
          finalResponse: queryData.aggregated_response,
          privacyScore: queryData.privacy_score,
          totalTime: queryData.total_time,
          message: stepMessages['aggregation']
        }
      });

      // Edges from providers to aggregation
      providersUsed.forEach((provider) => {
        const providerId = `provider-${provider}`;
        newEdges.push({
          id: `${providerId}-aggregation`,
          source: providerId,
          target: 'aggregation',
          type: 'smoothstep',
          animated: stepProgress['aggregation'] > 0 && stepProgress['aggregation'] < 100,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { 
            strokeWidth: 2,
            stroke: provider === 'openai' ? '#10b981' : provider === 'anthropic' ? '#f97316' : '#3b82f6'
          }
        });
      });
    }

    return { nodes: newNodes, edges: newEdges };
  }, [currentQuery, queryData, stepProgress, stepCompletionStatus, stepMessages, isProcessing]);

  // Update nodes and edges when data changes
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = generateFlowLayout();
    setNodes(newNodes);
    setEdges(newEdges);
  }, [generateFlowLayout, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const minimapNodeColor = useCallback((node: Node) => {
    switch (node.type) {
      case 'queryNode': return '#e2e8f0';
      case 'detectionNode': return '#fef3c7';
      case 'fragmentationNode': return '#dbeafe';
      case 'providerNode': 
        const provider = node.data?.provider;
        if (provider === 'openai') return '#d1fae5';
        if (provider === 'anthropic') return '#fed7aa';
        if (provider === 'google') return '#dbeafe';
        return '#f3f4f6';
      case 'aggregationNode': return '#dcfce7';
      default: return '#f3f4f6';
    }
  }, []);

  return (
    <div className="w-full h-[600px] border rounded-lg bg-gradient-to-br from-gray-50 to-gray-100">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.1,
          includeHiddenNodes: false,
        }}
        minZoom={0.3}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background variant="dots" gap={20} size={1} />
        <Controls position="top-left" />
        <MiniMap 
          position="bottom-right"
          nodeColor={minimapNodeColor}
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}