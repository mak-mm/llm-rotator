"use client";

import { useState } from 'react';
import { ProcessingFlow } from './ProcessingFlow';
import { StepDetailPanel } from './StepDetailPanel';
import { useQuery } from '@/contexts/query-context';

interface ProcessingFlowWithDetailsProps {
  requestId: string | null;
  isProcessing: boolean;
}

export function ProcessingFlowWithDetails({ requestId, isProcessing }: ProcessingFlowWithDetailsProps) {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  
  // State from ProcessingFlow component (real-time SSE data)
  const [stepStates, setStepStates] = useState<Record<string, 'pending' | 'processing' | 'completed'>>({
    planning: 'pending',
    pii_detection: 'pending',
    fragmentation: 'pending',
    enhancement: 'pending',
    distribution: 'pending',
    aggregation: 'pending',
    final_response: 'pending',
  });
  const [stepDetails, setStepDetails] = useState<Record<string, any>>({});
  const [fragments, setFragments] = useState<any[]>([]);

  // Callback to receive step state updates from ProcessingFlow
  const handleStepStatesChange = (newStepStates: Record<string, 'pending' | 'processing' | 'completed'>, newStepDetails: Record<string, any>, newFragments: any[]) => {
    setStepStates(newStepStates);
    setStepDetails(newStepDetails);
    setFragments(newFragments);
  };

  return (
    <div className="space-y-6">
      <ProcessingFlow 
        requestId={requestId}
        isProcessing={isProcessing}
        onNodeSelect={setSelectedStep}
        onStepStatesChange={handleStepStatesChange}
      />
      <StepDetailPanel
        selectedStep={selectedStep}
        stepStates={stepStates}
        stepDetails={stepDetails}
        fragments={fragments}
      />
    </div>
  );
}