"use client";

import { QueryInterface } from "@/components/query/query-interface";
import { PrivacyDashboard } from "@/components/dashboard/privacy-dashboard";
import { ProviderStatus } from "@/components/providers/provider-status";
import { Header } from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProcessingFlowWithDetails } from "@/components/flow/ProcessingFlowWithDetails";
import { QueryProvider, useQuery } from "@/contexts/query-context";
import { useEffect, useState } from "react";

function HomeContent() {
  const [isMounted, setIsMounted] = useState(false);
  const { 
    queryResult, 
    isProcessing, 
    setQueryResult, 
    setIsProcessing, 
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

        {/* Main Content */}
        <Tabs defaultValue="query" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="query">Query Interface</TabsTrigger>
            <TabsTrigger value="dashboard">Privacy Dashboard</TabsTrigger>
            <TabsTrigger value="providers">Provider Status</TabsTrigger>
          </TabsList>

          <TabsContent value="query" className="space-y-6">
            <QueryInterface />
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            <PrivacyDashboard />
          </TabsContent>

          <TabsContent value="providers" className="space-y-6">
            <ProviderStatus />
          </TabsContent>
        </Tabs>
      </main>
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
