"use client";

import { useEffect, useState } from 'react';
import { useSSESubscription } from '@/contexts/sse-context';
import { useQuery } from '@/contexts/query-context';
import { queryService } from '@/lib/api';
import { toast } from 'sonner';

/**
 * QuerySSEService - Centralized SSE subscription service
 * 
 * This component handles all SSE subscriptions and global state updates
 * that were previously scattered in the QueryInterface component.
 * 
 * Best practice: Keep data/service logic separate from UI components.
 */
export function QuerySSEService() {
  const [isPollingResult, setIsPollingResult] = useState(false);
  
  const { 
    requestId,
    setQueryResult, 
    setIsProcessing,
    updateProcessingStep,
    updateRealTimeData
  } = useQuery();

  // Function to fetch final result when processing completes
  const fetchFinalResult = async () => {
    if (!requestId) return;
    
    try {
      const result = await queryService.getResult(requestId);
      console.log('✅ Got final result:', result);
      
      // Update state with the final result
      setQueryResult(result);
      setIsProcessing(false);
      setIsPollingResult(false);
      
      toast.success('Query processing completed');
    } catch (error) {
      console.error('Failed to fetch final result:', error);
      setIsProcessing(false);
      setIsPollingResult(false);
      
      toast.error('Failed to get query result');
    }
  };

  // Centralized SSE subscription for all query-related events
  useSSESubscription(['step_progress', 'investor_kpis', 'complete'], (message) => {
    console.log('🔄 Global SSE Update:', JSON.stringify(message, null, 2));
    
    // Handle step progress updates
    if (message.type === 'step_progress' && message.data) {
      const { step, status, progress, message: stepMessage } = message.data;
      console.log(`📊 Step Update: ${step} -> ${status} (${progress}%) - ${stepMessage || 'no message'}`);
      updateProcessingStep(step, status, progress, stepMessage);
      
      // If final response is completed, fetch the result
      if (step === 'final_response' && status === 'completed') {
        setIsPollingResult(true);
        fetchFinalResult();
      }
    }
    
    // Handle KPI updates from investor metrics
    if (message.type === 'investor_kpis' && message.data) {
      console.log('📊 KPI Update received:', message.data);
      updateRealTimeData({
        kpi_update: {
          privacy_score: message.data.privacy_score,
          cost_savings: message.data.cost_savings,
          system_efficiency: message.data.system_efficiency,
          processing_speed: message.data.processing_speed,
          throughput_rate: message.data.throughput_rate,
          roi_potential: message.data.roi_potential,
          timestamp: message.data.timestamp
        }
      });
    }
    
    // Also handle the complete event
    if (message.type === 'complete') {
      // Final response is ready, fetch the result
      setIsPollingResult(true);
      fetchFinalResult();
    }
  }, [updateProcessingStep, updateRealTimeData, requestId]);

  // This component renders nothing - it's just a service
  return null;
}