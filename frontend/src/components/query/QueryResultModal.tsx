"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Shield, Zap, DollarSign, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface QueryResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  response: string;
  metrics?: {
    privacy_score?: number;
    response_quality?: number;
    total_time?: number;
    total_cost?: number;
    fragments_processed?: number;
    providers_used?: number;
  };
  onNewQuery?: () => void;
}

export function QueryResultModal({ 
  isOpen, 
  onClose, 
  query, 
  response, 
  metrics,
  onNewQuery 
}: QueryResultModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    toast.success('Response copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNewQuery = () => {
    onClose();
    onNewQuery?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Query Processed Successfully
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Original Query */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Your Query:</h3>
            <Card className="p-4 bg-gray-50">
              <p className="text-sm text-gray-800">{query}</p>
            </Card>
          </div>

          {/* Privacy Metrics */}
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <Shield className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.privacy_score ? `${(metrics.privacy_score * 100).toFixed(0)}%` : 'N/A'}
                </div>
                <p className="text-xs text-gray-600 mt-1">Privacy Score</p>
              </Card>
              
              <Card className="p-4 text-center">
                <Zap className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.fragments_processed || 0}
                </div>
                <p className="text-xs text-gray-600 mt-1">Fragments</p>
              </Card>
              
              <Card className="p-4 text-center">
                <DollarSign className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.total_cost ? `$${metrics.total_cost.toFixed(4)}` : 'N/A'}
                </div>
                <p className="text-xs text-gray-600 mt-1">Cost</p>
              </Card>
              
              <Card className="p-4 text-center">
                <CheckCircle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.total_time ? `${metrics.total_time.toFixed(1)}s` : 'N/A'}
                </div>
                <p className="text-xs text-gray-600 mt-1">Time</p>
              </Card>
            </div>
          )}

          {/* AI Response */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">AI Response:</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {response || 'No response available'}
              </p>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {metrics?.providers_used || 0} Providers Used
              </Badge>
              <Badge variant="outline" className="text-xs">
                Quality: {metrics?.response_quality ? (metrics.response_quality * 100).toFixed(0) : 'N/A'}%
              </Badge>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Close
              </Button>
              <Button
                onClick={handleNewQuery}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                New Query
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}