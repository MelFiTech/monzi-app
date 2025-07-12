import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import HybridVisionService from '@/services/HybridVisionService';
import { type ExtractedBankData } from '@/services/GeminiService';

// Helper function for updating performance stats
function updatePerformanceStats(currentStats: any, attempts: any[], confidence: number) {
  const cloudVisionAttempt = attempts.find(a => a.service === 'cloudVision');
  const geminiAttempt = attempts.find(a => a.service === 'gemini');
  
  return {
    ...currentStats,
    totalExtractions: currentStats.totalExtractions + 1,
    cloudVisionSuccess: cloudVisionAttempt?.success ? currentStats.cloudVisionSuccess + 1 : currentStats.cloudVisionSuccess,
    geminiSuccess: geminiAttempt?.success ? currentStats.geminiSuccess + 1 : currentStats.geminiSuccess,
    fallbackUsage: attempts.length > 1 ? currentStats.fallbackUsage + 1 : currentStats.fallbackUsage,
    averageConfidence: ((currentStats.averageConfidence * currentStats.totalExtractions) + confidence) / (currentStats.totalExtractions + 1),
    cloudVisionSuccessRate: currentStats.totalExtractions > 0 ? (currentStats.cloudVisionSuccess / currentStats.totalExtractions) * 100 : 0,
    fallbackRate: currentStats.totalExtractions > 0 ? (currentStats.fallbackUsage / currentStats.totalExtractions) * 100 : 0
  };
}

// Query key factory for HybridVision
export const hybridVisionQueryKeys = {
  all: ['hybridVision'] as const,
  imageProcessing: () => [...hybridVisionQueryKeys.all, 'imageProcessing'] as const,
  bankDataExtraction: (imageUri: string) => [...hybridVisionQueryKeys.imageProcessing(), 'bankData', imageUri] as const,
  validation: () => [...hybridVisionQueryKeys.all, 'validation'] as const,
  stats: () => [...hybridVisionQueryKeys.all, 'stats'] as const,
};

// Bank Data Extraction Query Hook (for cached results)
export function useHybridVisionBankDataExtraction(imageUri: string, enabled = false) {
  return useQuery({
    queryKey: hybridVisionQueryKeys.bankDataExtraction(imageUri),
    queryFn: () => HybridVisionService.extractBankData(imageUri),
    enabled: enabled && !!imageUri,
    staleTime: 30 * 60 * 1000, // 30 minutes - image processing results don't change
    gcTime: 60 * 60 * 1000, // 1 hour cache
    retry: 1, // Reduced since HybridVision already has internal fallback logic
    retryDelay: 5000,
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
}

// Bank Data Extraction Mutation Hook (for new processing) - This is the main one to use
export function useHybridVisionExtractBankDataMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageUri: string) => HybridVisionService.extractBankData(imageUri),
    onSuccess: (data, imageUri) => {
      // Cache the successful extraction
      queryClient.setQueryData(hybridVisionQueryKeys.bankDataExtraction(imageUri), data);
      
      // If we have valid data, also store in a recent extractions cache
      if (HybridVisionService.isExtractionValid(data)) {
        const recentExtractions = queryClient.getQueryData(['hybridVision', 'recentExtractions']) as ExtractedBankData[] || [];
        const updated = [data, ...recentExtractions.slice(0, 9)]; // Keep last 10
        queryClient.setQueryData(['hybridVision', 'recentExtractions'], updated);
        
        // Update performance stats
        const metadata = HybridVisionService.getExtractionMetadata(data);
        if (metadata) {
          const currentStats = queryClient.getQueryData(['hybridVision', 'performanceStats']) || {
            totalExtractions: 0,
            cloudVisionSuccess: 0,
            geminiSuccess: 0,
            fallbackUsage: 0,
            averageCloudVisionTime: 0,
            averageGeminiTime: 0,
            averageConfidence: 0
          };
          
          const newStats = updatePerformanceStats(currentStats, metadata, data.confidence);
          queryClient.setQueryData(['hybridVision', 'performanceStats'], newStats);
        }
      }
    },
    onError: (error, imageUri) => {
      console.error('HybridVision: Bank data extraction failed:', error);
      // Don't cache error results
    },
    retry: false, // Don't retry - HybridVision already handles retries internally
  });
}

