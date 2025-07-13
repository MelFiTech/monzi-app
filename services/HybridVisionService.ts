import CloudVisionService from './CloudVisionService';
import GeminiService, { type ExtractedBankData } from './GeminiService';
import ImageOptimizationService from './ImageOptimizationService';
import SmartPromptService from './SmartPromptService';
import SmartCacheService from './SmartCacheService';
import PatternLearningService from './PatternLearningService';

interface ExtractionAttempt {
  service: 'cloudVision' | 'gemini';
  data: ExtractedBankData;
  duration: number;
  success: boolean;
}

interface ExtractionResult {
  data: ExtractedBankData;
  attempts: ExtractionAttempt[];
  primaryService: 'cloudVision' | 'gemini';
  fallbackUsed: boolean;
  totalDuration: number;
}

class HybridVisionService {
  private readonly CONFIDENCE_THRESHOLD = 85;
  private readonly PARALLEL_TIMEOUT = 8000; // 8 seconds for parallel processing
  private readonly FALLBACK_TIMEOUT = 12000; // 12 seconds for individual fallback

  /**
   * Main extraction method with smart caching
   */
  async extractBankDataWithCache(imageUri: string, bankName?: string, accountNumber?: string): Promise<ExtractedBankData> {
    // Check cache first if we have bank details
    if (bankName && accountNumber) {
      console.log('🔍 HybridVision: Checking smart cache first...');
      const cached = await SmartCacheService.get(bankName, accountNumber);
      if (cached) {
        console.log('⚡ HybridVision: Using cached result - ultra fast!');
        return cached;
      }
    }
    
    // Fallback to full extraction
    return this.extractBankData(imageUri);
  }

