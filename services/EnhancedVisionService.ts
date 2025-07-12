import { Config } from '../constants/config';

// Conditional imports for native modules to handle Expo Go compatibility
let ImageResizer: any = null;
let scanOCR: any = null;

try {
  ImageResizer = require('@bam.tech/react-native-image-resizer').default;
} catch (error) {
  console.warn('⚠️ Image resizer module not available - running in Expo Go mode');
}

try {
  scanOCR = require('vision-camera-ocr').scanOCR;
} catch (error) {
  console.warn('⚠️ OCR module not available - running in Expo Go mode');
}

export interface EnhancedExtractedBankData {
  accountNumber: string;
  bankName: string;
  amount?: string;
  confidence: number;
  extractionMethod: 'local_ocr' | 'api_hybrid' | 'api_only';
  processingTime: number;
  rawText?: string;
}

export interface OCRResult {
  result: {
    text: string;
    blocks?: Array<{
      text: string;
      frame: { x: number; y: number; width: number; height: number };
      confidence?: number;
    }>;
  };
}

export interface ProcessingStep {
  step: string;
  status: 'starting' | 'completed' | 'failed';
  duration?: number;
  data?: any;
}

export class EnhancedVisionService {
  private static instance: EnhancedVisionService;
  private baseUrl: string;

  constructor() {
    this.baseUrl = Config.API.getBaseUrl();
  }

  public static getInstance(): EnhancedVisionService {
    if (!EnhancedVisionService.instance) {
      EnhancedVisionService.instance = new EnhancedVisionService();
    }
    return EnhancedVisionService.instance;
  }

  /**
   * Compress image for faster processing
   */
  private async compressImage(
    imageUri: string,
    onProgress?: (step: ProcessingStep) => void
  ): Promise<string> {
    const startTime = Date.now();
    
    onProgress?.({
      step: 'Image Compression',
      status: 'starting'
    });

    // Check if ImageResizer module is available
    if (!ImageResizer) {
      const duration = Date.now() - startTime;
      
      onProgress?.({
        step: 'Image Compression',
        status: 'completed',
        duration,
        data: {
          originalSize: 'Unknown',
          compressedSize: 'Skipped (Expo Go)',
          compressionRatio: 'N/A'
        }
      });
      
      console.warn('⚠️ Image resizer not available - using original image');
      return imageUri; // Return original image if resizer not available
    }

    try {
      const compressedImage = await ImageResizer.createResizedImage(
        imageUri,
        1024, // max width
        1024, // max height
        'JPEG',
        80, // quality
        0, // rotation
        undefined, // output path
        false, // keep metadata
        {
          mode: 'contain',
          onlyScaleDown: true,
        }
      );

      const duration = Date.now() - startTime;
      
      onProgress?.({
        step: 'Image Compression',
        status: 'completed',
        duration,
        data: {
          originalSize: 'Unknown',
          compressedSize: 'Optimized',
          compressionRatio: 'Optimized for speed'
        }
      });

      console.log('📐 Image compressed successfully:', {
        originalUri: imageUri.substring(0, 50) + '...',
        compressedUri: compressedImage.uri.substring(0, 50) + '...',
        duration: `${duration}ms`
      });

      return compressedImage.uri;
    } catch (error) {
      onProgress?.({
        step: 'Image Compression',
        status: 'failed',
        duration: Date.now() - startTime
      });
      
      console.warn('⚠️ Image compression failed, using original:', error);
      return imageUri; // Fallback to original image
    }
  }

