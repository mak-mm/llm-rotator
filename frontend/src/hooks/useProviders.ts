import { useQuery } from '@tanstack/react-query';
import { providerService, type ProviderStatus } from '@/lib/api';

/**
 * Hook for getting real-time provider status
 */
export const useProviderStatus = () => {
  return useQuery({
    queryKey: ['provider-status'],
    queryFn: () => providerService.getStatus(),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider stale after 10 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
};

/**
 * Hook for getting provider information
 */
export const useProviderInfo = () => {
  return useQuery({
    queryKey: ['provider-info'],
    queryFn: () => providerService.getInfo(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};