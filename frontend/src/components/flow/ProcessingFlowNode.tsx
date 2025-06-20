"use client";

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';

import type { NodeProps } from '@xyflow/react';

interface NodeData {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'processing' | 'completed' | 'skipped';
  details?: {
    title?: string;
    items?: Array<{
      label: string;
      value: string | number;
      highlight?: boolean;
    }>;
    subItems?: Array<{
      text: string;
      type?: 'success' | 'warning' | 'info';
    }>;
  };
}

type ProcessingFlowNodeProps = NodeProps<NodeData>;

function ProcessingFlowNodeComponent(props: ProcessingFlowNodeProps) {
  const { data, selected } = props;
  console.log('🎨 ProcessingFlowNode rendering with data:', data);
  
  const getStatusColor = () => {
    switch (data.status) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-blue-500';
      case 'skipped':
        return 'bg-gray-400 opacity-50';
      default:
        return 'bg-gray-300';
    }
  };

  const getNodeBackground = () => {
    switch (data.status) {
      case 'completed':
        return 'bg-green-50 dark:bg-green-500/10 border-2 border-green-400 dark:border-green-500 backdrop-blur-sm';
      case 'processing':
        return 'bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-400 dark:border-blue-500 backdrop-blur-sm';
      case 'skipped':
        return 'bg-gray-50 dark:bg-white/5 border-2 border-gray-300 dark:border-gray-500 opacity-60 backdrop-blur-sm';
      default:
        return 'bg-gray-50 dark:bg-white/5 border-2 border-gray-300 dark:border-white/20 backdrop-blur-sm';
    }
  };

  return (
    <div>
      <Handle type="target" position={Position.Left} className="w-2 h-2" />
      <div 
        className={`p-4 min-w-[280px] max-w-[320px] transition-all duration-200 cursor-move rounded-xl ${getNodeBackground()} ${
          selected ? 'ring-2 ring-blue-400/50 shadow-xl shadow-blue-500/20' : 'shadow-sm hover:shadow-md'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-light text-sm text-gray-900 dark:text-white flex items-center gap-2">
            {data.icon && <data.icon className="h-4 w-4 text-gray-600 dark:text-white/70" />}
            <span>{data.label}</span>
          </h3>
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        </div>

        {/* Details */}
        {data.details && data.status !== 'pending' && (
          <div className="space-y-2">
            {data.details.title && (
              <p className="text-xs text-gray-700 dark:text-white/80 font-light">{data.details.title}</p>
            )}
            
            {data.details.items && (
              <div className="space-y-1">
                {data.details.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-gray-600 dark:text-white/60">{item.label}:</span>
                    <span className={`font-light ${
                      item.highlight ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white/90'
                    }`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {data.details.subItems && (
              <div className="mt-2 space-y-1">
                {data.details.subItems.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`text-xs px-2 py-1 rounded ${
                      item.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30' :
                      item.type === 'warning' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30' :
                      'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-white/10 dark:text-white/80 dark:border-white/20'
                    }`}
                  >
                    {item.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending state */}
        {data.status === 'pending' && (
          <p className="text-xs text-gray-500 dark:text-white/50 italic">Waiting...</p>
        )}

        {/* Processing state animation */}
        {data.status === 'processing' && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-blue-600 dark:text-blue-400">Processing...</span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="w-2 h-2" />
    </div>
  );
}

export const ProcessingFlowNode = memo(ProcessingFlowNodeComponent);
ProcessingFlowNode.displayName = 'ProcessingFlowNode';