  /**
   * Perform local OCR using ML Kit
   */
  private async performLocalOCR(
    imageUri: string,
    onProgress?: (step: ProcessingStep) => void
  ): Promise<{ text: string; confidence: number; blocks?: any[] }> {
    const startTime = Date.now();
    
    onProgress?.({
      step: 'Local OCR Processing',
      status: 'starting'
    });

    // Check if OCR module is available
    if (!scanOCR) {
      const duration = Date.now() - startTime;
      onProgress?.({
        step: 'Local OCR Processing',
        status: 'failed',
        duration
      });
      
      console.warn('⚠️ OCR module not available - skipping local OCR');
      throw new Error('OCR module not available in Expo Go');
    }

    try {
      const ocrResult: OCRResult = await scanOCR(imageUri, {
        language: 'en'
      });

      const duration = Date.now() - startTime;
      const extractedText = ocrResult.result.text;
      const blocks = ocrResult.result.blocks || [];
      
      // Calculate average confidence from blocks
      const avgConfidence = blocks.length > 0 
        ? blocks.reduce((sum, block) => sum + (block.confidence || 0), 0) / blocks.length
        : 0.8; // Default confidence for successful extraction

      onProgress?.({
        step: 'Local OCR Processing',
        status: 'completed',
        duration,
        data: {
          textLength: extractedText.length,
          blocksFound: blocks.length,
          confidence: avgConfidence
        }
      });

      console.log('🔍 Local OCR completed:', {
        textLength: extractedText.length,
        blocksFound: blocks.length,
        duration: `${duration}ms`,
        confidence: avgConfidence
      });

      return {
        text: extractedText,
        confidence: avgConfidence,
        blocks
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      onProgress?.({
        step: 'Local OCR Processing',
        status: 'failed',
        duration
      });
      
      console.warn('⚠️ Local OCR failed:', error);
      throw error;
    }
  }

  /**
   * Extract bank details from OCR text using regex patterns
   */
  private extractBankDetailsFromText(text: string): {
    accountNumber?: string;
    bankName?: string;
    amount?: string;
    confidence: number;
  } {
    console.log('🔍 Analyzing OCR text for bank details...');
    
    const results = {
      accountNumber: undefined as string | undefined,
      bankName: undefined as string | undefined,
      amount: undefined as string | undefined,
      confidence: 0
    };

    // Account number patterns (10 digits)
    const accountPatterns = [
      /\b(\d{10})\b/g,
      /Account\s*:?\s*(\d{10})/gi,
      /A\/C\s*:?\s*(\d{10})/gi,
    ];

    // Nigerian bank name patterns
    const bankPatterns = [
      /(?:access|first|gtb|uba|zenith|fidelity|sterling|unity|polaris|stanbic|fcmb|jaiz|providus|keystone|suntrust|taj|parallex|globus|premium|palmcredit|palmaccess|palmpay|opay|kuda|carbon|moniepoint)/gi,
      /(?:first\s*bank|access\s*bank|guaranty\s*trust|united\s*bank|zenith\s*bank|fidelity\s*bank|sterling\s*bank|unity\s*bank|polaris\s*bank|stanbic\s*ibtc|fcmb|jaiz\s*bank|providus\s*bank|keystone\s*bank|suntrust\s*bank|taj\s*bank)/gi
    ];

    // Amount patterns
    const amountPatterns = [
      /(?:₦|N|NGN)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:₦|N|NGN)/gi,
      /Amount\s*:?\s*(?:₦|N|NGN)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi
    ];

    let confidenceScore = 0;

    // Extract account number
    for (const pattern of accountPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        results.accountNumber = matches[0].replace(/\D/g, '');
        confidenceScore += 30;
        console.log('✅ Account number found:', results.accountNumber);
        break;
      }
    }

