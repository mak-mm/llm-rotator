"use client";

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Database, CheckCircle2, Clock } from 'lucide-react';

interface QueryNodeData {
  label: string;
  query: string;
  status: 'pending' | 'processing' | 'completed';
  progress: number;
  charCount?: number;
}

export const QueryNode = memo(({ data, selected }: NodeProps<QueryNodeData>) => {
  const { label, query, status, progress, charCount } = data;
  
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
      default: return <Database className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className={`rounded-lg border-2 p-4 min-w-[300px] transition-all ${getStatusColor()} ${selected ? 'shadow-lg scale-105' : 'shadow-md'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <h3 className="font-semibold text-sm">{label}</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {charCount || query.length} chars
        </Badge>
      </div>
      
      <div className="mb-3">
        <p className="text-xs text-gray-600 truncate max-w-[250px]" title={query}>
          {query}
        </p>
      </div>

      {status === 'processing' && (
        <div className="mb-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-gray-500 mt-1">{progress}% complete</p>
        </div>
      )}

      <div className="flex justify-between text-xs text-gray-500">
        <span>Input Query</span>
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

QueryNode.displayName = 'QueryNode';