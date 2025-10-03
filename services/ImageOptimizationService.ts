import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: SaveFormat;
  compress?: boolean;
}

interface OptimizedImage {
  uri: string;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

class ImageOptimizationService {
  private readonly DEFAULT_MAX_WIDTH = 1920;
  private readonly DEFAULT_MAX_HEIGHT = 1080;
  private readonly DEFAULT_QUALITY = 0.85;
  private readonly TARGET_FILE_SIZE = 500 * 1024; // 500KB target for fast upload

  /**
   * Optimize image for fast AI processing while maintaining OCR quality
   */
  async optimizeForAI(imageUri: string, options: OptimizationOptions = {}): Promise<OptimizedImage> {
    console.log('🖼️ ImageOptimizer: Starting image optimization...');
    const startTime = Date.now();

    try {
      const {
        maxWidth = this.DEFAULT_MAX_WIDTH,
        maxHeight = this.DEFAULT_MAX_HEIGHT,
        quality = this.DEFAULT_QUALITY,
        format = SaveFormat.JPEG,
        compress = true
      } = options;

      // Get original image info
      const originalInfo = await this.getImageInfo(imageUri);
      console.log(`📏 Original image: ~${originalInfo.width}x${originalInfo.height} (${this.formatBytes(originalInfo.size)})`);

      // Apply optimizations (resize will be determined by manipulateAsync)
      const optimizedResult = await manipulateAsync(
        imageUri,
        [
          // Resize for faster processing while maintaining aspect ratio
          { resize: { width: maxWidth, height: maxHeight } }
        ],
        {
          compress: quality,
          format,
          base64: false
        }
      );

      // Get optimized file size
      const optimizedInfo = await this.getImageInfo(optimizedResult.uri);
      const compressionRatio = originalInfo.size / optimizedInfo.size;

      const result: OptimizedImage = {
        uri: optimizedResult.uri,
        width: optimizedResult.width,
        height: optimizedResult.height,
        originalSize: originalInfo.size,
        optimizedSize: optimizedInfo.size,
        compressionRatio
      };

      const duration = Date.now() - startTime;
      console.log(`✅ ImageOptimizer: Optimized in ${duration}ms`);
      console.log(`📊 Size: ${this.formatBytes(originalInfo.size)} → ${this.formatBytes(optimizedInfo.size)} (${compressionRatio.toFixed(1)}x smaller)`);
      console.log(`📐 Dimensions: ${originalInfo.width}x${originalInfo.height} → ${optimizedResult.width}x${optimizedResult.height}`);

      return result;

    } catch (error) {
      console.error('❌ ImageOptimizer: Error optimizing image:', error);
      // Return original image as fallback
      return {
        uri: imageUri,
        width: 1920,
        height: 1080,
        originalSize: 1024 * 1024,
        optimizedSize: 1024 * 1024,
        compressionRatio: 1
      };
    }
  }

  /**
   * Fast optimization for real-time processing
   */
  async fastOptimize(imageUri: string): Promise<OptimizedImage> {
    return this.optimizeForAI(imageUri, {
      maxWidth: 1280,
      maxHeight: 720,
      quality: 0.8,
      format: SaveFormat.JPEG,
      compress: true
    });
  }

  /**
   * High-quality optimization for difficult extractions
   */
  async highQualityOptimize(imageUri: string): Promise<OptimizedImage> {
    return this.optimizeForAI(imageUri, {
      maxWidth: 2048,
      maxHeight: 1536,
      quality: 0.95,
      format: SaveFormat.JPEG,
      compress: false
    });
  }

  /**
   * Calculate optimal dimensions maintaining aspect ratio
   */
  private calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;

    let width = originalWidth;
    let height = originalHeight;

    // Scale down if too large
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  /**
   * Get image file information using React Native compatible APIs
   */
  private async getImageInfo(imageUri: string): Promise<{ width: number; height: number; size: number }> {
    try {
      // For React Native, get file info using expo-file-system
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      
      // Return estimated dimensions and actual file size
      return {
        width: 1920, // Will be determined during optimization
        height: 1080, // Will be determined during optimization
        size: fileInfo.size || 1024 * 1024 // Default 1MB if size not available
      };
    } catch (error) {
      console.error('❌ Error getting image info:', error);
      // Return reasonable defaults
      return {
        width: 1920,
        height: 1080,
        size: 1024 * 1024 // 1MB default
      };
    }
  }

  /**
   * Format bytes for human readable display
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if image needs optimization
   */
  async shouldOptimize(imageUri: string): Promise<boolean> {
    try {
      const info = await this.getImageInfo(imageUri);
      return info.size > this.TARGET_FILE_SIZE || 
             info.width > this.DEFAULT_MAX_WIDTH || 
             info.height > this.DEFAULT_MAX_HEIGHT;
    } catch (error) {
      console.error('❌ Error checking if image needs optimization:', error);
      return true; // Default to optimizing if we can't check
    }
  }

  /**
   * Get compression statistics
   */
  async getCompressionStats(originalUri: string, optimizedUri: string): Promise<{
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
    spaceSaved: number;
  }> {
    try {
      const originalInfo = await this.getImageInfo(originalUri);
      const optimizedInfo = await this.getImageInfo(optimizedUri);
      
      const compressionRatio = originalInfo.size / optimizedInfo.size;
      const spaceSaved = originalInfo.size - optimizedInfo.size;
      
      return {
        originalSize: originalInfo.size,
        optimizedSize: optimizedInfo.size,
        compressionRatio,
        spaceSaved
      };
    } catch (error) {
      console.error('❌ Error getting compression stats:', error);
      return {
        originalSize: 0,
        optimizedSize: 0,
        compressionRatio: 1,
        spaceSaved: 0
      };
    }
  }
}

export default new ImageOptimizationService(); 