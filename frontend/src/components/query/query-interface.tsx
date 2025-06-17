"use client";

import { useState, useEffect } from "react";
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
  Loader2 
} from "lucide-react";
import { toast } from "sonner";
import { useAnalyzeQuery, useQueryStatus } from "@/hooks/useQuery";
import { useWebSocketSubscription } from "@/hooks/useWebSocket";
import { useQuery } from "@/contexts/query-context";
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
  const [requestId, setRequestId] = useState<string>();
  const [currentResponse, setCurrentResponse] = useState<AnalyzeResponse | null>(null);

  // Context for sharing query state
  const { setCurrentQuery, setQueryResult, setIsProcessing } = useQuery();

  // Hooks for API calls
  const analyzeMutation = useAnalyzeQuery();
  const statusQuery = useQueryStatus(requestId, !!requestId);

  // Subscribe to real-time query progress updates
  useWebSocketSubscription('query_progress', (data) => {
    if (data.request_id === requestId) {
      console.log('🔄 Real-time query progress update:', data);
      toast.info(`Query progress: ${data.status}`, {
        duration: 2000,
      });
    }
  });

  // Handle successful analysis
  useEffect(() => {
    if (statusQuery.data?.status === 'completed') {
      // In a real implementation, we'd get the full response from the status
      // For now, we'll use the analysis response directly
      toast.success('Query processing completed');
    } else if (statusQuery.data?.status === 'failed') {
      toast.error('Query processing failed');
    }
  }, [statusQuery.data]);

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
      // Update context to show processing state
      setCurrentQuery(query.trim());
      setIsProcessing(true);
      setQueryResult(null);

      const result = await analyzeMutation.mutateAsync(request);
      
      // Update context with results
      console.log('🔄 Query Interface - Setting query result:', result);
      console.log('🔄 Query Interface - Context setQueryResult function:', setQueryResult);
      setCurrentResponse(result);
      setRequestId(result.request_id);
      setQueryResult(result);
      setIsProcessing(false);
      
      // Additional verification
      console.log('🔄 Query Interface - Result set in context, should trigger visualization update');
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

            {analyzeMutation.isPending && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing query...</span>
                  <span>Analyzing privacy requirements</span>
                </div>
                <Progress value={33} className="w-full" />
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
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Aggregated Response:</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm">{currentResponse.aggregated_response}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Fragment Distribution:</h4>
                <div className="space-y-2">
                  {currentResponse.fragments.map((fragment, index) => (
                    <div key={fragment.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">Fragment {index + 1}</span>
                      <Badge variant="outline">{fragment.provider}</Badge>
                    </div>
                  ))}
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