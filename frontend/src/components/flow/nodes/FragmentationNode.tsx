"use client";

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Network, CheckCircle2, Clock, Zap } from 'lucide-react';

interface FragmentationNodeData {
  label: string;
  status: 'pending' | 'processing' | 'completed';
  progress: number;
  fragmentsCount?: number;
  strategy?: string;
  message?: string;
}

export const FragmentationNode = memo(({ data, selected }: NodeProps<FragmentationNodeData>) => {
  const { label, status, progress, fragmentsCount = 0, strategy, message } = data;
  
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
      default: return <Network className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className={`rounded-lg border-2 p-4 min-w-[280px] transition-all ${getStatusColor()} ${selected ? 'shadow-lg scale-105' : 'shadow-md'}`}>
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
          <Zap className="h-3 w-3 mr-1" />
          Semantic
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
            <span className="text-xs text-gray-600">Fragments Created:</span>
            <Badge variant="secondary" className="text-xs">
              {fragmentsCount} fragments
            </Badge>
          </div>
          
          {strategy && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Strategy:</span>
              <Badge variant="outline" className="text-xs capitalize">
                {strategy.replace('_', ' ')}
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Privacy Preserved:</span>
            <Badge className="text-xs bg-green-100 text-green-700">
              ✓ Anonymized
            </Badge>
          </div>
        </div>
      )}

      <div className="flex justify-between text-xs text-gray-500">
        <span>Fragmentation</span>
        <span className="capitalize">{status}</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-blue-500 !border-2 !border-white"
      />
    </div>
  );
});

FragmentationNode.displayName = 'FragmentationNode';