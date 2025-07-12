import { useMutation } from '@tanstack/react-query';
import { EnhancedVisionService, type EnhancedExtractedBankData, type ProcessingStep } from '@/services/EnhancedVisionService';

export interface UseEnhancedVisionOptions {
  onProgress?: (step: ProcessingStep) => void;
  onQuickPreview?: (preview: { hasText: boolean; preview: string; confidence: number }) => void;
}

export function useEnhancedVisionExtractBankData(options: UseEnhancedVisionOptions = {}) {
  const { onProgress, onQuickPreview } = options;

  return useMutation({
    mutationFn: async (imageUri: string): Promise<EnhancedExtractedBankData> => {
      const service = EnhancedVisionService.getInstance();
      
      // Optional: Get quick preview for immediate feedback
      if (onQuickPreview) {
        try {
          const quickResult = await service.quickLocalExtraction(imageUri);
          onQuickPreview(quickResult);
        } catch (error) {
          console.warn('Quick preview failed:', error);
        }
      }
      
      // Main extraction with progress tracking
      return await service.extractBankData(imageUri, onProgress);
    },
    retry: 1,
    retryDelay: 2000,
  });
}

export function useQuickLocalExtraction() {
  return useMutation({
    mutationFn: async (imageUri: string) => {
      const service = EnhancedVisionService.getInstance();
      return await service.quickLocalExtraction(imageUri);
    },
    retry: 0, // No retry for quick extraction
  });
} 