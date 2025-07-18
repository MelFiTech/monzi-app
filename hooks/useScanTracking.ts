import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScanTrackingService, { type ScanUsage } from '@/services/ScanTrackingService';

const scanTrackingService = ScanTrackingService.getInstance();

// Query keys
export const scanTrackingKeys = {
  all: ['scanTracking'] as const,
  usage: () => [...scanTrackingKeys.all, 'usage'] as const,
  status: () => [...scanTrackingKeys.all, 'status'] as const,
  remaining: () => [...scanTrackingKeys.all, 'remaining'] as const,
  stats: () => [...scanTrackingKeys.all, 'stats'] as const,
};

/**
 * Hook to get current scan usage
 */
export function useScanUsage() {
  return useQuery({
    queryKey: scanTrackingKeys.usage(),
    queryFn: () => scanTrackingService.getCurrentUsage(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get scan status message for UI
 */
export function useScanStatusMessage() {
  return useQuery({
    queryKey: scanTrackingKeys.status(),
    queryFn: () => scanTrackingService.getScanStatusMessage(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get remaining free scans
 */
export function useRemainingFreeScans() {
  return useQuery({
    queryKey: scanTrackingKeys.remaining(),
    queryFn: () => scanTrackingService.getRemainingFreeScans(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get detailed usage statistics
 */
export function useScanStats() {
  return useQuery({
    queryKey: scanTrackingKeys.stats(),
    queryFn: () => scanTrackingService.getUsageStats(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to record a scan (mutation)
 */
export function useRecordScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => scanTrackingService.recordScan(),
    onSuccess: (newUsage) => {
      console.log('✅ Scan recorded successfully:', newUsage);
      
      // Invalidate all scan tracking queries to refresh UI
      queryClient.invalidateQueries({ queryKey: scanTrackingKeys.all });
      
      // Update cache with new usage data
      queryClient.setQueryData(scanTrackingKeys.usage(), newUsage);
    },
    onError: (error) => {
      console.error('❌ Failed to record scan:', error);
    },
  });
}

/**
 * Hook to check if user has free scans remaining
 */
export function useHasFreeScansRemaining() {
  return useQuery({
    queryKey: [...scanTrackingKeys.remaining(), 'hasFree'],
    queryFn: () => scanTrackingService.hasFreeScansRemaining(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get scan limits configuration
 */
export function useScanLimits() {
  return useQuery({
    queryKey: [...scanTrackingKeys.all, 'limits'],
    queryFn: () => scanTrackingService.getScanLimits(),
    staleTime: Infinity, // Limits don't change
    gcTime: Infinity,
  });
}

/**
 * Hook to reset usage (for testing/development)
 */
export function useResetScanUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => scanTrackingService.resetUsage(),
    onSuccess: () => {
      console.log('🔄 Scan usage reset successfully');
      
      // Invalidate all scan tracking queries
      queryClient.invalidateQueries({ queryKey: scanTrackingKeys.all });
    },
    onError: (error) => {
      console.error('❌ Failed to reset scan usage:', error);
    },
  });
} 