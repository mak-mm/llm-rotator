"use client";

import { Header } from "@/components/layout/header";
import { ProcessingFlowWithDetails } from "@/components/flow/ProcessingFlowWithDetails";
import { ProcessingOverlay } from "@/components/processing/ProcessingOverlay";
import { QueryProvider, useQuery } from "@/contexts/query-context";
import { useEffect, useState } from "react";

function HomeContent() {
  const [isMounted, setIsMounted] = useState(false);
  const { 
    queryResult, 
    isProcessing, 
    setQueryResult, 
    setIsProcessing, 
    showProcessingOverlay,
    setShowProcessingOverlay,
    investorMetrics, 
    realTimeData,
    requestId 
  } = useQuery();

  useEffect(() => {
    setIsMounted(true);
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


  const handleProcessingComplete = () => {
    setShowProcessingOverlay(false);
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

      {/* Full-Screen Processing Overlay */}
      <ProcessingOverlay
        isVisible={showProcessingOverlay}
        requestId={requestId}
        onComplete={handleProcessingComplete}
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
