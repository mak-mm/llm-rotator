"use client";

import { Header } from "@/components/layout/header";
import { ProcessingFlowWithDetails } from "@/components/flow/ProcessingFlowWithDetails";
import { MinimalProcessingOverlay } from "@/components/processing/MinimalProcessingOverlay";
import { QueryResultModal } from "@/components/query/QueryResultModal";
import { QueryProvider, useQuery } from "@/contexts/query-context";
import { useSSESubscription } from "@/contexts/sse-context";
import { useEffect, useState } from "react";

function HomeContent() {
  const [isMounted, setIsMounted] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [finalResponse, setFinalResponse] = useState<string>('');
  const [queryMetrics, setQueryMetrics] = useState<{
    privacy_score?: number;
    response_quality?: number;
    total_time?: number;
    total_cost?: number;
    fragments_processed?: number;
    providers_used?: number;
  }>({});
  
  const { 
    queryResult, 
    isProcessing, 
    setQueryResult, 
    setIsProcessing, 
    showProcessingOverlay,
    setShowProcessingOverlay,
    currentQuery,
    investorMetrics, 
    realTimeData,
    requestId 
  } = useQuery();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Subscribe to completion events to get final metrics
  useSSESubscription(['complete'], (message) => {
    if (message.type === 'complete' && message.data) {
      // Update metrics when processing completes
      const data = message.data;
      setQueryMetrics({
        privacy_score: data.privacy_score,
        response_quality: data.response_quality,
        total_time: data.total_time,
        total_cost: data.total_cost,
        fragments_processed: data.fragments_processed || data.fragments?.length || 0,
        providers_used: data.providers_used || 0
      });
    }
  }, []);

  // Debug logging (only when mounted to avoid hydration issues)
  if (isMounted) {
    console.log('🏠 Home - queryResult:', queryResult);
    console.log('🏠 Home - isProcessing:', isProcessing);
  }

  // Don't render dynamic content until client-side mount
  if (!isMounted) {
    return <div>Loading...</div>;
  }


  const handleProcessingComplete = (response?: string) => {
    setShowProcessingOverlay(false);
    
    // If we have a response, show the result modal
    if (response) {
      setFinalResponse(response);
      
      // Collect metrics from the processing
      setQueryMetrics({
        privacy_score: queryResult?.privacy_score,
        response_quality: queryResult?.response_quality,
        total_time: queryResult?.total_time,
        total_cost: queryResult?.total_cost,
        fragments_processed: queryResult?.fragments?.length || 0,
        providers_used: queryResult?.fragments ? new Set(queryResult.fragments.map(f => f.provider)).size : 0
      });
      
      setShowResultModal(true);
    }
  };

  const handleNewQuery = () => {
    setShowResultModal(false);
    // The ProcessingFlowWithDetails component has a New Query button that will handle opening the modal
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header />
      
      <main className="container mx-auto px-4 py-8">


        {/* Processing Flow Visualization */}
        {/* Processing Flow with Step Details */}
        <div className="mb-8">
          <ProcessingFlowWithDetails 
            requestId={requestId}
            isProcessing={isProcessing}
          />
        </div>

      </main>

      {/* Minimal Processing Overlay */}
      <MinimalProcessingOverlay
        isVisible={showProcessingOverlay}
        requestId={requestId}
        onComplete={handleProcessingComplete}
      />
      
      {/* Query Result Modal */}
      <QueryResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        query={currentQuery}
        response={finalResponse}
        metrics={queryMetrics}
        onNewQuery={handleNewQuery}
      />
    </div>
  );
}

export default function Home() {
  return (
    <QueryProvider>
      <HomeContent />
    </QueryProvider>
  );
}
