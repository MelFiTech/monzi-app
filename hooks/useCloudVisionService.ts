import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import CloudVisionService from '@/services/CloudVisionService';
import { type ExtractedBankData } from '@/services/GeminiService';

// Query Keys
export const cloudVisionQueryKeys = {
  all: ['cloudVision'] as const,
  imageProcessing: () => [...cloudVisionQueryKeys.all, 'imageProcessing'] as const,
  bankDataExtraction: (imageUri: string) => [...cloudVisionQueryKeys.imageProcessing(), 'bankData', imageUri] as const,
  validation: () => [...cloudVisionQueryKeys.all, 'validation'] as const,
};

// Bank Data Extraction Query Hook (for cached results)
export function useCloudVisionBankDataExtraction(imageUri: string, enabled = false) {
  return useQuery({
    queryKey: cloudVisionQueryKeys.bankDataExtraction(imageUri),
    queryFn: () => CloudVisionService.extractBankData(imageUri),
    enabled: enabled && !!imageUri,
    staleTime: 30 * 60 * 1000, // 30 minutes - image processing results don't change
    gcTime: 60 * 60 * 1000, // 1 hour cache
    retry: 2, // Retry twice on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
}

// Bank Data Extraction Mutation Hook (for new processing)
export function useCloudVisionExtractBankDataMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageUri: string) => CloudVisionService.extractBankData(imageUri),
    onSuccess: (data, imageUri) => {
      // Cache the successful extraction
      queryClient.setQueryData(cloudVisionQueryKeys.bankDataExtraction(imageUri), data);
      
      // If we have valid data, also store in a recent extractions cache
      if (CloudVisionService.isExtractionValid(data)) {
        const recentExtractions = queryClient.getQueryData(['cloudVision', 'recentExtractions']) as ExtractedBankData[] || [];
        const updated = [data, ...recentExtractions.slice(0, 9)]; // Keep last 10
        queryClient.setQueryData(['cloudVision', 'recentExtractions'], updated);
      }
    },
    onError: (error, imageUri) => {
      console.error('CloudVision: Bank data extraction failed:', error);
      // Don't cache error results
    },
    retry: 1, // Retry once on failure
    retryDelay: 3000,
  });
}

// Batch Image Processing Hook
export function useCloudVisionBatchImageProcessing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageUris: string[]) => {
      const results = await Promise.allSettled(
        imageUris.map(uri => CloudVisionService.extractBankData(uri))
      );
      
      return results.map((result, index) => ({
        imageUri: imageUris[index],
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason : null,
      }));
    },
    onSuccess: (results) => {
      // Cache individual successful results
      results.forEach(({ imageUri, success, data }) => {
        if (success && data) {
          queryClient.setQueryData(cloudVisionQueryKeys.bankDataExtraction(imageUri), data);
        }
      });
    },
    retry: false, // Don't retry batch operations
  });
}

// Validation Hooks
export function useCloudVisionDataValidation() {
  return {
    // Validate extracted data
    validateExtraction: (data: ExtractedBankData) => CloudVisionService.isExtractionValid(data),
    
    // Format amount for display
    formatAmount: (amount: string) => CloudVisionService.formatExtractedAmount(amount),
    
    // Check if data has minimum requirements
    hasMinimumData: (data: ExtractedBankData) =>
      data.extractedFields.bankName || data.extractedFields.accountNumber,
    
    // Get confidence level description
    getConfidenceDescription: (confidence: number) => {
      if (confidence >= 90) return 'Very High';
      if (confidence >= 75) return 'High';
      if (confidence >= 60) return 'Medium';
      if (confidence >= 40) return 'Low';
      return 'Very Low';
    },
  };
}

// Recent Extractions Hook
export function useCloudVisionRecentExtractions() {
  return useQuery({
    queryKey: ['cloudVision', 'recentExtractions'],
    queryFn: () => {
      // This will return cached data or empty array
      return [];
    },
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    initialData: [],
  });
}

// Clear Recent Extractions Hook
export function useCloudVisionClearRecentExtractions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      queryClient.setQueryData(['cloudVision', 'recentExtractions'], []);
      return true;
    },
  });
}

// Image Processing Statistics Hook
export function useCloudVisionImageProcessingStats() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['cloudVision', 'stats'],
    queryFn: () => {
      const recentExtractions = queryClient.getQueryData(['cloudVision', 'recentExtractions']) as ExtractedBankData[] || [];
      
      const totalProcessed = recentExtractions.length;
      const successful = recentExtractions.filter(data => CloudVisionService.isExtractionValid(data)).length;
      const averageConfidence = totalProcessed > 0 
        ? recentExtractions.reduce((sum, data) => sum + data.confidence, 0) / totalProcessed 
        : 0;
      
      return {
        totalProcessed,
        successful,
        successRate: totalProcessed > 0 ? (successful / totalProcessed) * 100 : 0,
        averageConfidence,
        lastProcessedAt: recentExtractions[0]?.confidence ? new Date() : null,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Prefetch Image Processing Hook
export function useCloudVisionPrefetchImageProcessing() {
  const queryClient = useQueryClient();

  return (imageUri: string) => {
    if (!imageUri) return;

    queryClient.prefetchQuery({
      queryKey: cloudVisionQueryKeys.bankDataExtraction(imageUri),
      queryFn: () => CloudVisionService.extractBankData(imageUri),
      staleTime: 30 * 60 * 1000,
    });
  };
}

// Invalidate CloudVision queries helper
export function useInvalidateCloudVisionQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: cloudVisionQueryKeys.all }),
    invalidateImageProcessing: () => queryClient.invalidateQueries({ queryKey: cloudVisionQueryKeys.imageProcessing() }),
    invalidateBankDataExtraction: (imageUri: string) =>
      queryClient.invalidateQueries({ queryKey: cloudVisionQueryKeys.bankDataExtraction(imageUri) }),
    invalidateStats: () => queryClient.invalidateQueries({ queryKey: ['cloudVision', 'stats'] }),
  };
}

// CloudVision Service utilities
export function useCloudVisionUtils() {
  const queryClient = useQueryClient();

  return {
    // Get cached extraction data without triggering a request
    getCachedExtraction: (imageUri: string): ExtractedBankData | undefined =>
      queryClient.getQueryData(cloudVisionQueryKeys.bankDataExtraction(imageUri)),
    
    // Check if extraction data is cached
    hasExtractionCache: (imageUri: string): boolean =>
      queryClient.getQueryState(cloudVisionQueryKeys.bankDataExtraction(imageUri))?.status === 'success',
    
    // Get all recent extractions
    getRecentExtractions: (): ExtractedBankData[] =>
      queryClient.getQueryData(['cloudVision', 'recentExtractions']) || [],
    
    // Clear all image processing cache
    clearAllCache: () => {
      queryClient.removeQueries({ queryKey: cloudVisionQueryKeys.all });
      queryClient.removeQueries({ queryKey: ['cloudVision', 'recentExtractions'] });
      queryClient.removeQueries({ queryKey: ['cloudVision', 'stats'] });
    },
  };
} 