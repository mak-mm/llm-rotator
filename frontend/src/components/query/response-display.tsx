"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  Clock, 
  DollarSign,
  Zap,
  AlertTriangle,
  CheckCircle,
  Eye,
  Code
} from "lucide-react";
import type { AnalyzeResponse } from "@/lib/api";

interface ResponseDisplayProps {
  response: AnalyzeResponse;
}

export function ResponseDisplay({ response }: ResponseDisplayProps) {
  const formatTime = (seconds: number) => {
    if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
    return `${seconds.toFixed(2)}s`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Response Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Analysis Complete
            </span>
            <Badge variant="outline">ID: {response.request_id}</Badge>
          </CardTitle>
          <CardDescription>
            Query processed in {formatTime(response.total_time)}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Detection Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Detection Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className={`h-4 w-4 ${response.detection.has_pii ? 'text-red-500' : 'text-green-500'}`} />
                <span className="text-sm font-medium">PII Detection</span>
              </div>
              <Badge variant={response.detection.has_pii ? "destructive" : "default"}>
                {response.detection.has_pii ? 'PII Found' : 'No PII'}
              </Badge>
              {response.detection.pii_entities.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {response.detection.pii_entities.length} entities detected
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Code className={`h-4 w-4 ${response.detection.has_code ? 'text-blue-500' : 'text-gray-500'}`} />
                <span className="text-sm font-medium">Code Detection</span>
              </div>
              <Badge variant={response.detection.has_code ? "secondary" : "outline"}>
                {response.detection.has_code ? 
                  `Code (${response.detection.code_language || 'Unknown'})` : 
                  'No Code'
                }
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Sensitivity Score</span>
              </div>
              <div className="space-y-1">
                <Progress value={response.detection.sensitivity_score * 100} className="w-full" />
                <span className="text-xs text-muted-foreground">
                  {Math.round(response.detection.sensitivity_score * 100)}%
                </span>
              </div>
            </div>
          </div>

          {response.detection.entities.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Named Entities</h4>
              <div className="flex flex-wrap gap-1">
                {response.detection.entities.map((entity, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {entity.text} ({entity.label})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            Privacy Protection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Privacy Score</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(response.privacy_score * 100)}%
              </span>
            </div>
            <Progress value={response.privacy_score * 100} className="w-full" />
            <p className="text-xs text-muted-foreground">
              {response.privacy_score > 0.8 ? 'Excellent privacy protection' :
               response.privacy_score > 0.6 ? 'Good privacy protection' :
               'Basic privacy protection'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Response Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Processing Result
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{response.aggregated_response}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}