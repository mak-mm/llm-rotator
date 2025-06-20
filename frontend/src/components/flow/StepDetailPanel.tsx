"use client";

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Play, AlertCircle } from 'lucide-react';

interface StepDetailPanelProps {
  selectedStep: string | null;
  stepStates: Record<string, 'pending' | 'processing' | 'completed'>;
  stepDetails: Record<string, any>;
  fragments: any[];
}

export function StepDetailPanel({ selectedStep, stepStates, stepDetails, fragments }: StepDetailPanelProps) {
  if (!selectedStep) {
    return (
      <Card className="p-6 h-[400px] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">No Step Selected</h3>
          <p className="text-sm block">Click on a processing step in the flow diagram to view detailed information</p>
        </div>
      </Card>
    );
  }

  const status = stepStates[selectedStep];
  const details = stepDetails[selectedStep] || {};

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <Play className="h-5 w-5 text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'processing':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Processing</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getStepTitle = () => {
    const titles = {
      planning: '🧠 Query Planning & Analysis',
      pii_detection: '🔍 PII Detection & Classification',
      fragmentation: '✂️ Query Fragmentation Strategy',
      enhancement: '🎯 Fragment Optimization & Context',
      distribution: '🚀 Multi-Provider Distribution',
      aggregation: '🔗 Response Aggregation',
      final_response: '✅ Final Response Assembly'
    };
    return titles[selectedStep as keyof typeof titles] || selectedStep;
  };

  const getStepDescription = () => {
    const descriptions = {
      planning: 'Analyzes query complexity, determines optimal processing strategy, and estimates resource requirements for privacy-preserving execution.',
      pii_detection: 'Scans for 50+ types of personally identifiable information using Microsoft Presidio, classifying sensitivity levels and compliance requirements.',
      fragmentation: 'Creates privacy-preserving query fragments using semantic analysis and entity-based splitting to minimize context exposure.',
      enhancement: 'Optimizes fragment segmentation and adds appropriate context to each fragment to ensure coherent responses while maintaining query intent.',
      distribution: 'Routes fragments to optimal LLM providers based on cost, capabilities, and sensitivity requirements for parallel processing.',
      aggregation: 'Combines partial responses using weighted ensemble methods to ensure coherent, high-quality final output.',
      final_response: 'Assembles the complete response with privacy scoring, quality metrics, and performance analytics for delivery.'
    };
    return descriptions[selectedStep as keyof typeof descriptions] || 'Processing step in the privacy-preserving pipeline.';
  };

  const renderDetailContent = () => {
    // Show empty state ONLY for pending steps that haven't been started
    if (status === 'pending') {
      return (
        <div className="text-center text-gray-500 py-8">
          <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm block">Step is waiting to be processed</p>
          <p className="text-xs text-gray-400 mt-1 block">Details will appear when processing begins</p>
        </div>
      );
    }

    // Show skipped state for steps that were not needed
    if (status === 'skipped') {
      return (
        <div className="text-center text-gray-500 py-8">
          <div className="h-8 w-8 mx-auto mb-2 text-gray-300 flex items-center justify-center">
            <span className="text-2xl">⏭️</span>
          </div>
          <p className="text-sm block">Step was skipped</p>
          <p className="text-xs text-gray-400 mt-1 block">This step was not needed for your query</p>
        </div>
      );
    }

    // For processing or completed steps, show the detailed panels with real data or NaN/errors

    switch (selectedStep) {
      case 'planning':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Complexity Score</div>
                <div className="text-2xl font-bold text-blue-900">
                  {details.complexity_score ?? 'NaN'}
                </div>
                <div className="text-xs text-blue-500">Query analysis complexity</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">Domains Detected</div>
                <div className="text-2xl font-bold text-purple-900">
                  {details.domains ?? 'NaN'}
                </div>
                <div className="text-xs text-purple-500">Different content types</div>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600 font-medium mb-2">Strategy Decision</div>
              <div className="text-sm text-gray-800">
                {details.decision || 'ERROR: No strategy decision available'}
              </div>
            </div>
          </div>
        );

      case 'pii_detection':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="text-sm text-red-600 font-medium">Entities Found</div>
                <div className="text-2xl font-bold text-red-900">
                  {details.entity_count ?? 'NaN'}
                </div>
                <div className="text-xs text-red-500">PII entities detected</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-sm text-orange-600 font-medium">Sensitivity</div>
                <div className="text-2xl font-bold text-orange-900">
                  {details.sensitivity_score ?? 'NaN'}
                </div>
                <div className="text-xs text-orange-500">Risk classification</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Confidence</div>
                <div className="text-2xl font-bold text-green-900">
                  {details.confidence ?? 'NaN'}
                </div>
                <div className="text-xs text-green-500">Detection accuracy</div>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600 font-medium mb-2">Detected Entity Types</div>
              <div className="flex flex-wrap gap-2">
                {details.entities && details.entities.length > 0 ? (
                  details.entities.map((entity: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">{entity}</Badge>
                  ))
                ) : (
                  <span className="text-xs text-red-500">ERROR: No entity data available</span>
                )}
              </div>
            </div>
          </div>
        );

      case 'fragmentation':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Strategy</div>
                <div className="text-lg font-bold text-blue-900">
                  {details.strategy ?? 'NaN'}
                </div>
                <div className="text-xs text-blue-500">Fragmentation method</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">Fragments</div>
                <div className="text-2xl font-bold text-purple-900">
                  {details.fragment_count ?? fragments.length || 'NaN'}
                </div>
                <div className="text-xs text-purple-500">Total created</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Isolation</div>
                <div className="text-2xl font-bold text-green-900">
                  {details.isolation ?? 'NaN'}
                </div>
                <div className="text-xs text-green-500">Context separation</div>
              </div>
            </div>
            {details.overlap_minimized ? (
              <div className="bg-green-50 p-3 rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800 font-medium">Context overlap minimized</span>
              </div>
            ) : (
              <div className="bg-red-50 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800 font-medium">ERROR: Overlap minimization status unknown</span>
              </div>
            )}
          </div>
        );

      case 'enhancement':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-indigo-50 p-3 rounded-lg">
                <div className="text-sm text-indigo-600 font-medium">Fragments Enhanced</div>
                <div className="text-2xl font-bold text-indigo-900">
                  {details.fragments_enhanced ?? 'NaN'}
                </div>
                <div className="text-xs text-indigo-500">Optimized segments</div>
              </div>
              <div className="bg-teal-50 p-3 rounded-lg">
                <div className="text-sm text-teal-600 font-medium">Context Quality</div>
                <div className="text-2xl font-bold text-teal-900">
                  {details.context_quality ?? 'NaN'}
                </div>
                <div className="text-xs text-teal-500">Optimization score</div>
              </div>
            </div>
            {details.segmentation_optimized ? (
              <div className="bg-green-50 p-3 rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800 font-medium">Fragment segmentation optimized</span>
              </div>
            ) : (
              <div className="bg-red-50 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800 font-medium">ERROR: Segmentation optimization status unknown</span>
              </div>
            )}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600 font-medium mb-2">Context Enhancements Applied</div>
              <div className="space-y-1">
                {details.context_additions && details.context_additions.length > 0 ? (
                  details.context_additions.map((addition: string, idx: number) => (
                    <div key={idx} className="text-xs text-gray-700 bg-white px-2 py-1 rounded border">
                      {addition}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-red-500">ERROR: No context enhancement data available</div>
                )}
              </div>
            </div>
          </div>
        );

      case 'distribution':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Fragments Sent</div>
                <div className="text-2xl font-bold text-blue-900">
                  {details.fragments_sent ?? fragments.length || 'NaN'}
                </div>
                <div className="text-xs text-blue-500">Total distributed</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">Providers Used</div>
                <div className="text-2xl font-bold text-purple-900">
                  {details.provider_count ?? 'NaN'}
                </div>
                <div className="text-xs text-purple-500">LLM services</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Processing</div>
                <div className="text-lg font-bold text-green-900">
                  {details.parallel_processing ?? 'NaN'}
                </div>
                <div className="text-xs text-green-500">Execution mode</div>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600 font-medium mb-2">Fragment Distribution</div>
              <div className="space-y-1">
                {fragments && fragments.length > 0 ? (
                  fragments.slice(0, 4).map((fragment, idx) => (
                    <div key={idx} className="text-xs text-gray-700 flex justify-between items-center bg-white px-2 py-1 rounded border">
                      <span>Fragment {idx + 1}</span>
                      <Badge variant="outline" className="text-xs">
                        {fragment.provider?.toUpperCase() ?? 'UNKNOWN'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-red-500">ERROR: No fragment distribution data available</div>
                )}
              </div>
            </div>
          </div>
        );

      case 'aggregation':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Responses</div>
                <div className="text-2xl font-bold text-blue-900">
                  {details.received ? `${details.received}/${fragments.length || '?'}` : 'NaN'}
                </div>
                <div className="text-xs text-blue-500">Received/Expected</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Coherence</div>
                <div className="text-2xl font-bold text-green-900">
                  {details.coherence ?? 'NaN'}
                </div>
                <div className="text-xs text-green-500">Quality score</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">Method</div>
                <div className="text-lg font-bold text-purple-900">
                  {details.method ?? 'NaN'}
                </div>
                <div className="text-xs text-purple-500">Aggregation type</div>
              </div>
            </div>
            {details.deanonymization_complete ? (
              <div className="bg-green-50 p-3 rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800 font-medium">De-anonymization complete</span>
              </div>
            ) : (
              <div className="bg-red-50 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800 font-medium">ERROR: De-anonymization status unknown</span>
              </div>
            )}
          </div>
        );

      case 'final_response':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Privacy Score</div>
                <div className="text-2xl font-bold text-green-900">
                  {details.privacy_score ? `${(details.privacy_score * 100).toFixed(0)}%` : 'NaN'}
                </div>
                <div className="text-xs text-green-500">Protection level</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Response Quality</div>
                <div className="text-2xl font-bold text-blue-900">
                  {details.response_quality?.toFixed(2) ?? 'NaN'}
                </div>
                <div className="text-xs text-blue-500">Output coherence</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">Total Latency</div>
                <div className="text-2xl font-bold text-purple-900">
                  {details.total_time ? `${details.total_time.toFixed(1)}s` : 'NaN'}
                </div>
                <div className="text-xs text-purple-500">Processing time</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-sm text-orange-600 font-medium">Cost</div>
                <div className="text-2xl font-bold text-orange-900">
                  {details.total_cost ? `$${details.total_cost.toFixed(4)}` : 'NaN'}
                </div>
                <div className="text-xs text-orange-500">Total expense</div>
              </div>
            </div>
            
            {/* Final LLM Response */}
            {details.final_response && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                <div className="text-sm text-gray-600 font-medium mb-2">Final Aggregated Response:</div>
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap block">
                    {details.final_response}
                  </p>
                </div>
              </div>
            )}
            
            {!details.final_response && status === 'completed' && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="text-sm text-red-600 font-medium mb-1">Final Response:</div>
                <p className="text-xs text-red-500 block">ERROR: No final response available</p>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center text-gray-500 py-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm block">No detailed information available for this step</p>
          </div>
        );
    }
  };

  return (
    <Card className="p-6 h-[400px] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-lg font-semibold">{getStepTitle()}</h3>
            <p className="text-sm text-gray-600 block">{getStepDescription()}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>
      
      {renderDetailContent()}
    </Card>
  );
}