"use client";

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// import { Button } from '@/components/ui/button';
import { QueryFragmentationFlow } from './QueryFragmentationFlow';
import { useQuery } from '@/contexts/query-context';
import { Clock, Shield, Network, Zap } from 'lucide-react';

export function QueryFragmentationFlowWrapper() {
  const { queryResult, isProcessing, processingStartTime } = useQuery();
  
  // Calculate elapsed time
  const getElapsedTime = () => {
    if (!processingStartTime) return 0;
    return (new Date().getTime() - processingStartTime.getTime()) / 1000;
  };

  const elapsedTime = isProcessing ? getElapsedTime() : (queryResult?.total_time || 0);

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Network className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold">Privacy-Preserving Query Fragmentation</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {elapsedTime.toFixed(1)}s
            </Badge>
            {queryResult?.privacy_score && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                {(queryResult.privacy_score * 100).toFixed(1)}% Privacy
              </Badge>
            )}
            {queryResult?.fragments && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {queryResult.fragments.length} Fragments
              </Badge>
            )}
          </div>
        </div>

        {/* Flow Visualization */}
        <QueryFragmentationFlow />

        {/* Controls and Legend */}
        <div className="flex items-center justify-between text-sm text-gray-600 pt-4 border-t">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-300"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
              <span>Processing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Completed</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span>Interactive • Real-time • Privacy-First</span>
          </div>
        </div>
      </div>
    </Card>
  );
}