  /**
   * Extract bank data using optimized parallel processing for maximum speed
   * 1. Run CloudVision and Gemini in parallel (fastest approach)
   * 2. Use the first high-quality result or best available
   * 3. Implement smart caching and pattern learning
   */
  async extractBankData(imageUri: string): Promise<ExtractedBankData> {
    console.log('🚀 HybridVision: Starting super-optimized parallel bank data extraction...');
    
    const startTime = Date.now();
    const attempts: ExtractionAttempt[] = [];
    let bestResult: ExtractedBankData | null = null;
    let fallbackUsed = false;

    try {
      // STEP 1: Optimize image for faster processing
      console.log('🖼️ HybridVision: Optimizing image for AI processing...');
      let optimizedImageUri = imageUri;
      
      try {
        const optimizedImage = await ImageOptimizationService.fastOptimize(imageUri);
        optimizedImageUri = optimizedImage.uri;
        console.log(`📊 Image optimization: ${optimizedImage.compressionRatio.toFixed(1)}x smaller, ${optimizedImage.width}x${optimizedImage.height}`);
      } catch (optimizationError) {
        console.warn('⚠️ HybridVision: Image optimization failed, using original image:', optimizationError);
        // Continue with original image
      }
      
      // STEP 2: Run CloudVision and Gemini in parallel for maximum speed
      console.log('⚡ HybridVision: Running CloudVision + Gemini in parallel...');
      
      const parallelResults = await Promise.allSettled([
        this.tryWithTimeout(
          () => CloudVisionService.extractBankData(optimizedImageUri),
          this.PARALLEL_TIMEOUT,
          'CloudVision'
        ),
        this.tryWithTimeout(
          () => GeminiService.extractBankData(optimizedImageUri),
          this.PARALLEL_TIMEOUT,
          'Gemini'
        )
      ]);

      // Process CloudVision result
      const cloudVisionResult = parallelResults[0].status === 'fulfilled' 
        ? parallelResults[0].value 
        : { data: {} as ExtractedBankData, duration: 0, success: false, error: 'Promise rejected' };

      const cloudVisionAttempt: ExtractionAttempt = {
        service: 'cloudVision',
        data: cloudVisionResult.data,
        duration: cloudVisionResult.duration,
        success: cloudVisionResult.success
      };
      attempts.push(cloudVisionAttempt);

      // Process Gemini result
      const geminiResult = parallelResults[1].status === 'fulfilled' 
        ? parallelResults[1].value 
        : { data: {} as ExtractedBankData, duration: 0, success: false, error: 'Promise rejected' };

      const geminiAttempt: ExtractionAttempt = {
        service: 'gemini',
        data: geminiResult.data,
        duration: geminiResult.duration,
        success: geminiResult.success
      };
      attempts.push(geminiAttempt);

      // Analyze parallel results and choose the best
      const validResults: { service: string; data: ExtractedBankData; duration: number }[] = [];

      if (cloudVisionResult.success) {
        console.log('✅ CloudVision extraction successful');
        console.log(`📊 CloudVision confidence: ${cloudVisionResult.data.confidence}%`);
        validResults.push({ service: 'CloudVision', data: cloudVisionResult.data, duration: cloudVisionResult.duration });
      } else {
        console.warn('❌ CloudVision extraction failed:', cloudVisionResult.error);
      }

      if (geminiResult.success) {
        console.log('✅ Gemini extraction successful');
        console.log(`📊 Gemini confidence: ${geminiResult.data.confidence}%`);
        validResults.push({ service: 'Gemini', data: geminiResult.data, duration: geminiResult.duration });
      } else {
        console.warn('❌ Gemini extraction failed:', geminiResult.error);
      }

      // Choose the best result from parallel processing
      if (validResults.length > 0) {
        // First, check if any result meets the high quality threshold
        const highQualityResults = validResults.filter(r => this.isHighQualityResult(r.data));
        
        if (highQualityResults.length > 0) {
          // Use the fastest high-quality result
          const fastestGoodResult = highQualityResults.reduce((fastest, current) => 
            current.duration < fastest.duration ? current : fastest
          );
          bestResult = fastestGoodResult.data;
          console.log(`🎉 Using high-quality result from ${fastestGoodResult.service} (${fastestGoodResult.duration}ms)`);
        } else {
          // No high-quality results, choose the best available
          bestResult = validResults.reduce((best, current) => 
            this.compareResults(current.data, best.data) > 0 ? current : best
          ).data;
          console.log('⚠️ No high-quality results from parallel processing, using best available');
        }
      }

      // STEP 3: Smart caching and pattern learning
      const totalDuration = Date.now() - startTime;
      
      if (bestResult) {
        console.log('🎉 HybridVision: Extraction completed successfully');
        console.log(`📊 Final result confidence: ${bestResult.confidence}%`);
        console.log(`⏱️ Total extraction time: ${totalDuration}ms`);
        console.log(`🔧 Services used: ${attempts.map(a => a.service).join(', ')}`);
        
        // Cache the successful result
        const winningAttempt = attempts.find(a => a.success && a.data.confidence === bestResult.confidence);
        if (winningAttempt) {
          await SmartCacheService.set(
            bestResult.bankName,
            bestResult.accountNumber,
            bestResult,
            winningAttempt.duration,
            winningAttempt.service
          );
        }
        
        return this.enhanceResultWithMetadata(bestResult, {
          attempts,
          primaryService: attempts.find(a => a.success)?.service || 'cloudVision',
          fallbackUsed,
          totalDuration
        });
      } else {
        console.error('❌ HybridVision: All extraction methods failed');
        return this.createEmptyResult();
      }

    } catch (error) {
      console.error('❌ HybridVision: Unexpected error during extraction:', error);
      return this.createEmptyResult();
    }
  }

