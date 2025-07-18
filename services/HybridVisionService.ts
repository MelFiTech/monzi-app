import CloudVisionService from './CloudVisionService';
import GeminiService from './GeminiService';
import OpenAIService from './OpenAIService';
import { type ExtractedBankData } from './GeminiService';
import ImageOptimizationService from './ImageOptimizationService';
import SmartPromptService from './SmartPromptService';
import PatternLearningService from './PatternLearningService';

interface ExtractionAttempt {
  service: 'cloudVision' | 'gemini' | 'openai';
  data: ExtractedBankData;
  duration: number;
  success: boolean;
}

interface ExtractionResult {
  data: ExtractedBankData;
  attempts: ExtractionAttempt[];
  primaryService: 'cloudVision' | 'gemini' | 'openai';
  fallbackUsed: boolean;
  totalDuration: number;
}

class HybridVisionService {
  private readonly CONFIDENCE_THRESHOLD = 85;
  private readonly PARALLEL_TIMEOUT = 15000; // 15 seconds for CloudVision processing
  private readonly FALLBACK_TIMEOUT = 20000; // 20 seconds for individual fallback
  private geminiService: GeminiService;
  private openaiService: OpenAIService;

  constructor() {
    this.geminiService = new GeminiService();
    this.openaiService = new OpenAIService();
  }

  /**
   * Main extraction method - ALWAYS FRESH DATA, NO CACHING
   */
  async extractBankDataWithCache(imageUri: string, bankName?: string, accountNumber?: string): Promise<ExtractedBankData> {
    console.log('🔄 HybridVision: ALWAYS FRESH EXTRACTION - NO CACHE USED');
    // Always do full fresh extraction
    return this.extractBankData(imageUri);
  }

