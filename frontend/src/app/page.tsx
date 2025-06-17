"use client";

import { QueryInterface } from "@/components/query/query-interface";
import { PrivacyDashboard } from "@/components/dashboard/privacy-dashboard";
import { ProviderStatus } from "@/components/providers/provider-status";
import { Header } from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThreeDFragmentation } from "@/components/visualization/3d-fragmentation";
import { QueryProvider, useQuery } from "@/contexts/query-context";
import { Building2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function HomeContent() {
  const { queryResult, isProcessing, setQueryResult, setIsProcessing } = useQuery();

  // Debug logging
  console.log('🏠 Home - queryResult:', queryResult);
  console.log('🏠 Home - isProcessing:', isProcessing);

  // Test button to manually set query result
  const testVisualization = async () => {
    console.log('🧪 Testing visualization with manual data...');
    setIsProcessing(true);
    
    // Simulate API call
    setTimeout(() => {
      const testResult = {
        request_id: "test-" + Date.now(),
        original_query: "🧪 TEST MODE: My name is Alice Johnson, email alice@test.com. Help me with investment advice.",
        privacy_score: 0.92,
        total_time: 1.8,
        cost_comparison: {
          fragmented_cost: 0.0008,
          single_provider_cost: 0.0035,
          savings_percentage: 77
        },
        fragments: [
          { id: "test-1", content: "Fragment 1: Privacy testing", provider: "openai" as const, anonymized: true, context_percentage: 0.33 },
          { id: "test-2", content: "Fragment 2: Query analysis", provider: "anthropic" as const, anonymized: false, context_percentage: 0.33 },
          { id: "test-3", content: "Fragment 3: Response generation", provider: "google" as const, anonymized: true, context_percentage: 0.34 }
        ],
        detection: {
          has_pii: true,
          pii_entities: [{ type: "PERSON", text: "TEST_USER", start: 0, end: 9 }],
          has_code: false,
          entities: [],
          sensitivity_score: 0.6
        },
        aggregated_response: "✅ Test successful! The visualization system is working correctly and displaying real-time query fragmentation data."
      };
      
      setQueryResult(testResult);
      setIsProcessing(false);
    }, 2000);
  };

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

        {/* Test Controls */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Visualization Test</h3>
              <p className="text-xs text-gray-600">Test the 3D visualization with sample data</p>
            </div>
            <Button onClick={testVisualization} variant="outline" size="sm">
              🧪 Test Sample Data
            </Button>
          </div>
        </div>

        {/* 3D Visualization with Real Data */}
        <div className="mb-8">
          <ThreeDFragmentation queryData={queryResult} isProcessing={isProcessing} />
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
