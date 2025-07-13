import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExtractedBankData } from './GeminiService';
import PatternLearningService from './PatternLearningService';

interface CacheEntry {
  key: string;
  data: ExtractedBankData;
  timestamp: Date;
  accessCount: number;
  lastAccessed: Date;
  imageHash?: string;
  confidence: number;
  source: 'cloudVision' | 'gemini';
  extractionTime: number;
}

interface CacheStats {
  totalEntries: number;
  hitRate: number;
  averageConfidence: number;
  mostAccessedBanks: string[];
  cacheSize: number;
  oldestEntry: Date;
  newestEntry: Date;
}

class SmartCacheService {
  private readonly CACHE_KEY = 'smart_extraction_cache';
  private readonly STATS_KEY = 'smart_cache_stats';
  private readonly MAX_CACHE_SIZE = 500;
  private readonly MAX_AGE_HOURS = 24 * 7; // 1 week
  private readonly MIN_CONFIDENCE_TO_CACHE = 80;
  
  private cache: Map<string, CacheEntry> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0
  };
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🚀 SmartCache: Initializing intelligent cache...');
      
      // Load cached data
      const cachedData = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        this.cache = new Map(parsed.map((entry: any) => [entry.key, {
          ...entry,
          timestamp: new Date(entry.timestamp),
          lastAccessed: new Date(entry.lastAccessed)
        }]));
        
        // Clean up expired entries
        await this.cleanupExpiredEntries();
        
        console.log(`📚 Loaded ${this.cache.size} cached entries`);
      }

      // Load stats
      const cachedStats = await AsyncStorage.getItem(this.STATS_KEY);
      if (cachedStats) {
        this.stats = JSON.parse(cachedStats);
        console.log(`📊 Cache hit rate: ${this.getHitRate().toFixed(1)}%`);
      }

      this.initialized = true;
    } catch (error) {
      console.error('❌ SmartCache: Error initializing:', error);
      this.initialized = true;
    }
  }

  /**
   * Get cached extraction if available
   */
  async get(bankName: string, accountNumber: string): Promise<ExtractedBankData | null> {
    await this.initialize();
    
    const key = this.generateCacheKey(bankName, accountNumber);
    const entry = this.cache.get(key);
    
    this.stats.totalRequests++;

    if (entry && !this.isExpired(entry)) {
      // Update access stats
      entry.accessCount++;
      entry.lastAccessed = new Date();
      this.stats.hits++;
      
      console.log(`🎯 SmartCache: Cache HIT for ${bankName} ${accountNumber} (confidence: ${entry.confidence}%)`);
      
      // Save updated stats
      await this.saveStats();
      
      return entry.data;
    }

    this.stats.misses++;
    console.log(`❌ SmartCache: Cache MISS for ${bankName} ${accountNumber}`);
    
    // Remove expired entry
    if (entry && this.isExpired(entry)) {
      this.cache.delete(key);
      console.log(`🗑️ SmartCache: Removed expired entry for ${bankName}`);
    }
    
    await this.saveStats();
    return null;
  }

  /**
   * Cache successful extraction
   */
  async set(
    bankName: string,
    accountNumber: string,
    data: ExtractedBankData,
    extractionTime: number,
    source: 'cloudVision' | 'gemini',
    imageHash?: string
  ): Promise<void> {
    await this.initialize();

    // Only cache high-confidence results
    if (data.confidence < this.MIN_CONFIDENCE_TO_CACHE) {
      console.log(`⚠️ SmartCache: Confidence too low (${data.confidence}%), not caching`);
      return;
    }

    const key = this.generateCacheKey(bankName, accountNumber);
    const entry: CacheEntry = {
      key,
      data,
      timestamp: new Date(),
      accessCount: 1,
      lastAccessed: new Date(),
      imageHash,
      confidence: data.confidence,
      source,
      extractionTime
    };

    this.cache.set(key, entry);
    console.log(`💾 SmartCache: Cached ${bankName} ${accountNumber} (confidence: ${data.confidence}%)`);

    // Learn from this successful extraction
    await PatternLearningService.learnFromSuccess(data, extractionTime, source);

    // Cleanup if cache is too large
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      await this.cleanupOldEntries();
    }

    await this.saveCache();
  }

  /**
   * Preload frequently accessed patterns
   */
  async preloadFrequentPatterns(): Promise<void> {
    await this.initialize();

    const stats = await PatternLearningService.getStatistics();
    console.log(`🔄 SmartCache: Preloading patterns for ${stats.bestPerformingBanks.length} top banks`);

    // This method prepares the cache for commonly accessed patterns
    // The actual preloading happens during regular usage
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    await this.initialize();

    const entries = Array.from(this.cache.values());
    const totalEntries = entries.length;
    const hitRate = this.getHitRate();
    const averageConfidence = entries.reduce((sum, entry) => sum + entry.confidence, 0) / totalEntries || 0;

    const bankAccess = new Map<string, number>();
    entries.forEach(entry => {
      const count = bankAccess.get(entry.data.bankName) || 0;
      bankAccess.set(entry.data.bankName, count + entry.accessCount);
    });

    const mostAccessedBanks = Array.from(bankAccess.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([bank]) => bank);

    const timestamps = entries.map(entry => entry.timestamp);
    const oldestEntry = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : new Date();
    const newestEntry = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : new Date();

    return {
      totalEntries,
      hitRate,
      averageConfidence,
      mostAccessedBanks,
      cacheSize: this.estimateCacheSize(),
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const ageHours = (Date.now() - entry.timestamp.getTime()) / (1000 * 60 * 60);
    return ageHours > this.MAX_AGE_HOURS;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(bankName: string, accountNumber: string): string {
    return `${bankName.toLowerCase().replace(/\s+/g, '_')}_${accountNumber}`;
  }

  /**
   * Get hit rate percentage
   */
  private getHitRate(): number {
    if (this.stats.totalRequests === 0) return 0;
    return (this.stats.hits / this.stats.totalRequests) * 100;
  }

  /**
   * Estimate cache size in bytes
   */
  private estimateCacheSize(): number {
    const jsonString = JSON.stringify(Array.from(this.cache.values()));
    // For React Native, we'll estimate size instead of using Blob
    return jsonString.length * 2; // Approximate 2 bytes per character
  }

  /**
   * Clean up expired entries
   */
  private async cleanupExpiredEntries(): Promise<void> {
    const entriesBeforeCleanup = this.cache.size;
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }

    const entriesAfterCleanup = this.cache.size;
    const cleanedCount = entriesBeforeCleanup - entriesAfterCleanup;
    
    if (cleanedCount > 0) {
      console.log(`🧹 SmartCache: Cleaned up ${cleanedCount} expired entries`);
      await this.saveCache();
    }
  }

  /**
   * Clean up old entries when cache is full
   */
  private async cleanupOldEntries(): Promise<void> {
    const entries = Array.from(this.cache.entries());
    
    // Sort by last accessed time (oldest first)
    entries.sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime());
    
    // Remove 20% of oldest entries
    const entriesToRemove = Math.floor(entries.length * 0.2);
    
    for (let i = 0; i < entriesToRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
    
    console.log(`🧹 SmartCache: Removed ${entriesToRemove} old entries (cache size: ${this.cache.size})`);
    await this.saveCache();
  }

  /**
   * Save cache to storage
   */
  private async saveCache(): Promise<void> {
    try {
      const cacheArray = Array.from(this.cache.values());
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheArray));
    } catch (error) {
      console.error('❌ SmartCache: Error saving cache:', error);
    }
  }

  /**
   * Save stats to storage
   */
  private async saveStats(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STATS_KEY, JSON.stringify(this.stats));
    } catch (error) {
      console.error('❌ SmartCache: Error saving stats:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, totalRequests: 0 };
    await AsyncStorage.removeItem(this.CACHE_KEY);
    await AsyncStorage.removeItem(this.STATS_KEY);
    console.log('🗑️ SmartCache: All cache cleared');
  }

  /**
   * Invalidate specific cache entry
   */
  async invalidate(bankName: string, accountNumber: string): Promise<void> {
    await this.initialize();
    
    const key = this.generateCacheKey(bankName, accountNumber);
    if (this.cache.has(key)) {
      this.cache.delete(key);
      await this.saveCache();
      console.log(`🗑️ SmartCache: Invalidated cache for ${bankName} ${accountNumber}`);
    }
  }
}

export default new SmartCacheService(); 