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
      <div className="p-6 h-[400px] flex items-center justify-center bg-white/5 backdrop-blur-md border border-white/10 rounded-xl">
        <div className="text-center text-white/60">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-white/30" />
          <h3 className="text-lg font-light mb-2 text-white">No Step Selected</h3>
          <p className="text-sm block">Click on a processing step in the flow diagram to view detailed information</p>
        </div>
      </div>
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
        return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>;
      case 'processing':
        return <Badge variant="default" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Processing</Badge>;
      default:
        return <Badge variant="secondary" className="bg-gray-500/20 text-gray-400 border-gray-500/30">Pending</Badge>;
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
      aggregation: 'Intelligently combines partial responses using the same GPT-4o-mini model that enhanced the fragments, maintaining thread continuity for superior aggregation quality.',
      final_response: 'Assembles the complete response with privacy scoring, quality metrics, and performance analytics for delivery.'
    };
    return descriptions[selectedStep as keyof typeof descriptions] || 'Processing step in the privacy-preserving pipeline.';
  };

  const renderDetailContent = () => {
    // Show empty state ONLY for pending steps that haven't been started
    if (status === 'pending') {
      return (
        <div className="text-center text-white/60 py-8">
          <Clock className="h-8 w-8 mx-auto mb-2 text-white/30" />
          <p className="text-sm block text-white/70">Step is waiting to be processed</p>
          <p className="text-xs text-white/50 mt-1 block">Details will appear when processing begins</p>
        </div>
      );
    }

    // Show skipped state for steps that were not needed
    if (status === 'skipped') {
      return (
        <div className="text-center text-white/60 py-8">
          <div className="h-8 w-8 mx-auto mb-2 text-white/30 flex items-center justify-center">
            <span className="text-2xl">⏭️</span>
          </div>
          <p className="text-sm block text-white/70">Step was skipped</p>
          <p className="text-xs text-white/50 mt-1 block">This step was not needed for your query</p>
        </div>
      );
    }

    // For processing or completed steps, show the detailed panels with real data or NaN/errors

    switch (selectedStep) {
      case 'planning':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 p-3 rounded-lg">
                <div className="text-sm text-blue-400 font-light">Complexity Score</div>
                <div className="text-2xl font-light text-blue-300">
                  {details.complexity_score ?? 'NaN'}
                </div>
                <div className="text-xs text-blue-400/70">Query analysis complexity</div>
              </div>
              <div className="bg-purple-500/10 backdrop-blur-sm border border-purple-500/20 p-3 rounded-lg">
                <div className="text-sm text-purple-400 font-light">Domains Detected</div>
                <div className="text-2xl font-light text-purple-300">
                  {details.domains ?? 'NaN'}
                </div>
                <div className="text-xs text-purple-400/70">Different content types</div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-lg">
              <div className="text-sm text-white/80 font-light mb-2">Strategy Decision</div>
              <div className="text-sm text-white/90">
                {details.decision || 'ERROR: No strategy decision available'}
              </div>
            </div>
          </div>
        );

      case 'pii_detection':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 p-3 rounded-lg">
                <div className="text-sm text-red-400 font-light">Entities Found</div>
                <div className="text-2xl font-light text-red-300">
                  {details.entity_count ?? 'NaN'}
                </div>
                <div className="text-xs text-red-400/70">PII entities detected</div>
              </div>
              <div className="bg-orange-500/10 backdrop-blur-sm border border-orange-500/20 p-3 rounded-lg">
                <div className="text-sm text-orange-400 font-light">Sensitivity</div>
                <div className="text-2xl font-light text-orange-300">
                  {details.sensitivity_score ?? 'NaN'}
                </div>
                <div className="text-xs text-orange-400/70">Risk classification</div>
              </div>
              <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/20 p-3 rounded-lg">
                <div className="text-sm text-green-400 font-light">Confidence</div>
                <div className="text-2xl font-light text-green-300">
                  {details.confidence ?? 'NaN'}
                </div>
                <div className="text-xs text-green-400/70">Detection accuracy</div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-lg">
              <div className="text-sm text-white/80 font-light mb-2">Detected Entity Types</div>
              <div className="flex flex-wrap gap-2">
                {details.entities && details.entities.length > 0 ? (
                  details.entities.map((entity: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-white/5 text-white/80 border-white/20">{entity}</Badge>
                  ))
                ) : (
                  <span className="text-xs text-red-400">ERROR: No entity data available</span>
                )}
              </div>
            </div>
          </div>
        );

      case 'fragmentation':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 p-3 rounded-lg">
                <div className="text-sm text-blue-400 font-light">Strategy</div>
                <div className="text-lg font-light text-blue-300">
                  {details.strategy ?? 'NaN'}
                </div>
                <div className="text-xs text-blue-400/70">Fragmentation method</div>
              </div>
              <div className="bg-purple-500/10 backdrop-blur-sm border border-purple-500/20 p-3 rounded-lg">
                <div className="text-sm text-purple-400 font-light">Fragments</div>
                <div className="text-2xl font-light text-purple-300">
                  {details.fragment_count ?? fragments.length || 'NaN'}
                </div>
                <div className="text-xs text-purple-400/70">Total created</div>
              </div>
              <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/20 p-3 rounded-lg">
                <div className="text-sm text-green-400 font-light">Isolation</div>
                <div className="text-2xl font-light text-green-300">
                  {details.isolation ?? 'NaN'}
                </div>
                <div className="text-xs text-green-400/70">Context separation</div>
              </div>
            </div>
            {details.overlap_minimized ? (
              <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/20 p-3 rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-300 font-light">Context overlap minimized</span>
              </div>
            ) : (
              <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-300 font-light">ERROR: Overlap minimization status unknown</span>
              </div>
            )}
          </div>
        );

      case 'enhancement':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/20 p-3 rounded-lg">
                <div className="text-sm text-indigo-400 font-light">Fragments Enhanced</div>
                <div className="text-2xl font-light text-indigo-300">
                  {details.fragments_enhanced ?? 'NaN'}
                </div>
                <div className="text-xs text-indigo-400/70">Optimized segments</div>
              </div>
              <div className="bg-teal-500/10 backdrop-blur-sm border border-teal-500/20 p-3 rounded-lg">
                <div className="text-sm text-teal-400 font-light">Context Quality</div>
                <div className="text-2xl font-light text-teal-300">
                  {details.context_quality ?? 'NaN'}
                </div>
                <div className="text-xs text-teal-400/70">Optimization score</div>
              </div>
            </div>
            {details.segmentation_optimized ? (
              <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/20 p-3 rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-300 font-light">Fragment segmentation optimized</span>
              </div>
            ) : (
              <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-300 font-light">ERROR: Segmentation optimization status unknown</span>
              </div>
            )}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-lg">
              <div className="text-sm text-white/80 font-light mb-2">Context Enhancements Applied</div>
              <div className="space-y-1">
                {details.context_additions && details.context_additions.length > 0 ? (
                  details.context_additions.map((addition: string, idx: number) => (
                    <div key={idx} className="text-xs text-white/80 bg-black/20 backdrop-blur-sm border border-white/5 px-2 py-1 rounded">
                      {addition}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-red-400">ERROR: No context enhancement data available</div>
                )}
              </div>
            </div>
          </div>
        );

      case 'distribution':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 p-3 rounded-lg">
                <div className="text-sm text-blue-400 font-light">Fragments Sent</div>
                <div className="text-2xl font-light text-blue-300">
                  {details.fragments_sent ?? fragments.length || 'NaN'}
                </div>
                <div className="text-xs text-blue-400/70">Total distributed</div>
              </div>
              <div className="bg-purple-500/10 backdrop-blur-sm border border-purple-500/20 p-3 rounded-lg">
                <div className="text-sm text-purple-400 font-light">Providers Used</div>
                <div className="text-2xl font-light text-purple-300">
                  {details.provider_count ?? 'NaN'}
                </div>
                <div className="text-xs text-purple-400/70">LLM services</div>
              </div>
              <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/20 p-3 rounded-lg">
                <div className="text-sm text-green-400 font-light">Processing</div>
                <div className="text-lg font-light text-green-300">
                  {details.parallel_processing ?? 'NaN'}
                </div>
                <div className="text-xs text-green-400/70">Execution mode</div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-lg">
              <div className="text-sm text-white/80 font-light mb-2">Fragment Distribution</div>
              <div className="space-y-1">
                {fragments && fragments.length > 0 ? (
                  fragments.slice(0, 4).map((fragment, idx) => (
                    <div key={idx} className="text-xs text-white/80 flex justify-between items-center bg-black/20 backdrop-blur-sm border border-white/5 px-2 py-1 rounded">
                      <span>Fragment {idx + 1}</span>
                      <Badge variant="outline" className="text-xs bg-white/5 text-white/80 border-white/20">
                        {fragment.provider?.toUpperCase() ?? 'UNKNOWN'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-red-400">ERROR: No fragment distribution data available</div>
                )}
              </div>
            </div>
          </div>
        );

      case 'aggregation':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 p-3 rounded-lg">
                <div className="text-sm text-blue-400 font-light">Responses</div>
                <div className="text-2xl font-light text-blue-300">
                  {details.received ? `${details.received}/${fragments.length || '?'}` : 'NaN'}
                </div>
                <div className="text-xs text-blue-400/70">Received/Expected</div>
              </div>
              <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/20 p-3 rounded-lg">
                <div className="text-sm text-green-400 font-light">Coherence</div>
                <div className="text-2xl font-light text-green-300">
                  {details.coherence ?? 'NaN'}
                </div>
                <div className="text-xs text-green-400/70">Quality score</div>
              </div>
              <div className="bg-purple-500/10 backdrop-blur-sm border border-purple-500/20 p-3 rounded-lg">
                <div className="text-sm text-purple-400 font-light">Method</div>
                <div className="text-lg font-light text-purple-300">
                  {details.method ?? 'NaN'}
                </div>
                <div className="text-xs text-purple-400/70">Aggregation type</div>
              </div>
            </div>
            {details.deanonymization_complete ? (
              <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/20 p-3 rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-300 font-light">De-anonymization complete</span>
              </div>
            ) : (
              <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-300 font-light">ERROR: De-anonymization status unknown</span>
              </div>
            )}
          </div>
        );

      case 'final_response':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/20 p-3 rounded-lg">
                <div className="text-sm text-green-400 font-light">Privacy Score</div>
                <div className="text-2xl font-light text-green-300">
                  {details.privacy_score ? `${(details.privacy_score * 100).toFixed(0)}%` : 'NaN'}
                </div>
                <div className="text-xs text-green-400/70">Protection level</div>
              </div>
              <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 p-3 rounded-lg">
                <div className="text-sm text-blue-400 font-light">Response Quality</div>
                <div className="text-2xl font-light text-blue-300">
                  {(details.response_quality && typeof details.response_quality === 'number') ? details.response_quality.toFixed(2) : 'NaN'}
                </div>
                <div className="text-xs text-blue-400/70">Output coherence</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-500/10 backdrop-blur-sm border border-purple-500/20 p-3 rounded-lg">
                <div className="text-sm text-purple-400 font-light">Total Latency</div>
                <div className="text-2xl font-light text-purple-300">
                  {(details.total_time && typeof details.total_time === 'number') ? `${details.total_time.toFixed(1)}s` : 'NaN'}
                </div>
                <div className="text-xs text-purple-400/70">Processing time</div>
              </div>
              <div className="bg-orange-500/10 backdrop-blur-sm border border-orange-500/20 p-3 rounded-lg">
                <div className="text-sm text-orange-400 font-light">Cost</div>
                <div className="text-2xl font-light text-orange-300">
                  {(details.total_cost && typeof details.total_cost === 'number') ? `$${details.total_cost.toFixed(4)}` : 'NaN'}
                </div>
                <div className="text-xs text-orange-400/70">Total expense</div>
              </div>
            </div>
            
            {/* Final LLM Response */}
            {details.final_response && (
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-blue-500/20 p-4 rounded-lg">
                <div className="text-sm text-white/80 font-light mb-2">Final Aggregated Response:</div>
                <div className="bg-black/20 backdrop-blur-sm border border-white/5 p-4 rounded-lg">
                  <p className="text-sm text-white/90 whitespace-pre-wrap block">
                    {details.final_response}
                  </p>
                </div>
              </div>
            )}
            
            {!details.final_response && status === 'completed' && (
              <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 p-4 rounded-lg">
                <div className="text-sm text-red-400 font-light mb-1">Final Response:</div>
                <p className="text-xs text-red-400 block">ERROR: No final response available</p>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center text-white/60 py-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-white/30" />
            <p className="text-sm block">No detailed information available for this step</p>
          </div>
        );
    }
  };

  return (
    <div className="p-6 h-[400px] overflow-y-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-lg font-light text-white">{getStepTitle()}</h3>
            <p className="text-sm text-white/70 block">{getStepDescription()}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>
      
      {renderDetailContent()}
    </div>
  );
}