    // Extract bank name
    for (const pattern of bankPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        results.bankName = matches[0].toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        confidenceScore += 25;
        console.log('✅ Bank name found:', results.bankName);
        break;
      }
    }

    // Extract amount
    for (const pattern of amountPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        results.amount = matches[0].replace(/[₦NGN]/gi, '').trim();
        confidenceScore += 15;
        console.log('✅ Amount found:', results.amount);
        break;
      }
    }

    results.confidence = Math.min(confidenceScore, 100);

    console.log('📊 Bank details extraction results:', {
      accountNumber: results.accountNumber ? '✅' : '❌',
      bankName: results.bankName ? '✅' : '❌',
      amount: results.amount ? '✅' : '❌',
      confidence: results.confidence
    });

    return results;
  }

  /**
   * Enhanced hybrid processing combining local OCR + API
   */
  async extractBankData(
    imageUri: string,
    onProgress?: (step: ProcessingStep) => void
  ): Promise<EnhancedExtractedBankData> {
    const overallStartTime = Date.now();
    console.log('🚀 Starting enhanced bank data extraction...');

    try {
      // Step 1: Compress image for faster processing
      const compressedImageUri = await this.compressImage(imageUri, onProgress);

      // Step 2: Try local OCR first (fastest)
      let localResult: { text: string; confidence: number; blocks?: any[] } | null = null;
      
      try {
        localResult = await this.performLocalOCR(compressedImageUri, onProgress);
        
        // Extract bank details from local OCR
        const localBankDetails = this.extractBankDetailsFromText(localResult.text);
        
        // If local OCR found good results, use them
        if (localBankDetails.confidence >= 50 && localBankDetails.accountNumber && localBankDetails.bankName) {
          const totalDuration = Date.now() - overallStartTime;
          
          console.log('🎯 Local OCR extraction successful! Using local results.');
          
          return {
            accountNumber: localBankDetails.accountNumber,
            bankName: localBankDetails.bankName,
            amount: localBankDetails.amount || '',
            confidence: localBankDetails.confidence,
            extractionMethod: 'local_ocr',
            processingTime: totalDuration,
            rawText: localResult.text
          };
        }
        
        console.log('⚠️ Local OCR results insufficient, falling back to API...');
      } catch (localError) {
        console.warn('⚠️ Local OCR failed, falling back to API:', localError);
      }

      // Step 3: Fallback to API (existing hybrid service)
      onProgress?.({
        step: 'API Extraction',
        status: 'starting'
      });

      const apiStartTime = Date.now();
      
      // Import and use existing hybrid service
      const { default: HybridVisionService } = await import('./HybridVisionService');
      const apiResult = await HybridVisionService.extractBankData(compressedImageUri);
      
      const apiDuration = Date.now() - apiStartTime;
      const totalDuration = Date.now() - overallStartTime;
      
      onProgress?.({
        step: 'API Extraction',
        status: 'completed',
        duration: apiDuration,
        data: apiResult
      });

      console.log('🎯 API extraction completed as fallback');
      
      return {
        accountNumber: apiResult.accountNumber,
        bankName: apiResult.bankName,
        amount: apiResult.amount || '',
        confidence: apiResult.confidence,
        extractionMethod: localResult ? 'api_hybrid' : 'api_only',
        processingTime: totalDuration,
        rawText: localResult?.text || undefined
      };

    } catch (error) {
      const totalDuration = Date.now() - overallStartTime;
      
      console.error('❌ Enhanced extraction failed completely:', error);
      
      // Return empty result with error info
      return {
        accountNumber: '',
        bankName: '',
        amount: '',
        confidence: 0,
        extractionMethod: 'api_only',
        processingTime: totalDuration,
        rawText: undefined
      };
    }
  }

  /**
   * Quick local-only extraction for immediate feedback
   */
  async quickLocalExtraction(imageUri: string): Promise<{
    hasText: boolean;
    preview: string;
    confidence: number;
  }> {
    try {
      console.log('⚡ Quick local extraction for preview...');
      
      // Check if OCR module is available
      if (!scanOCR) {
        console.warn('⚠️ OCR module not available - skipping quick extraction');
        return {
          hasText: false,
          preview: 'Processing via API...',
          confidence: 0
        };
      }
      
      const result = await this.performLocalOCR(imageUri);
      const preview = result.text.substring(0, 100) + (result.text.length > 100 ? '...' : '');
      
      return {
        hasText: result.text.length > 10,
        preview,
        confidence: result.confidence
      };
    } catch (error) {
      console.warn('⚠️ Quick extraction failed:', error);
      return {
        hasText: false,
        preview: 'Processing...',
        confidence: 0
      };
    }
  }
} 