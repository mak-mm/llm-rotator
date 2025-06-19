"use client";

import { QueryInterface } from "@/components/query/query-interface";
import { PrivacyDashboard } from "@/components/dashboard/privacy-dashboard";
import { ProviderStatus } from "@/components/providers/provider-status";
import { Header } from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProcessingFlow } from "@/components/flow/ProcessingFlow";
import { InvestorDashboardClean } from "@/components/visualization/investor-dashboard-clean";
import { QueryProvider, useQuery } from "@/contexts/query-context";
import { Building2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">
                Privacy-Preserving LLM Model Rotator
              </h1>
              <p className="text-xl text-muted-foreground">
                Secure multi-provider query fragmentation with real-time privacy visualization
              </p>
            </div>
            <Link href="/investor">
              <Button variant="outline" className="gap-2">
                <Building2 className="h-4 w-4" />
                Investor Hub
              </Button>
            </Link>
          </div>
        </div>


        {/* Processing Flow Visualization */}
        <div className="mb-8">
          <ProcessingFlow 
            requestId={requestId}
            isProcessing={isProcessing}
          />
        </div>

        {/* Investor Dashboard */}
        <div className="mb-8">
          <InvestorDashboardClean 
            realTimeData={realTimeData} 
            investorMetrics={investorMetrics}
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
