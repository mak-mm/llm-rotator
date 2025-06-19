"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import type { AnalyzeResponse } from '@/lib/api';
import { useSSE } from '@/hooks/useSSE';

// Investor demo types matching backend models
interface InvestorMetrics {
  privacy_score?: number;
  cost_savings?: number;
  processing_time?: number;
  system_efficiency?: number;
  pii_entities_found?: number;
  savings_percentage?: number;
  throughput_rate?: number;
  provider_breakdown?: Array<{
    provider: string;
    tokens: number;
    cost: number;
    efficiency: number;
  }>;
  executive_summary?: {
    privacy_protection: string;
    cost_optimization: string;
    performance: string;
    scalability: string;
    compliance: string;
    competitive_advantage: string;
    market_opportunity: string;
    revenue_potential: string;
  };
  business_insights?: {
    key_differentiators: string[];
    investment_highlights: string[];
    market_validation: {
      target_customers: string;
      market_size: string;
      growth_rate: string;
      early_traction: string;
    };
  };
  routing_decisions?: Array<{
    fragment_id: string;
    provider_selected: string;
    reasoning: string;
    confidence: number;
  }>;
}

interface QueryContextType {
  currentQuery: string;
  queryResult: AnalyzeResponse | null;
  isProcessing: boolean;
  investorMetrics: InvestorMetrics;
  realTimeData: Record<string, any>;
  requestId: string | null;
  processingSteps: Record<string, { status: string; progress: number; message?: string }>;
  setCurrentQuery: (query: string) => void;
  setQueryResult: (result: AnalyzeResponse | null) => void;
  setIsProcessing: (processing: boolean) => void;
  updateInvestorMetrics: (metrics: Partial<InvestorMetrics>) => void;
  updateRealTimeData: (data: Record<string, any>) => void;
  resetInvestorData: () => void;
  setRequestId: (id: string | null) => void;
  updateProcessingStep: (step: string, status: string, progress: number, message?: string) => void;
  processingStartTime: Date | null;
}

const QueryContext = createContext<QueryContextType | undefined>(undefined);

export function QueryProvider({ children }: { children: ReactNode }) {
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [queryResult, setQueryResult] = useState<AnalyzeResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [investorMetrics, setInvestorMetrics] = useState<InvestorMetrics>({});
  const [realTimeData, setRealTimeData] = useState<Record<string, any>>({});
  const [requestId, setRequestId] = useState<string | null>(null);
  const [processingSteps, setProcessingSteps] = useState<Record<string, { status: string; progress: number; message?: string }>>({});
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);

  // Debug wrapper for setQueryResult
  const setQueryResultWithLog = (result: AnalyzeResponse | null) => {
    console.log('🔧 Context - Setting query result:', result);
    setQueryResult(result);
  };

  // Update investor metrics with partial data
  const updateInvestorMetrics = (metrics: Partial<InvestorMetrics>) => {
    console.log('📊 Context - Updating investor metrics:', metrics);
    setInvestorMetrics(prev => ({
      ...prev,
      ...metrics
    }));
  };

  // Update real-time data
  const updateRealTimeData = (data: Record<string, any>) => {
    console.log('⚡ Context - Updating real-time data:', data);
    setRealTimeData(prev => ({
      ...prev,
      ...data
    }));
  };

  // Update processing step status
  const updateProcessingStep = (step: string, status: string, progress: number, message?: string) => {
    console.log(`📊 Context - Updating processing step: ${step} -> ${status} (${progress}%) - ${message || 'no message'}`);
    setProcessingSteps(prev => ({
      ...prev,
      [step]: { status, progress, message }
    }));
  };

  // Set processing with start time
  const setIsProcessingWithTime = (processing: boolean) => {
    setIsProcessing(processing);
    if (processing) {
      setProcessingStartTime(new Date());
      setProcessingSteps({}); // Reset steps when starting new processing
    }
  };

  // Reset investor data for new queries
  const resetInvestorData = () => {
    console.log('🔄 Context - Resetting investor data');
    setInvestorMetrics({});
    setRealTimeData({});
    setRequestId(null);
    setProcessingSteps({});
    setProcessingStartTime(null);
  };

  return (
    <QueryContext.Provider
      value={{
        currentQuery,
        queryResult,
        isProcessing,
        investorMetrics,
        realTimeData,
        requestId,
        processingSteps,
        processingStartTime,
        setCurrentQuery,
        setQueryResult: setQueryResultWithLog,
        setIsProcessing: setIsProcessingWithTime,
        updateInvestorMetrics,
        updateRealTimeData,
        resetInvestorData,
        setRequestId,
        updateProcessingStep,
      }}
    >
      {children}
    </QueryContext.Provider>
  );
}

export function useQuery() {
  const context = useContext(QueryContext);
  if (context === undefined) {
    throw new Error('useQuery must be used within a QueryProvider');
  }
  return context;
}