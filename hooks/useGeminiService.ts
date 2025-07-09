import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import GeminiService, { type ExtractedBankData } from '@/services/GeminiService';

// Query Keys
export const geminiQueryKeys = {
  all: ['gemini'] as const,
  imageProcessing: () => [...geminiQueryKeys.all, 'imageProcessing'] as const,
  bankDataExtraction: (imageUri: string) => [...geminiQueryKeys.imageProcessing(), 'bankData', imageUri] as const,
  validation: () => [...geminiQueryKeys.all, 'validation'] as const,
};

// Bank Data Extraction Query Hook (for cached results)
export function useBankDataExtraction(imageUri: string, enabled = false) {
  return useQuery({
    queryKey: geminiQueryKeys.bankDataExtraction(imageUri),
    queryFn: () => GeminiService.extractBankData(imageUri),
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
export function useExtractBankDataMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageUri: string) => GeminiService.extractBankData(imageUri),
    onSuccess: (data, imageUri) => {
      // Cache the successful extraction
      queryClient.setQueryData(geminiQueryKeys.bankDataExtraction(imageUri), data);
      
      // If we have valid data, also store in a recent extractions cache
      if (GeminiService.isExtractionValid(data)) {
        const recentExtractions = queryClient.getQueryData(['gemini', 'recentExtractions']) as ExtractedBankData[] || [];
        const updated = [data, ...recentExtractions.slice(0, 9)]; // Keep last 10
        queryClient.setQueryData(['gemini', 'recentExtractions'], updated);
      }
    },
    onError: (error, imageUri) => {
      console.error('Bank data extraction failed:', error);
      // Don't cache error results
    },
    retry: 1, // Retry once on failure
    retryDelay: 3000,
  });
}

// Batch Image Processing Hook
export function useBatchImageProcessing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageUris: string[]) => {
      const results = await Promise.allSettled(
        imageUris.map(uri => GeminiService.extractBankData(uri))
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
          queryClient.setQueryData(geminiQueryKeys.bankDataExtraction(imageUri), data);
        }
      });
    },
    retry: false, // Don't retry batch operations
  });
}

// Validation Hooks
export function useDataValidation() {
  return {
    // Validate extracted data
    validateExtraction: (data: ExtractedBankData) => GeminiService.isExtractionValid(data),
    
    // Format amount for display
    formatAmount: (amount: string) => GeminiService.formatExtractedAmount(amount),
    
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
export function useRecentExtractions() {
  return useQuery({
    queryKey: ['gemini', 'recentExtractions'],
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
export function useClearRecentExtractions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      queryClient.setQueryData(['gemini', 'recentExtractions'], []);
      return true;
    },
  });
}

// Image Processing Statistics Hook
export function useImageProcessingStats() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['gemini', 'stats'],
    queryFn: () => {
      const recentExtractions = queryClient.getQueryData(['gemini', 'recentExtractions']) as ExtractedBankData[] || [];
      
      const totalProcessed = recentExtractions.length;
      const successful = recentExtractions.filter(data => GeminiService.isExtractionValid(data)).length;
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
export function usePrefetchImageProcessing() {
  const queryClient = useQueryClient();

  return (imageUri: string) => {
    if (!imageUri) return;

    queryClient.prefetchQuery({
      queryKey: geminiQueryKeys.bankDataExtraction(imageUri),
      queryFn: () => GeminiService.extractBankData(imageUri),
      staleTime: 30 * 60 * 1000,
    });
  };
}

// Invalidate Gemini queries helper
export function useInvalidateGeminiQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: geminiQueryKeys.all }),
    invalidateImageProcessing: () => queryClient.invalidateQueries({ queryKey: geminiQueryKeys.imageProcessing() }),
    invalidateBankDataExtraction: (imageUri: string) =>
      queryClient.invalidateQueries({ queryKey: geminiQueryKeys.bankDataExtraction(imageUri) }),
    invalidateStats: () => queryClient.invalidateQueries({ queryKey: ['gemini', 'stats'] }),
  };
}

// Gemini Service utilities
export function useGeminiUtils() {
  const queryClient = useQueryClient();

  return {
    // Get cached extraction data without triggering a request
    getCachedExtraction: (imageUri: string): ExtractedBankData | undefined =>
      queryClient.getQueryData(geminiQueryKeys.bankDataExtraction(imageUri)),
    
    // Check if extraction data is cached
    hasExtractionCache: (imageUri: string): boolean =>
      queryClient.getQueryState(geminiQueryKeys.bankDataExtraction(imageUri))?.status === 'success',
    
    // Get all recent extractions
    getRecentExtractions: (): ExtractedBankData[] =>
      queryClient.getQueryData(['gemini', 'recentExtractions']) || [],
    
    // Clear all image processing cache
    clearAllCache: () => {
      queryClient.removeQueries({ queryKey: geminiQueryKeys.all });
      queryClient.removeQueries({ queryKey: ['gemini', 'recentExtractions'] });
      queryClient.removeQueries({ queryKey: ['gemini', 'stats'] });
    },
  };
} 