  /**
   * Extract bank data using CloudVision OCR and parsing logic
   * ALWAYS FRESH EXTRACTION - NO CACHING, NO OLD DATA
   * Optimized for Nigerian bank document extraction
   */
  async extractBankData(imageUri: string): Promise<ExtractedBankData> {
    console.log('🚀 HybridVision: Starting FRESH bank data extraction - NO CACHED DATA USED...');
    console.log('🔄 FRESH DATA GUARANTEE: Every scan processes new data, no old values returned');
    
    const startTime = Date.now();
    const attempts: ExtractionAttempt[] = [];
    let bestResult: ExtractedBankData | null = null;

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
      
      // STEP 2: Run CloudVision extraction (primary)
      console.log('⚡ HybridVision: Running CloudVision extraction...');
      
      const cloudVisionResult = await this.tryWithTimeout(
        () => CloudVisionService.extractBankData(optimizedImageUri),
        this.PARALLEL_TIMEOUT,
        'CloudVision'
      );

      const cloudVisionAttempt: ExtractionAttempt = {
        service: 'cloudVision',
        data: cloudVisionResult.data,
        duration: cloudVisionResult.duration,
        success: cloudVisionResult.success
      };
      attempts.push(cloudVisionAttempt);

      // Process CloudVision result
      if (cloudVisionResult.success && this.isHighQualityResult(cloudVisionResult.data)) {
        console.log('✅ CloudVision extraction successful with high quality');
        console.log(`📊 CloudVision confidence: ${cloudVisionResult.data.confidence}%`);
        bestResult = cloudVisionResult.data;
      } else {
        if (cloudVisionResult.success) {
          console.log(`⚠️ CloudVision extraction successful but low quality (confidence: ${cloudVisionResult.data.confidence}%)`);
          
          // Check if CloudVision returned empty data (no text detected)
          const hasAnyData = cloudVisionResult.data.bankName || 
                           cloudVisionResult.data.accountNumber || 
                           cloudVisionResult.data.accountHolderName || 
                           cloudVisionResult.data.amount;
          
          if (!hasAnyData && cloudVisionResult.data.confidence === 0) {
            console.log('🚫 CloudVision: No text detected in image - stopping extraction to save costs');
            console.log('💰 Cost optimization: Not sending to OpenAI/Gemini when no text is detected');
            
            // Return empty result immediately - no need to try expensive AI services
            const totalDuration = Date.now() - startTime;
            console.log('🎉 HybridVision: Extraction stopped early due to no text detection');
            console.log(`⏱️ Total extraction time: ${totalDuration}ms`);
            console.log(`🔧 Services used: cloudVision only`);
            console.log(`🔄 Fallback used: No (cost optimization)`);
            
            return this.enhanceResultWithMetadata(this.createEmptyResult(), {
              attempts: [cloudVisionAttempt],
              primaryService: 'cloudVision',
              fallbackUsed: false,
              totalDuration
            });
          }
          
          bestResult = cloudVisionResult.data; // Keep as fallback
        } else {
          console.warn('❌ CloudVision extraction failed:', cloudVisionResult.error);
          
          // Check if CloudVision failed due to no text detected
          const errorMessage = cloudVisionResult.error?.message || '';
          if (errorMessage.includes('No text detected') || errorMessage.includes('No text found')) {
            console.log('🚫 CloudVision: No text detected in image - stopping extraction to save costs');
            console.log('💰 Cost optimization: Not sending to OpenAI/Gemini when no text is detected');
            
            // Return empty result immediately - no need to try expensive AI services
            const totalDuration = Date.now() - startTime;
            console.log('🎉 HybridVision: Extraction stopped early due to no text detection');
            console.log(`⏱️ Total extraction time: ${totalDuration}ms`);
            console.log(`🔧 Services used: cloudVision only`);
            console.log(`🔄 Fallback used: No (cost optimization)`);
            
            return this.enhanceResultWithMetadata(this.createEmptyResult(), {
              attempts: [cloudVisionAttempt],
              primaryService: 'cloudVision',
              fallbackUsed: false,
              totalDuration
            });
          }
          
          // If CloudVision failed for other reasons, also stop to save costs
          console.log('🚫 CloudVision: Failed for other reasons - stopping extraction to save costs');
          console.log('💰 Cost optimization: Not sending to OpenAI/Gemini when CloudVision fails');
          
          const totalDuration = Date.now() - startTime;
          console.log('🎉 HybridVision: Extraction stopped early due to CloudVision failure');
          console.log(`⏱️ Total extraction time: ${totalDuration}ms`);
          console.log(`🔧 Services used: cloudVision only`);
          console.log(`🔄 Fallback used: No (cost optimization)`);
          
          return this.enhanceResultWithMetadata(this.createEmptyResult(), {
            attempts: [cloudVisionAttempt],
            primaryService: 'cloudVision',
            fallbackUsed: false,
            totalDuration
          });
        }

        // Only try OpenAI/Gemini if CloudVision found some text but quality is low
        if (cloudVisionResult.success) {
          // STEP 3: Try OpenAI as primary refinement using CloudVision context
          console.log('🤖 HybridVision: Running OpenAI context-aware refinement...');
          console.log('📋 Passing CloudVision result to OpenAI for context:', cloudVisionResult.data);
          
          const openaiResult = await this.tryWithTimeout(
            () => this.openaiService.extractBankDataWithContext(optimizedImageUri, cloudVisionResult.data),
            this.FALLBACK_TIMEOUT,
            'OpenAI'
          );

          const openaiAttempt: ExtractionAttempt = {
            service: 'openai',
            data: openaiResult.data as ExtractedBankData,
            duration: openaiResult.duration,
            success: openaiResult.success
          };
          attempts.push(openaiAttempt);

          // Compare OpenAI result with CloudVision result
          if (openaiResult.success) {
            const openaiData = openaiResult.data as ExtractedBankData;
            console.log('✅ OpenAI extraction successful');
            console.log(`📊 OpenAI confidence: ${openaiData.confidence}%`);
            
            // Use the better result
            if (!bestResult || this.compareResults(openaiData, bestResult) > 0) {
              console.log('🏆 OpenAI result is better, using OpenAI data');
              bestResult = openaiData;
            } else {
              console.log('🏆 CloudVision result is better, keeping CloudVision data');
            }
          } else {
            console.warn('❌ OpenAI extraction failed:', openaiResult.error);
            
            // STEP 4: Try Gemini as fallback when OpenAI fails
            console.log('🤖 HybridVision: OpenAI failed, trying Gemini as fallback...');
            console.log('📋 Passing CloudVision result to Gemini for context:', cloudVisionResult.data);
            
            const geminiResult = await this.tryWithTimeout(
              () => this.geminiService.extractBankDataWithContext(optimizedImageUri, cloudVisionResult.data),
              this.FALLBACK_TIMEOUT,
              'Gemini'
            );

            const geminiAttempt: ExtractionAttempt = {
              service: 'gemini',
              data: geminiResult.data as ExtractedBankData,
              duration: geminiResult.duration,
              success: geminiResult.success
            };
            attempts.push(geminiAttempt);

            // Use Gemini result if successful
            if (geminiResult.success) {
              const geminiData = geminiResult.data as ExtractedBankData;
              console.log('✅ Gemini extraction successful');
              console.log(`📊 Gemini confidence: ${geminiData.confidence}%`);
              
              // Use the better result
              if (!bestResult || this.compareResults(geminiData, bestResult) > 0) {
                console.log('🏆 Gemini result is better, using Gemini data');
                bestResult = geminiData;
              } else {
                console.log('🏆 CloudVision result is better, keeping CloudVision data');
              }
            } else {
              console.warn('❌ Gemini extraction failed:', geminiResult.error);
            }
          }
        }
      }

      // STEP 5: Return results
      const totalDuration = Date.now() - startTime;
      
      if (bestResult) {
        const fallbackUsed = attempts.length > 1;
        const primaryService = attempts.find(a => a.success)?.service || 'cloudVision';
        
        console.log('🎉 HybridVision: Extraction completed successfully');
        console.log(`📊 Final result confidence: ${bestResult.confidence}%`);
        console.log(`⏱️ Total extraction time: ${totalDuration}ms`);
        console.log(`🔧 Services used: ${attempts.map(a => a.service).join(', ')}`);
        console.log(`🔄 Fallback used: ${fallbackUsed ? 'Yes' : 'No'}`);
        
        return this.enhanceResultWithMetadata(bestResult, {
          attempts,
          primaryService,
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
      console.log(`⏱️ ${serviceName}: Starting with ${timeout}ms timeout...`);
      
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => {
          console.warn(`⚠️ ${serviceName}: Timeout after ${timeout}ms`);
          reject(new Error(`${serviceName} timeout after ${timeout}ms`));
        }, timeout)
      );

      const data = await Promise.race([fn(), timeoutPromise]);
      const duration = Date.now() - startTime;
      
      console.log(`✅ ${serviceName}: Completed in ${duration}ms`);
      return { data, duration, success: true };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ ${serviceName}: Failed after ${duration}ms:`, error);
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
    if (!amount) return '';
    
    // Remove currency symbols and extra spaces
    const cleaned = amount.replace(/[₦$€£¥₹,]/g, '').trim();
    
    // Extract numeric value
    const numericMatch = cleaned.match(/[\d,]+\.?\d*/);
    if (numericMatch) {
      return numericMatch[0].replace(/,/g, '');
    }
    
    return '';
  }

  /**
   * Check if extraction result is valid
   */
  isExtractionValid(data: ExtractedBankData): boolean {
    return data.extractedFields.bankName && data.extractedFields.accountNumber && data.confidence > 0;
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
  getPrimaryService(data: ExtractedBankData): 'cloudVision' | 'gemini' | 'openai' | null {
    return (data as any)._extractionMetadata?.primaryService || null;
  }
}

export default new HybridVisionService(); 