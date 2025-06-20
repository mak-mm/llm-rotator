"use client";

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';

interface ProcessingFlowNodeProps {
  data: {
    label: string;
    status: 'pending' | 'processing' | 'completed';
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
  };
  selected?: boolean;
}

export const ProcessingFlowNode = memo(({ data, selected }: ProcessingFlowNodeProps) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-blue-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getNodeBackground = () => {
    switch (data.status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'processing':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <>
      <Handle type="target" position={Position.Top} className="w-2 h-2" />
      <Card 
        className={`p-4 min-w-[280px] max-w-[320px] transition-all duration-200 ${getNodeBackground()} ${
          selected ? 'ring-2 ring-blue-400 shadow-lg' : 'shadow-sm'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <span>{data.label}</span>
          </h3>
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        </div>

        {/* Details */}
        {data.details && data.status !== 'pending' && (
          <div className="space-y-2">
            {data.details.title && (
              <p className="text-xs text-gray-600 font-medium">{data.details.title}</p>
            )}
            
            {data.details.items && (
              <div className="space-y-1">
                {data.details.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">{item.label}:</span>
                    <span className={`font-medium ${
                      item.highlight ? 'text-blue-600' : 'text-gray-900'
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
                      item.type === 'success' ? 'bg-green-100 text-green-700' :
                      item.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
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
          <p className="text-xs text-gray-500 italic">Waiting...</p>
        )}

        {/* Processing state animation */}
        {data.status === 'processing' && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-blue-600">Processing...</span>
          </div>
        )}
      </Card>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
    </>
  );
});

ProcessingFlowNode.displayName = 'ProcessingFlowNode';