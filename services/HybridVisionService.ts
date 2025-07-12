import CloudVisionService from './CloudVisionService';
import GeminiService, { type ExtractedBankData } from './GeminiService';

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
  private readonly CLOUD_VISION_TIMEOUT = 10000; // 10 seconds
  private readonly GEMINI_TIMEOUT = 15000; // 15 seconds

  /**
   * Extract bank data using intelligent service selection
   * 1. Try CloudVision first (faster, more accurate for structured documents)
   * 2. If confidence < threshold, try Gemini as fallback
   * 3. Return the best result based on confidence and completeness
   */
  async extractBankData(imageUri: string): Promise<ExtractedBankData> {
    console.log('🎯 HybridVision: Starting intelligent bank data extraction...');
    
    const startTime = Date.now();
    const attempts: ExtractionAttempt[] = [];
    let bestResult: ExtractedBankData | null = null;
    let fallbackUsed = false;

    try {
      // STEP 1: Try CloudVision first
      console.log('1️⃣ HybridVision: Trying CloudVision API...');
      const cloudVisionResult = await this.tryWithTimeout(
        () => CloudVisionService.extractBankData(imageUri),
        this.CLOUD_VISION_TIMEOUT,
        'CloudVision'
      );

      const cloudVisionAttempt: ExtractionAttempt = {
        service: 'cloudVision',
        data: cloudVisionResult.data,
        duration: cloudVisionResult.duration,
        success: cloudVisionResult.success
      };
      attempts.push(cloudVisionAttempt);

      if (cloudVisionResult.success) {
        console.log('✅ HybridVision: CloudVision extraction successful');
        console.log(`📊 CloudVision confidence: ${cloudVisionResult.data.confidence}%`);
        
        // Check if CloudVision result meets our quality threshold
        if (this.isHighQualityResult(cloudVisionResult.data)) {
          console.log('🎉 HybridVision: CloudVision result meets quality threshold, using as final result');
          bestResult = cloudVisionResult.data;
        } else {
          console.log('⚠️ HybridVision: CloudVision result below quality threshold, will try Gemini fallback');
          bestResult = cloudVisionResult.data; // Keep as backup
        }
      } else {
        console.warn('❌ HybridVision: CloudVision extraction failed:', cloudVisionResult.error);
      }

      // STEP 2: Try Gemini if CloudVision didn't meet quality threshold or failed
      if (!bestResult || !this.isHighQualityResult(bestResult)) {
        console.log('2️⃣ HybridVision: Trying Gemini API as fallback...');
        fallbackUsed = true;

        const geminiResult = await this.tryWithTimeout(
          () => GeminiService.extractBankData(imageUri),
          this.GEMINI_TIMEOUT,
          'Gemini'
        );

        const geminiAttempt: ExtractionAttempt = {
          service: 'gemini',
          data: geminiResult.data,
          duration: geminiResult.duration,
          success: geminiResult.success
        };
        attempts.push(geminiAttempt);

        if (geminiResult.success) {
          console.log('✅ HybridVision: Gemini extraction successful');
          console.log(`📊 Gemini confidence: ${geminiResult.data.confidence}%`);
          
          // Compare results and choose the best one
          if (!bestResult || this.compareResults(geminiResult.data, bestResult) > 0) {
            console.log('🔄 HybridVision: Gemini result is better, using as final result');
            bestResult = geminiResult.data;
          } else {
            console.log('🔄 HybridVision: CloudVision result is still better, keeping it');
          }
        } else {
          console.warn('❌ HybridVision: Gemini extraction also failed:', geminiResult.error);
        }
      }

      // STEP 3: Return the best result or empty data if all failed
      const totalDuration = Date.now() - startTime;
      
      if (bestResult) {
        console.log('🎉 HybridVision: Extraction completed successfully');
        console.log(`📊 Final result confidence: ${bestResult.confidence}%`);
        console.log(`⏱️ Total extraction time: ${totalDuration}ms`);
        console.log(`🔧 Services used: ${attempts.map(a => a.service).join(' → ')}`);
        
        return this.enhanceResultWithMetadata(bestResult, {
          attempts,
          primaryService: attempts[0]?.service || 'cloudVision',
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