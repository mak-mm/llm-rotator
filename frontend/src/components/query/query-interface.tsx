"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Send, 
  Shield, 
  Eye, 
  EyeOff, 
  Loader2,
  TrendingUp,
  Zap,
  Brain,
  ChevronRight 
} from "lucide-react";
import { toast } from "sonner";
import { useAnalyzeQuery, useQueryStatus } from "@/hooks/useQuery";
import { useQuery } from "@/contexts/query-context";
import { InvestorDashboard } from "@/components/visualization/investor-dashboard";
import { useSSE } from "@/hooks/useSSE";
import { queryService } from "@/lib/api";
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/api";

const PRIVACY_LEVELS = [
  { value: "low", label: "Low Privacy", color: "bg-green-500" },
  { value: "medium", label: "Medium Privacy", color: "bg-yellow-500" },
  { value: "high", label: "High Privacy", color: "bg-red-500" },
] as const;

const EXAMPLE_QUERIES = [
  {
    text: `I'm Sarah Johnson, CTO at TechVentures Inc (sarah.johnson@techventures.com, phone: +1-555-123-4567). We're evaluating your platform for our healthcare division. Our head of security, Dr. Michael Chen (m.chen@techventures.com), needs to understand:

1. How your system handles HIPAA-compliant patient data when processing queries containing PHI
2. Integration capabilities with our existing Azure AD SSO and MFA infrastructure
3. Detailed audit logging for SOC 2 Type II compliance requirements
4. Performance benchmarks for processing 10,000+ daily queries across our 3 data centers (US-East, EU-West, APAC)
5. Pricing model for enterprise deployment with 500+ concurrent users

Our budget is $250,000 annually and we need deployment by Q2 2024. Please provide a comprehensive technical architecture document.`,
    privacy: "high" as const,
    description: "Enterprise evaluation with extensive PII"
  },
  {
    text: `My patient, Robert Williams (DOB: 03/15/1978, SSN: 987-65-4321, MRN: PAT-2024-001), presented with severe chest pain and shortness of breath. His medical history includes:
- Type 2 Diabetes (diagnosed 2018, HbA1c: 8.2%)
- Hypertension (BP: 165/95, on Lisinopril 20mg)
- Previous MI in 2021 (LAD stent placement)
- Current medications: Metformin 1000mg BID, Atorvastatin 40mg, Aspirin 81mg

ECG shows ST elevation in leads V2-V4. Troponin I: 0.8 ng/mL (elevated). 

Please analyze this case and provide:
1. Differential diagnosis with probability rankings
2. Immediate treatment recommendations following ACS protocols
3. Risk stratification using TIMI score
4. Recommended cardiac catheterization timing
5. Post-intervention medication adjustments

This is for our teaching hospital's case review. Contact: Dr. Emily Rodriguez (emily.rodriguez@centralhospital.org)`,
    privacy: "high" as const,
    description: "Medical case with PHI and clinical data"
  },
  {
    text: `Review our company's authentication system for security vulnerabilities. I'm Alex Kumar, Senior Security Engineer at FinanceCore (alex.kumar@financecore.io, employee ID: EMP-45782). Here's our current implementation:

\`\`\`python
import hashlib
import jwt
from datetime import datetime, timedelta

class AuthenticationService:
    SECRET_KEY = "prod_secret_key_2024_Q1"  # TODO: Move to env vars
    API_KEY = "sk-prod-4f8b9c2d1e3a5b7c9d0e2f4a"
    
    def __init__(self):
        self.db_connection = "postgresql://admin:Password123!@prod-db.financecore.internal:5432/users"
        self.redis_url = "redis://:RedisPass2024@cache.financecore.internal:6379"
    
    def authenticate_user(self, username, password):
        # MD5 hashing for legacy compatibility
        hashed_pwd = hashlib.md5(password.encode()).hexdigest()
        
        query = f"SELECT * FROM users WHERE username='{username}' AND password='{hashed_pwd}'"
        user = self.db.execute(query)  # SQL injection vulnerability
        
        if user:
            token = jwt.encode({
                'user_id': user['id'],
                'ssn': user['ssn'],  # Storing SSN in JWT
                'credit_card': user['cc_number'],
                'exp': datetime.utcnow() + timedelta(days=365)  # 1 year expiry
            }, self.SECRET_KEY, algorithm='HS256')
            
            return token
        return None
    
    def verify_2fa(self, user_id, code):
        # 2FA bypass for admin
        if user_id == 1:
            return True
        
        stored_secret = "JBSWY3DPEHPK3PXP"  # Hardcoded TOTP secret
        return self.validate_totp(code, stored_secret)
\`\`\`

Our AWS credentials for deployment:
- Access Key: AKIAIOSFODNN7EXAMPLE
- Secret: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
- S3 Bucket: financecore-prod-data
- RDS Endpoint: financecore.c9akciq32.us-east-1.rds.amazonaws.com

Please identify all security vulnerabilities and provide remediation steps.`,
    privacy: "high" as const,
    description: "Code review with credentials and secrets"
  }
];

