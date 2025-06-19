"use client";

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, CheckCircle2, Clock, Eye } from 'lucide-react';

interface DetectionNodeData {
  label: string;
  status: 'pending' | 'processing' | 'completed';
  progress: number;
  piiEntities?: number;
  hasCode?: boolean;
  sensitivityScore?: number;
  message?: string;
}

export const DetectionNode = memo(({ data, selected }: NodeProps<DetectionNodeData>) => {
  const { label, status, progress, piiEntities = 0, hasCode, sensitivityScore, message } = data;
  
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
      default: return <Shield className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSensitivityColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-600';
    if (score > 0.7) return 'bg-red-100 text-red-700';
    if (score > 0.4) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
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
          <Eye className="h-3 w-3 mr-1" />
          50+ Types
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
            <span className="text-xs text-gray-600">PII Entities Found:</span>
            <Badge variant={piiEntities > 0 ? 'destructive' : 'secondary'} className="text-xs">
              {piiEntities > 0 ? (
                <>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {piiEntities} found
                </>
              ) : (
                'Clean'
              )}
            </Badge>
          </div>
          
          {hasCode !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Code Detected:</span>
              <Badge variant={hasCode ? 'outline' : 'secondary'} className="text-xs">
                {hasCode ? 'Yes' : 'No'}
              </Badge>
            </div>
          )}

          {sensitivityScore !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Sensitivity:</span>
              <Badge className={`text-xs ${getSensitivityColor(sensitivityScore)}`}>
                {(sensitivityScore * 100).toFixed(0)}%
              </Badge>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between text-xs text-gray-500">
        <span>PII Detection</span>
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

DetectionNode.displayName = 'DetectionNode';