// Performance statistics for hybrid approach
export function useHybridVisionPerformanceStats() {
  return useQuery({
    queryKey: ['hybridVision', 'performanceStats'],
    queryFn: () => ({
      totalExtractions: 0,
      cloudVisionSuccess: 0,
      geminiSuccess: 0,
      fallbackUsage: 0,
      averageCloudVisionTime: 0,
      averageGeminiTime: 0,
      averageConfidence: 0,
      cloudVisionSuccessRate: 0,
      geminiSuccessRate: 0,
      fallbackRate: 0
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    initialData: {
      totalExtractions: 0,
      cloudVisionSuccess: 0,
      geminiSuccess: 0,
      fallbackUsage: 0,
      averageCloudVisionTime: 0,
      averageGeminiTime: 0,
      averageConfidence: 0,
      cloudVisionSuccessRate: 0,
      geminiSuccessRate: 0,
      fallbackRate: 0
    }
  });
}

// Validation Hooks
export function useHybridVisionDataValidation() {
  return {
    // Validate extracted data
    validateExtraction: (data: ExtractedBankData) => HybridVisionService.isExtractionValid(data),
    
    // Format amount for display
    formatAmount: (amount: string) => HybridVisionService.formatExtractedAmount(amount),
    
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

    // Get extraction method info
    getExtractionInfo: (data: ExtractedBankData) => {
      const primaryService = HybridVisionService.getPrimaryService(data);
      const fallbackUsed = HybridVisionService.wasFallbackUsed(data);
      const metadata = HybridVisionService.getExtractionMetadata(data);
      
      return {
        primaryService,
        fallbackUsed,
        servicesUsed: metadata?.map(attempt => attempt.service) || [],
        totalDuration: metadata?.reduce((sum, attempt) => sum + attempt.duration, 0) || 0
      };
    }
  };
}

// Recent Extractions Hook
export function useHybridVisionRecentExtractions() {
  return useQuery({
    queryKey: ['hybridVision', 'recentExtractions'],
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
export function useHybridVisionClearRecentExtractions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      queryClient.setQueryData(['hybridVision', 'recentExtractions'], []);
      queryClient.setQueryData(['hybridVision', 'performanceStats'], {
        totalExtractions: 0,
        cloudVisionSuccess: 0,
        geminiSuccess: 0,
        fallbackUsage: 0,
        averageCloudVisionTime: 0,
        averageGeminiTime: 0,
        averageConfidence: 0,
        cloudVisionSuccessRate: 0,
        geminiSuccessRate: 0,
        fallbackRate: 0
      });
      return true;
    },
  });
}

// Image Processing Statistics Hook (enhanced for hybrid approach)
export function useHybridVisionImageProcessingStats() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['hybridVision', 'stats'],
    queryFn: () => {
      const recentExtractions = queryClient.getQueryData(['hybridVision', 'recentExtractions']) as ExtractedBankData[] || [];
      const performanceStats = queryClient.getQueryData(['hybridVision', 'performanceStats']) || {};
      
      const totalProcessed = recentExtractions.length;
      const successful = recentExtractions.filter(data => HybridVisionService.isExtractionValid(data)).length;
      const averageConfidence = totalProcessed > 0 
        ? recentExtractions.reduce((sum, data) => sum + data.confidence, 0) / totalProcessed 
        : 0;

      // Analyze service performance
      let cloudVisionPrimary = 0;
      let geminiPrimary = 0;
      let fallbackUsed = 0;

      recentExtractions.forEach(data => {
        const primaryService = HybridVisionService.getPrimaryService(data);
        const wasFallback = HybridVisionService.wasFallbackUsed(data);
        
        if (primaryService === 'cloudVision') cloudVisionPrimary++;
        if (primaryService === 'gemini') geminiPrimary++;
        if (wasFallback) fallbackUsed++;
      });
      
      return {
        totalProcessed,
        successful,
        successRate: totalProcessed > 0 ? (successful / totalProcessed) * 100 : 0,
        averageConfidence,
        lastProcessedAt: recentExtractions[0]?.confidence ? new Date() : null,
        // Hybrid-specific stats
        cloudVisionPrimary,
        geminiPrimary,
        fallbackUsage: fallbackUsed,
        fallbackRate: totalProcessed > 0 ? (fallbackUsed / totalProcessed) * 100 : 0,
        performanceStats
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Prefetch Image Processing Hook
export function useHybridVisionPrefetchImageProcessing() {
  const queryClient = useQueryClient();

  return (imageUri: string) => {
    if (!imageUri) return;

    queryClient.prefetchQuery({
      queryKey: hybridVisionQueryKeys.bankDataExtraction(imageUri),
      queryFn: () => HybridVisionService.extractBankData(imageUri),
      staleTime: 30 * 60 * 1000,
    });
  };
}

// Invalidate HybridVision queries helper
export function useInvalidateHybridVisionQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: hybridVisionQueryKeys.all }),
    invalidateImageProcessing: () => queryClient.invalidateQueries({ queryKey: hybridVisionQueryKeys.imageProcessing() }),
    invalidateBankDataExtraction: (imageUri: string) =>
      queryClient.invalidateQueries({ queryKey: hybridVisionQueryKeys.bankDataExtraction(imageUri) }),
    invalidateStats: () => queryClient.invalidateQueries({ queryKey: hybridVisionQueryKeys.stats() }),
    invalidatePerformanceStats: () => queryClient.invalidateQueries({ queryKey: ['hybridVision', 'performanceStats'] }),
  };
}

// HybridVision Service utilities
export function useHybridVisionUtils() {
  const queryClient = useQueryClient();

  return {
    // Get cached extraction data without triggering a request
    getCachedExtraction: (imageUri: string): ExtractedBankData | undefined =>
      queryClient.getQueryData(hybridVisionQueryKeys.bankDataExtraction(imageUri)),
    
    // Check if extraction data is cached
    hasExtractionCache: (imageUri: string): boolean =>
      queryClient.getQueryState(hybridVisionQueryKeys.bankDataExtraction(imageUri))?.status === 'success',
    
    // Get all recent extractions
    getRecentExtractions: (): ExtractedBankData[] =>
      queryClient.getQueryData(['hybridVision', 'recentExtractions']) || [],
    
    // Clear all image processing cache
    clearAllCache: () => {
      queryClient.removeQueries({ queryKey: hybridVisionQueryKeys.all });
      queryClient.removeQueries({ queryKey: ['hybridVision', 'recentExtractions'] });
      queryClient.removeQueries({ queryKey: ['hybridVision', 'performanceStats'] });
    },

    // Get performance insights
    getPerformanceInsights: () => {
      const stats = queryClient.getQueryData(['hybridVision', 'performanceStats']);
      return stats;
    },

    // Update performance statistics (helper method)
    updatePerformanceStats: updatePerformanceStats
  };
} 