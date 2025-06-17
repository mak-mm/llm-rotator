import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryService, type AnalyzeRequest, type AnalyzeResponse, type StatusResponse } from '@/lib/api';
import { toast } from 'sonner';

/**
 * Hook for analyzing queries
 */
export const useAnalyzeQuery = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: AnalyzeRequest) => queryService.analyze(request),
    onSuccess: (data: AnalyzeResponse) => {
      toast.success('Query analyzed successfully');
      // Invalidate and refetch any related queries
      queryClient.invalidateQueries({ queryKey: ['query-status', data.request_id] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to analyze query';
      toast.error(message);
      console.error('Query analysis error:', error);
    },
  });
};

/**
 * Hook for polling query status
 */
export const useQueryStatus = (requestId: string | undefined, enabled = false) => {
  return useQuery({
    queryKey: ['query-status', requestId],
    queryFn: () => queryService.getStatus(requestId!),
    enabled: enabled && !!requestId,
    refetchInterval: (data) => {
      // Stop polling when complete or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
    staleTime: 0, // Always refetch
  });
};

/**
 * Hook for getting visualization data
 */
export const useVisualizationData = (requestId: string | undefined, enabled = false) => {
  return useQuery({
    queryKey: ['visualization', requestId],
    queryFn: () => queryService.getVisualizationData(requestId!),
    enabled: enabled && !!requestId,
    staleTime: 30000, // 30 seconds
  });
};


/**
 * Hook for getting provider information
 */
export const useProviderInfo = () => {
  return useQuery({
    queryKey: ['providers-info'],
    queryFn: () => queryService.getProviders(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};