import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExtractedBankData } from './';

interface CacheEntry {
  extractedData: ExtractedBankData;
  timestamp: number;
  expiresAt: number;
}

interface CacheStorage {
  [key: string]: CacheEntry;
}

class CacheService {
  private static readonly CACHE_KEY = 'scanned_bank_data_cache';
  private static readonly CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  /**
   * Generate cache key from bank data
   */
  private static generateCacheKey(accountNumber: string, bankName: string): string {
    const cleanAccountNumber = accountNumber.replace(/\s+/g, '').toLowerCase();
    const cleanBankName = bankName.replace(/\s+/g, '').toLowerCase();
    return `${cleanAccountNumber}_${cleanBankName}`;
  }

  /**
   * Load cache from AsyncStorage
   */
  private static async loadCache(): Promise<CacheStorage> {
    try {
      const cacheData = await AsyncStorage.getItem(this.CACHE_KEY);
      if (!cacheData) return {};
      
      const cache: CacheStorage = JSON.parse(cacheData);
      
      // Clean expired entries
      const now = Date.now();
      const cleanedCache: CacheStorage = {};
      
      Object.entries(cache).forEach(([key, entry]) => {
        if (entry.expiresAt > now) {
          cleanedCache[key] = entry;
        }
      });
      
      // Save cleaned cache if we removed any entries
      if (Object.keys(cleanedCache).length !== Object.keys(cache).length) {
        await this.saveCache(cleanedCache);
      }
      
      return cleanedCache;
    } catch (error) {
      console.error('Error loading cache:', error);
      return {};
    }
  }

  /**
   * Save cache to AsyncStorage
   */
  private static async saveCache(cache: CacheStorage): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  /**
   * Check if we have cached data for the given account
   */
  static async getCachedData(accountNumber: string, bankName: string): Promise<ExtractedBankData | null> {
    try {
      if (!accountNumber || !bankName) return null;
      
      const cache = await this.loadCache();
      const cacheKey = this.generateCacheKey(accountNumber, bankName);
      const entry = cache[cacheKey];
      
      if (!entry) return null;
      
      // Double-check expiration (shouldn't be necessary due to cleanup, but safety first)
      if (entry.expiresAt <= Date.now()) {
        return null;
      }
      
      console.log('🚀 Cache hit for:', cacheKey);
      return entry.extractedData;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  /**
   * Cache extracted bank data
   */
  static async cacheData(extractedData: ExtractedBankData): Promise<void> {
    try {
      if (!extractedData.accountNumber || !extractedData.bankName) {
        console.log('⚠️ Skipping cache - missing required fields');
        return;
      }
      
      const cache = await this.loadCache();
      const cacheKey = this.generateCacheKey(extractedData.accountNumber, extractedData.bankName);
      
      const now = Date.now();
      const entry: CacheEntry = {
        extractedData,
        timestamp: now,
        expiresAt: now + this.CACHE_DURATION_MS,
      };
      
      cache[cacheKey] = entry;
      await this.saveCache(cache);
      
      console.log('💾 Cached data for:', cacheKey);
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  /**
   * Clear all cached data
   */
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CACHE_KEY);
      console.log('🗑️ Cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{ totalEntries: number; oldestEntry: number | null; newestEntry: number | null }> {
    try {
      const cache = await this.loadCache();
      const entries = Object.values(cache);
      
      if (entries.length === 0) {
        return { totalEntries: 0, oldestEntry: null, newestEntry: null };
      }
      
      const timestamps = entries.map(entry => entry.timestamp);
      
      return {
        totalEntries: entries.length,
        oldestEntry: Math.min(...timestamps),
        newestEntry: Math.max(...timestamps),
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalEntries: 0, oldestEntry: null, newestEntry: null };
    }
  }

  /**
   * Check if extracted data can be used as cache key
   */
  static canCache(extractedData: ExtractedBankData): boolean {
    return !!(extractedData.accountNumber && extractedData.bankName);
  }

  /**
   * Attempt to find cached data using basic image analysis patterns
   * This is a simple heuristic approach for demo purposes
   */
  static async findSimilarCachedData(extractedData: ExtractedBankData): Promise<ExtractedBankData | null> {
    try {
      const cache = await this.loadCache();
      
      // Try exact match first
      if (extractedData.accountNumber && extractedData.bankName) {
        const exactMatch = await this.getCachedData(extractedData.accountNumber, extractedData.bankName);
        if (exactMatch) return exactMatch;
      }
      
      // Try partial matches if exact match fails
      const cacheEntries = Object.values(cache);
      
      for (const entry of cacheEntries) {
        const cached = entry.extractedData;
        
        // Match by account number similarity (in case OCR variations)
        if (extractedData.accountNumber && cached.accountNumber) {
          const similarity = this.calculateStringSimilarity(
            extractedData.accountNumber.replace(/\s+/g, ''),
            cached.accountNumber.replace(/\s+/g, '')
          );
          
          if (similarity > 0.85) { // 85% similarity threshold
            console.log('🎯 Similar cache entry found with', Math.round(similarity * 100) + '% similarity');
            return cached;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding similar cached data:', error);
      return null;
    }
  }

  /**
   * Calculate string similarity (simple Levenshtein-based approach)
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

export default CacheService; 