  /**
   * Execute a function with timeout protection
   */
  private async tryWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number,
    serviceName: string
  ): Promise<{ data: T; duration: number; success: boolean; error?: any }> {
    const startTime = Date.now();
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${serviceName} timeout after ${timeout}ms`)), timeout)
      );

      const data = await Promise.race([fn(), timeoutPromise]);
      const duration = Date.now() - startTime;
      
      return { data, duration, success: true };
    } catch (error) {
      const duration = Date.now() - startTime;
      return { data: {} as T, duration, success: false, error };
    }
  }

  /**
   * Check if the extraction result meets high quality standards
   */
  private isHighQualityResult(data: ExtractedBankData): boolean {
    const hasRequiredFields = data.extractedFields.bankName && data.extractedFields.accountNumber;
    const meetsConfidenceThreshold = data.confidence >= this.CONFIDENCE_THRESHOLD;
    
    return hasRequiredFields && meetsConfidenceThreshold;
  }

  /**
   * Compare two extraction results and return which is better
   * Returns: 1 if first is better, -1 if second is better, 0 if equal
   */
  private compareResults(result1: ExtractedBankData, result2: ExtractedBankData): number {
    // Calculate completeness score (0-4 based on extracted fields)
    const completeness1 = Object.values(result1.extractedFields).filter(Boolean).length;
    const completeness2 = Object.values(result2.extractedFields).filter(Boolean).length;

    // Primary comparison: completeness
    if (completeness1 !== completeness2) {
      return completeness1 > completeness2 ? 1 : -1;
    }

    // Secondary comparison: confidence
    if (Math.abs(result1.confidence - result2.confidence) > 5) {
      return result1.confidence > result2.confidence ? 1 : -1;
    }

    // Tertiary comparison: prefer results with account holder names
    if (result1.extractedFields.accountHolderName !== result2.extractedFields.accountHolderName) {
      return result1.extractedFields.accountHolderName ? 1 : -1;
    }

    return 0; // Results are equivalent
  }

  /**
   * Enhance the result with extraction metadata
   */
  private enhanceResultWithMetadata(
    data: ExtractedBankData, 
    metadata: Pick<ExtractionResult, 'attempts' | 'primaryService' | 'fallbackUsed' | 'totalDuration'>
  ): ExtractedBankData {
    // Add metadata as non-enumerable properties so they don't interfere with the data structure
    const enhancedData = { ...data };
    
    Object.defineProperty(enhancedData, '_extractionMetadata', {
      value: metadata,
      writable: false,
      enumerable: false,
      configurable: false
    });

    return enhancedData;
  }

  /**
   * Create empty result for failed extractions
   */
  private createEmptyResult(): ExtractedBankData {
    return {
      bankName: '',
      accountNumber: '',
      accountHolderName: '',
      amount: '',
      confidence: 0,
      extractedFields: {
        bankName: false,
        accountNumber: false,
        accountHolderName: false,
        amount: false,
      }
    };
  }

  /**
   * Format extracted amount for display
   */
  formatExtractedAmount(amount: string): string {
    // Delegate to the same logic as individual services
    return CloudVisionService.formatExtractedAmount(amount) || 
           GeminiService.formatExtractedAmount(amount);
  }

  /**
   * Check if extraction result is valid (combines both services' validation)
   */
  isExtractionValid(data: ExtractedBankData): boolean {
    // Use the more lenient validation between the two services
    return CloudVisionService.isExtractionValid(data) || 
           GeminiService.isExtractionValid(data);
  }

  /**
   * Get extraction metadata if available
   */
  getExtractionMetadata(data: ExtractedBankData): ExtractionResult['attempts'] | null {
    return (data as any)._extractionMetadata?.attempts || null;
  }

  /**
   * Check if fallback was used for this extraction
   */
  wasFallbackUsed(data: ExtractedBankData): boolean {
    return (data as any)._extractionMetadata?.fallbackUsed || false;
  }

  /**
   * Get the primary service used for extraction
   */
  getPrimaryService(data: ExtractedBankData): 'cloudVision' | 'gemini' | null {
    return (data as any)._extractionMetadata?.primaryService || null;
  }
}

export default new HybridVisionService(); 