"use client";

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Cpu, CheckCircle2, Clock, Zap, Brain, Sparkles } from 'lucide-react';

interface ProviderNodeData {
  label: string;
  provider: 'openai' | 'anthropic' | 'google';
  status: 'pending' | 'processing' | 'completed';
  progress: number;
  fragmentId?: string;
  response?: string;
  processingTime?: number;
  tokens?: number;
  message?: string;
}

export const ProviderNode = memo(({ data, selected }: NodeProps<ProviderNodeData>) => {
  const { provider, status, progress, fragmentId, response, processingTime, tokens, message } = data;
  
  const getProviderConfig = () => {
    switch (provider) {
      case 'openai':
        return {
          name: 'OpenAI',
          model: 'GPT-4.1',
          color: 'border-emerald-500 bg-emerald-50 text-emerald-700',
          icon: <Brain className="h-4 w-4" />,
          capabilities: ['Reasoning', 'Code', 'Vision']
        };
      case 'anthropic':
        return {
          name: 'Anthropic',
          model: 'Claude Sonnet',
          color: 'border-orange-500 bg-orange-50 text-orange-700',
          icon: <Sparkles className="h-4 w-4" />,
          capabilities: ['Analysis', 'Safety', 'Hybrid']
        };
      case 'google':
        return {
          name: 'Google',
          model: 'Gemini Flash',
          color: 'border-blue-500 bg-blue-50 text-blue-700',
          icon: <Zap className="h-4 w-4" />,
          capabilities: ['Speed', 'Cost', 'Scale']
        };
      default:
        return {
          name: 'Unknown',
          model: 'Unknown',
          color: 'border-gray-500 bg-gray-50 text-gray-700',
          icon: <Cpu className="h-4 w-4" />,
          capabilities: []
        };
    }
  };

  const config = getProviderConfig();
  
  const getStatusColor = () => {
    if (status === 'completed') return config.color.replace('50', '100');
    if (status === 'processing') return config.color;
    return 'border-gray-300 bg-gray-50 text-gray-500';
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'processing': return <Clock className="h-4 w-4 animate-pulse" style={{ color: config.color.includes('emerald') ? '#10b981' : config.color.includes('orange') ? '#f97316' : '#3b82f6' }} />;
      default: return config.icon;
    }
  };

  return (
    <div className={`rounded-lg border-2 p-4 min-w-[250px] transition-all ${getStatusColor()} ${selected ? 'shadow-lg scale-105' : 'shadow-md'}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !border-2 !border-white"
        style={{ backgroundColor: config.color.includes('emerald') ? '#10b981' : config.color.includes('orange') ? '#f97316' : '#3b82f6' }}
      />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <h3 className="font-semibold text-sm">{config.name}</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {config.model}
        </Badge>
      </div>
      
      {fragmentId && (
        <div className="mb-2">
          <Badge variant="secondary" className="text-xs">
            Fragment {fragmentId}
          </Badge>
        </div>
      )}

      {status === 'processing' && message && (
        <div className="mb-3">
          <p className="text-xs opacity-80">{message}</p>
        </div>
      )}

      {status === 'processing' && (
        <div className="mb-3">
          <Progress value={progress} className="h-2" />
          <p className="text-xs opacity-60 mt-1">{progress}% complete</p>
        </div>
      )}

      {status === 'completed' && (
        <div className="space-y-2 mb-3">
          {processingTime && (
            <div className="flex items-center justify-between">
              <span className="text-xs opacity-70">Time:</span>
              <Badge variant="outline" className="text-xs">
                {processingTime.toFixed(2)}s
              </Badge>
            </div>
          )}
          
          {tokens && (
            <div className="flex items-center justify-between">
              <span className="text-xs opacity-70">Tokens:</span>
              <Badge variant="outline" className="text-xs">
                {tokens}
              </Badge>
            </div>
          )}

          {response && (
            <div>
              <span className="text-xs opacity-70">Response:</span>
              <p className="text-xs mt-1 p-2 bg-white/50 rounded border truncate max-w-[200px]" title={response}>
                {response}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1 mb-2">
        {config.capabilities.map((cap) => (
          <Badge key={cap} variant="outline" className="text-xs px-1 py-0">
            {cap}
          </Badge>
        ))}
      </div>

      <div className="flex justify-between text-xs opacity-60">
        <span>{config.name} LLM</span>
        <span className="capitalize">{status}</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !border-2 !border-white"
        style={{ backgroundColor: config.color.includes('emerald') ? '#10b981' : config.color.includes('orange') ? '#f97316' : '#3b82f6' }}
      />
    </div>
  );
});

ProviderNode.displayName = 'ProviderNode';