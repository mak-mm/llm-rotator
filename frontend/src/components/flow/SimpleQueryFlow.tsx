"use client";

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { useQuery } from '@/contexts/query-context';

interface ProcessingStep {
  name: string;
  status: 'pending' | 'processing' | 'completed';
  message?: string;
}

interface SimpleQueryFlowProps {
  requestId: string | null;
  isProcessing: boolean;
}

export function SimpleQueryFlow({ requestId, isProcessing }: SimpleQueryFlowProps) {
  const { processingSteps } = useQuery();
  
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { name: 'Planning', status: 'pending' },
    { name: 'PII Detection', status: 'pending' },
    { name: 'Fragmentation', status: 'pending' },
    { name: 'Enhancement', status: 'pending' },
    { name: 'Distribution', status: 'pending' },
    { name: 'Aggregation', status: 'pending' },
    { name: 'Final Response', status: 'pending' },
  ]);

  // SSE connection disabled to prevent conflicts with main query interface
  // const sseUrl = requestId && isProcessing ? `/api/v1/stream/${requestId}` : null;
  
  // Get step updates from shared context instead of SSE
  useEffect(() => {
    console.log('📨 Processing steps from context:', processingSteps);
    
    // Map backend step names to our display names
    const stepMapping: Record<string, string> = {
      'planning': 'Planning',
      'pii_detection': 'PII Detection',
      'fragmentation': 'Fragmentation',
      'enhancement': 'Enhancement',
      'distribution': 'Distribution',
      'aggregation': 'Aggregation',
      'final_response': 'Final Response',
    };
    
    // Update steps based on context processing steps
    setSteps(prevSteps => 
      prevSteps.map(step => {
        // Find matching backend step
        const backendStep = Object.keys(stepMapping).find(
          key => stepMapping[key] === step.name
        );
        
        if (backendStep && processingSteps[backendStep]) {
          const { status } = processingSteps[backendStep];
          return {
            ...step,
            status: status === 'completed' ? 'completed' : 'processing'
          };
        }
        
        return step;
      })
    );
  }, [processingSteps]);

  // Reset steps when starting new processing
  useEffect(() => {
    if (isProcessing && requestId) {
      setSteps([
        { name: 'Planning', status: 'processing' },
        { name: 'PII Detection', status: 'pending' },
        { name: 'Fragmentation', status: 'pending' },
        { name: 'Enhancement', status: 'pending' },
        { name: 'Distribution', status: 'pending' },
        { name: 'Aggregation', status: 'pending' },
        { name: 'Final Response', status: 'pending' },
      ]);
    }
  }, [isProcessing, requestId]);

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Processing Pipeline</h3>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.name}
            className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900"
          >
            {getStepIcon(step.status)}
            <span className={`flex-1 ${
              step.status === 'completed' ? 'text-gray-700 dark:text-gray-300' :
              step.status === 'processing' ? 'text-blue-600 dark:text-blue-400 font-medium' :
              'text-gray-400'
            }`}>
              {step.name}
            </span>
            {step.status === 'processing' && (
              <Badge variant="outline" className="text-xs">
                Processing...
              </Badge>
            )}
            {step.status === 'completed' && (
              <Badge variant="secondary" className="text-xs">
                Complete
              </Badge>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}