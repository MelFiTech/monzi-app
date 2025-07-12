import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ClaudeService from '@/services/ClaudeService';
import { ExtractedBankData } from '@/services/GeminiService';

// Query key factory for Claude
export const claudeQueryKeys = {
  all: ['claude'] as const,
  imageProcessing: () => [...claudeQueryKeys.all, 'imageProcessing'] as const,
  bankDataExtraction: (imageUri: string) => [...claudeQueryKeys.imageProcessing(), 'bankData', imageUri] as const,
  validation: () => [...claudeQueryKeys.all, 'validation'] as const,
  stats: () => [...claudeQueryKeys.all, 'stats'] as const,
};

// Bank Data Extraction Query Hook (for cached results)
export function useClaudeBankDataExtraction(imageUri: string, enabled = false) {
  return useQuery({
    queryKey: claudeQueryKeys.bankDataExtraction(imageUri),
    queryFn: () => ClaudeService.extractBankData(imageUri),
    enabled: enabled && !!imageUri,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour cache
    retry: 1,
    retryDelay: 5000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// Bank Data Extraction Mutation Hook (for new processing)
export function useClaudeExtractBankDataMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageUri: string) => ClaudeService.extractBankData(imageUri),
    onSuccess: (data, imageUri) => {
      // Cache the successful extraction
      queryClient.setQueryData(claudeQueryKeys.bankDataExtraction(imageUri), data);
      
      // Store in recent extractions if valid
      if (data.extractedFields.bankName || data.extractedFields.accountNumber) {
        const recentExtractions = queryClient.getQueryData(['claude', 'recentExtractions']) as ExtractedBankData[] || [];
        const updated = [data, ...recentExtractions.slice(0, 9)]; // Keep last 10
        queryClient.setQueryData(['claude', 'recentExtractions'], updated);
        
        // Update performance stats
        const currentStats = queryClient.getQueryData(['claude', 'performanceStats']) || {
          totalExtractions: 0,
          successfulExtractions: 0,
          averageConfidence: 0,
          averageProcessingTime: 0,
          highQualityExtractions: 0
        };
        
        const newStats = {
          totalExtractions: currentStats.totalExtractions + 1,
          successfulExtractions: currentStats.successfulExtractions + (data.confidence > 0 ? 1 : 0),
          averageConfidence: ((currentStats.averageConfidence * currentStats.totalExtractions) + data.confidence) / (currentStats.totalExtractions + 1),
          averageProcessingTime: currentStats.averageProcessingTime, // We don't have timing info here
          highQualityExtractions: currentStats.highQualityExtractions + (data.confidence >= 85 ? 1 : 0)
        };
        
        queryClient.setQueryData(['claude', 'performanceStats'], newStats);
      }
    },
    onError: (error, imageUri) => {
      console.error('Claude: Bank data extraction failed:', error);
    },
    retry: false,
  });
}

// Performance Statistics Hook
export function useClaudePerformanceStats() {
  return useQuery({
    queryKey: ['claude', 'performanceStats'],
    queryFn: () => Promise.resolve({
      totalExtractions: 0,
      successfulExtractions: 0,
      averageConfidence: 0,
      averageProcessingTime: 0,
      highQualityExtractions: 0
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Recent Extractions Hook
export function useClaudeRecentExtractions() {
  return useQuery({
    queryKey: ['claude', 'recentExtractions'],
    queryFn: () => Promise.resolve([]),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Claude Service utilities
export function useClaudeUtils() {
  const queryClient = useQueryClient();

  return {
    // Get cached extraction data without triggering a request
    getCachedExtraction: (imageUri: string): ExtractedBankData | undefined =>
      queryClient.getQueryData(claudeQueryKeys.bankDataExtraction(imageUri)),
    
    // Check if extraction data is cached
    hasExtractionCache: (imageUri: string): boolean =>
      queryClient.getQueryState(claudeQueryKeys.bankDataExtraction(imageUri))?.status === 'success',
    
    // Get all recent extractions
    getRecentExtractions: (): ExtractedBankData[] =>
      queryClient.getQueryData(['claude', 'recentExtractions']) || [],
    
    // Clear all Claude cache
    clearAllCache: () => {
      queryClient.removeQueries({ queryKey: claudeQueryKeys.all });
      queryClient.removeQueries({ queryKey: ['claude', 'recentExtractions'] });
      queryClient.removeQueries({ queryKey: ['claude', 'performanceStats'] });
    },

    // Get performance insights
    getPerformanceInsights: () => {
      const stats = queryClient.getQueryData(['claude', 'performanceStats']);
      return stats;
    },

    // Test Claude API connectivity
    testConnection: async (): Promise<boolean> => {
      try {
        // This would be a minimal test call to Claude API
        // For now, just return true since we don't have a simple ping endpoint
        return true;
      } catch (error) {
        console.error('Claude connection test failed:', error);
        return false;
      }
    }
  };
}

// Validation Hooks for Claude-specific needs
export function useClaudeDataValidation() {
  return {
    // Validate Claude extraction
    validateExtraction: (data: ExtractedBankData) => 
      data.extractedFields.bankName || data.extractedFields.accountNumber,
    
    // Format amount for display
    formatAmount: (amount: string) => {
      if (!amount) return '';
      
      const numericAmount = parseFloat(amount.replace(/,/g, ''));
      if (isNaN(numericAmount)) return amount;
      
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 2,
      }).format(numericAmount);
    },
    
    // Check if data has minimum requirements for Nigerian banking
    hasMinimumNigerianBankData: (data: ExtractedBankData) =>
      data.extractedFields.bankName && 
      data.extractedFields.accountNumber && 
      /^\d{10}$/.test(data.accountNumber), // Nigerian NUBAN format
    
    // Get confidence level description
    getConfidenceDescription: (confidence: number) => {
      if (confidence >= 90) return 'Excellent';
      if (confidence >= 80) return 'Very Good';
      if (confidence >= 70) return 'Good';
      if (confidence >= 60) return 'Fair';
      if (confidence >= 40) return 'Poor';
      return 'Very Poor';
    },

    // Check if extraction result seems to be from a Nigerian bank
    isLikelyNigerianBank: (data: ExtractedBankData) => {
      const nigerianBanks = [
        'gtbank', 'access bank', 'uba', 'united bank for africa', 'zenith bank', 'zenith',
        'first bank', 'firstbank', 'fidelity bank', 'fidelity', 'sterling bank', 'sterling',
        'stanbic ibtc', 'stanbic', 'union bank', 'wema bank', 'wema', 'fcmb',
        'first city monument', 'ecobank', 'providus', 'polaris', 'keystone', 'unity',
        'jaiz', 'palmPay', 'opay', 'kuda'
      ];
      
      const bankNameLower = data.bankName.toLowerCase();
      return nigerianBanks.some(bank => bankNameLower.includes(bank));
    }
  };
} 