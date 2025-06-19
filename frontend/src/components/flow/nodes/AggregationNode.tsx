"use client";

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Layers, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

interface AggregationNodeData {
  label: string;
  status: 'pending' | 'processing' | 'completed';
  progress: number;
  responsesCount?: number;
  finalResponse?: string;
  privacyScore?: number;
  totalTime?: number;
  message?: string;
}

export const AggregationNode = memo(({ data, selected }: NodeProps<AggregationNodeData>) => {
  const { label, status, progress, responsesCount = 0, finalResponse, privacyScore, totalTime, message } = data;
  
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'border-green-500 bg-green-50 text-green-700';
      case 'processing': return 'border-blue-500 bg-blue-50 text-blue-700';
      default: return 'border-gray-300 bg-gray-50 text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'processing': return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />;
      default: return <Layers className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPrivacyScoreColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-600';
    if (score > 0.8) return 'bg-green-100 text-green-700';
    if (score > 0.6) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className={`rounded-lg border-2 p-4 min-w-[320px] transition-all ${getStatusColor()} ${selected ? 'shadow-lg scale-105' : 'shadow-md'}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-blue-500 !border-2 !border-white"
      />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <h3 className="font-semibold text-sm">{label}</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          <TrendingUp className="h-3 w-3 mr-1" />
          Ensemble
        </Badge>
      </div>
      
      {status === 'processing' && message && (
        <div className="mb-3">
          <p className="text-xs text-blue-600">{message}</p>
        </div>
      )}

      {status === 'processing' && (
        <div className="mb-3">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-gray-500 mt-1">{progress}% complete</p>
        </div>
      )}

      {status === 'completed' && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Responses Combined:</span>
            <Badge variant="secondary" className="text-xs">
              {responsesCount} responses
            </Badge>
          </div>
          
          {privacyScore !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Privacy Score:</span>
              <Badge className={`text-xs ${getPrivacyScoreColor(privacyScore)}`}>
                {(privacyScore * 100).toFixed(1)}%
              </Badge>
            </div>
          )}

          {totalTime !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Total Time:</span>
              <Badge variant="outline" className="text-xs">
                {totalTime.toFixed(2)}s
              </Badge>
            </div>
          )}

          {finalResponse && (
            <div>
              <span className="text-xs text-gray-600">Final Response:</span>
              <p className="text-xs mt-1 p-2 bg-white/50 rounded border max-h-16 overflow-y-auto" title={finalResponse}>
                {finalResponse.length > 150 ? `${finalResponse.substring(0, 150)}...` : finalResponse}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between text-xs text-gray-500">
        <span>Response Aggregation</span>
        <span className="capitalize">{status}</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-green-500 !border-2 !border-white"
      />
    </div>
  );
});

AggregationNode.displayName = 'AggregationNode';