export function QueryInterface() {
  const [query, setQuery] = useState("");
  const [privacyLevel, setPrivacyLevel] = useState<"low" | "medium" | "high">("medium");
  const [showPrivacyViz, setShowPrivacyViz] = useState(true);
  const [currentResponse, setCurrentResponse] = useState<AnalyzeResponse | null>(null);
  const [isPollingResult, setIsPollingResult] = useState(false);
  const [shouldConnectSSE, setShouldConnectSSE] = useState(false);

  // Context for sharing query state and investor metrics
  const { 
    setCurrentQuery, 
    setQueryResult, 
    setIsProcessing, 
    investorMetrics, 
    realTimeData, 
    resetInvestorData,
    requestId,
    setRequestId,
    updateProcessingStep 
  } = useQuery();

  // Hooks for API calls
  const analyzeMutation = useAnalyzeQuery();
  const statusQuery = useQueryStatus(requestId, !!requestId);

  // SSE connection for real-time updates - only connect after a delay to ensure backend is ready
  const sseUrl = requestId && shouldConnectSSE ? `/api/v1/stream/${requestId}` : null;
  const { isConnected } = useSSE(sseUrl, {
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('🔄 SSE Update:', data);
        
        // Handle step progress updates
        if (data.type === 'step_progress' && data.data) {
          const { step, status, progress, message } = data.data;
          updateProcessingStep(step, status, progress, message);
          
          // If final response is completed, fetch the result
          if (step === 'final_response' && status === 'completed') {
            setIsPollingResult(true);
            fetchFinalResult();
          }
        }
        
        // Also handle the complete event
        if (data.type === 'complete') {
          // Final response is ready, fetch the result
          setIsPollingResult(true);
          fetchFinalResult();
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    },
    onError: (error) => {
      console.error('SSE Error:', error);
    },
    onOpen: () => {
      console.log('✅ SSE Connected for request:', requestId);
    }
  });

  // Function to fetch final result
  const fetchFinalResult = async () => {
    if (!requestId) return;
    
    try {
      const result = await queryService.getResult(requestId);
      console.log('✅ Got final result:', result);
      
      // Update state with the final result
      setCurrentResponse(result);
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

  const handleSubmit = async () => {
    if (!query.trim()) {
      toast.error("Please enter a query");
      return;
    }

    const request: AnalyzeRequest = {
      query: query.trim(),
      strategy: "hybrid", // Use hybrid strategy by default  
      use_orchestrator: true, // Enable orchestrator for complex queries
    };

    try {
      // Start processing without clearing results yet
      setCurrentQuery(query.trim());
      setIsProcessing(true);
      
      // Log for debugging
      console.log('🚀 Query submitted, keeping previous visualization until new one starts');

      const initialResponse = await analyzeMutation.mutateAsync(request);
      
      // Now that we have confirmation the query was accepted, reset state
      resetInvestorData();
      setShouldConnectSSE(false); // Reset SSE connection
      setRequestId(null); // Clear old request ID
      setQueryResult(null); // Clear only after we know new processing is starting
      
      // Store the request ID for SSE connection
      console.log('🚀 Got request ID:', initialResponse.request_id);
      setRequestId(initialResponse.request_id);
      
      // Delay SSE connection to ensure backend processing has started
      setTimeout(() => {
        console.log('🔄 Enabling SSE connection for:', initialResponse.request_id);
        setShouldConnectSSE(true);
      }, 1000); // 1 second delay
    } catch (error) {
      console.error('Query submission failed:', error);
      setIsProcessing(false);
      toast.error('Query processing failed');
    }
  };

  const handleExampleQuery = (example: typeof EXAMPLE_QUERIES[0]) => {
    setQuery(example.text);
    setPrivacyLevel(example.privacy);
    toast.info(`Loaded example: ${example.description}`);
  };

  const selectedPrivacyLevel = PRIVACY_LEVELS.find(level => level.value === privacyLevel);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Query Input Panel */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Query Interface
            </CardTitle>
            <CardDescription>
              Enter your query and select the appropriate privacy level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Privacy Level</label>
              <Select value={privacyLevel} onValueChange={setPrivacyLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIVACY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${level.color}`} />
                        {level.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPrivacyLevel && (
                <Badge variant="outline" className="w-fit">
                  <div className={`w-2 h-2 rounded-full ${selectedPrivacyLevel.color} mr-2`} />
                  {selectedPrivacyLevel.label}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Query</label>
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your query here..."
                className="min-h-[120px] resize-none"
                disabled={analyzeMutation.isPending}
              />
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{query.length} characters</span>
                <span>Max 4000 characters</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={analyzeMutation.isPending || !query.trim()}
                className="flex-1"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Query
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPrivacyViz(!showPrivacyViz)}
              >
                {showPrivacyViz ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>

            {(analyzeMutation.isPending || isPollingResult) && (
              <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">
                    {isPollingResult ? 'Fetching results...' : 'Processing query...'}
                  </span>
                  <span className="text-muted-foreground">
                    {isConnected ? '🟢 Real-time updates connected' : 'This may take up to 2 minutes'}
                  </span>
                </div>
                <Progress value={33} className="w-full" />
                <p className="text-xs text-muted-foreground">
                  🔄 Detecting PII → Fragmenting query → Sending to LLM providers → Aggregating responses
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Example Queries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Example Queries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {EXAMPLE_QUERIES.map((example, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={() => handleExampleQuery(example)}
                className="w-full justify-start text-left h-auto p-3"
                disabled={analyzeMutation.isPending}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {PRIVACY_LEVELS.find(l => l.value === example.privacy)?.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{example.description}</span>
                  </div>
                  <p className="text-sm truncate max-w-[300px]">{example.text}</p>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Response and Visualization Panel */}
      <div className="space-y-6">
        {currentResponse && (
          <Card>
            <CardHeader>
              <CardTitle>Query Response</CardTitle>
              <CardDescription>
                Privacy-preserving query processing results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {currentResponse.privacy_score.toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Privacy Score</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {currentResponse.fragments.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Fragments</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {currentResponse.total_time.toFixed(2)}s
                  </div>
                  <p className="text-sm text-muted-foreground">Processing Time</p>
                </div>
              </div>
              
              <div className="border-t pt-4 space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Final Aggregated Response:</h4>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm">{currentResponse.aggregated_response}</p>
                  </div>
                </div>
                
                {/* Show response aggregation process */}
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <div className="h-px w-12 bg-border" />
                    <span>Response Aggregation Process</span>
                    <div className="h-px w-12 bg-border" />
                  </div>
                  
                  {/* Aggregation Flow Visualization */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 rounded-lg">
                    <div className="flex items-center justify-center gap-2 text-xs flex-wrap">
                      {/* Show each fragment */}
                      {currentResponse.fragments.map((fragment, idx) => {
                        const providerColors = {
                          openai: "bg-green-100 dark:bg-green-900/20 border-green-300",
                          anthropic: "bg-blue-100 dark:bg-blue-900/20 border-blue-300",
                          google: "bg-amber-100 dark:bg-amber-900/20 border-amber-300"
                        };
                        
                        return (
                          <React.Fragment key={fragment.id}>
                            <div className="flex flex-col items-center">
                              <div className={`w-20 h-20 rounded-lg flex items-center justify-center border ${providerColors[fragment.provider] || ""}`}>
                                <span className="font-medium text-center px-1">{fragment.provider}</span>
                              </div>
                              <span className="mt-1 text-muted-foreground">Fragment {idx + 1}</span>
                            </div>
                            
                            {idx < currentResponse.fragments.length - 1 && (
                              <div className="flex items-center gap-1">
                                <div className="h-px w-4 bg-border" />
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                      
                      {currentResponse.fragments.length > 0 && (
                        <>
                          <div className="flex items-center gap-1">
                            <div className="h-px w-8 bg-border" />
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          
                          <div className="flex flex-col items-center">
                            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary">
                              <div className="text-center">
                                <Brain className="h-6 w-6 mx-auto mb-1" />
                                <span className="font-medium text-xs">AI Aggregator</span>
                              </div>
                            </div>
                            <span className="mt-1 text-muted-foreground">Weighted Merge</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <div className="h-px w-8 bg-border" />
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          
                          <div className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center border border-purple-300">
                              <span className="font-medium">Final</span>
                            </div>
                            <span className="mt-1 text-muted-foreground">Response</span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-3">
                      {currentResponse.fragments.length === 0 
                        ? "Query sent directly to a single provider without fragmentation"
                        : `${currentResponse.fragments.length} fragment${currentResponse.fragments.length > 1 ? 's' : ''} processed in parallel, then intelligently merged`
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Detailed Fragment Analysis */}
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold">Fragment Distribution & Analysis:</h4>
                
                {/* Detection Summary */}
                <div className="space-y-3">
                  {/* PII Detection */}
                  {currentResponse.detection.has_pii && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        PII Detected & Anonymized:
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {currentResponse.detection.pii_entities.map((entity, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {entity.type}: "{entity.text}" → {entity.type}_{idx + 1}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Code Detection */}
                  {currentResponse.detection.has_code && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Code Detected:
                      </h5>
                      <Badge variant="secondary" className="text-xs">
                        Language: {currentResponse.detection.code_language || "Unknown"}
                      </Badge>
                    </div>
                  )}
                </div>
                
                {/* Fragment Details */}
                <div className="space-y-3">
                  {currentResponse.fragments.map((fragment, index) => {
                    const providerColors = {
                      openai: "border-green-500 bg-green-50 dark:bg-green-950/20",
                      anthropic: "border-blue-500 bg-blue-50 dark:bg-blue-950/20",
                      google: "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                    };
                    
                    return (
                      <div 
                        key={fragment.id} 
                        className={`p-4 rounded-lg border-2 ${providerColors[fragment.provider] || "border-gray-300"}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h5 className="font-medium">Fragment {index + 1}</h5>
                            <p className="text-xs text-muted-foreground">ID: {fragment.id}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{fragment.provider}</Badge>
                            {fragment.anonymized && (
                              <Badge variant="secondary" className="text-xs">
                                <Eye className="h-3 w-3 mr-1" />
                                Anonymized
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {Math.round(fragment.context_percentage * 100)}% context
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded border">
                          <p className="text-sm font-mono whitespace-pre-wrap">{fragment.content}</p>
                        </div>
                        
                        {/* Fragment Response */}
                        {(() => {
                          const fragmentResponse = currentResponse.fragment_responses?.find(
                            fr => fr.fragment_id === fragment.id
                          );
                          
                          if (fragmentResponse) {
                            return (
                              <div className="mt-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-medium text-muted-foreground">Provider Response:</p>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {fragmentResponse.processing_time.toFixed(2)}s
                                    </Badge>
                                    {fragmentResponse.tokens_used && (
                                      <Badge variant="outline" className="text-xs">
                                        {fragmentResponse.tokens_used} tokens
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                                  <p className="text-sm whitespace-pre-wrap">{fragmentResponse.response}</p>
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-dashed">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Provider Response:</p>
                              <p className="text-sm italic text-muted-foreground">
                                Processing fragment with {fragment.provider.toUpperCase()}...
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
                
                {/* Cost Breakdown */}
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Cost Analysis:
                  </h5>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Fragmented:</span>
                      <p className="font-mono">${currentResponse.cost_comparison.fragmented_cost.toFixed(4)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Single Provider:</span>
                      <p className="font-mono">${currentResponse.cost_comparison.single_provider_cost.toFixed(4)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Saved:</span>
                      <p className="font-mono text-green-600">{currentResponse.cost_comparison.savings_percentage}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!currentResponse && !analyzeMutation.isPending && (
          <Card className="h-64 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                Submit a query to see results and privacy visualization
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}