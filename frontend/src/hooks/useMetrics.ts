import { useQuery } from '@tanstack/react-query';
import { metricsService, type MetricsSummary, type TimeseriesData } from '@/lib/api';

/**
 * Hook for getting metrics summary
 */
export const useMetrics = (timeframe: string = '7d') => {
  return useQuery({
    queryKey: ['metrics-summary', timeframe],
    queryFn: () => metricsService.getSummary(timeframe),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider stale after 30 seconds
  });
};

/**
 * Hook for getting time-series data
 */
export const useTimeseriesData = (
  metric: string,
  timeframe: string = '7d',
  interval: string = '1h'
) => {
  return useQuery({
    queryKey: ['timeseries', metric, timeframe, interval],
    queryFn: () => metricsService.getTimeseries(metric, timeframe, interval),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider stale after 30 seconds
    enabled: !!metric, // Only fetch if metric is provided
  });
};