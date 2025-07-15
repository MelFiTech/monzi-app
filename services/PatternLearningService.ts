import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExtractedBankData } from './GeminiService';

interface PatternMatch {
  bankName: string;
  accountNumber: string;
  confidence: number;
  extractionTime: number;
  service: 'cloudVision' | 'gemini';
  imageCharacteristics?: {
    fileSize: number;
    dimensions: string;
    quality: 'high' | 'medium' | 'low';
  };
}

interface SuccessfulPattern {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  amount?: string;
  extractionMethod: 'cloudVision' | 'gemini';
  confidence: number;
  timestamp: Date;
  imageHash?: string;
  successCount: number;
  averageConfidence: number;
  averageExtractionTime: number;
}

interface PatternInsight {
  bankName: string;
  bestMethod: 'cloudVision' | 'gemini';
  averageConfidence: number;
  commonIssues: string[];
  recommendations: string[];
}

class PatternLearningService {
  private readonly PATTERNS_CACHE_KEY = 'extraction_patterns';
  private readonly INSIGHTS_CACHE_KEY = 'pattern_insights';
  private readonly MAX_PATTERNS = 1000;
  private readonly MIN_CONFIDENCE_TO_LEARN = 75;
  
  private patterns: Map<string, SuccessfulPattern> = new Map();
  private insights: Map<string, PatternInsight> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🧠 PatternLearning: Initializing pattern database...');
      
      // Load cached patterns
      const cachedPatterns = await AsyncStorage.getItem(this.PATTERNS_CACHE_KEY);
      if (cachedPatterns) {
        const parsed = JSON.parse(cachedPatterns);
        this.patterns = new Map(parsed.map((p: any) => [p.id, {
          ...p,
          timestamp: new Date(p.timestamp)
        }]));
        console.log(`📚 Loaded ${this.patterns.size} cached patterns`);
      }

      // Load cached insights
      const cachedInsights = await AsyncStorage.getItem(this.INSIGHTS_CACHE_KEY);
      if (cachedInsights) {
        const parsed = JSON.parse(cachedInsights);
        this.insights = new Map(parsed.map((i: any) => [i.bankName, i]));
        console.log(`💡 Loaded ${this.insights.size} cached insights`);
      }

      this.initialized = true;
    } catch (error) {
      console.error('❌ PatternLearning: Error initializing:', error);
      this.initialized = true;
    }
  }

  /**
   * Learn from successful extraction
   * DISABLED FOR FRESH DATA - NO PATTERN CACHING
   */
  async learnFromSuccess(
    extractedData: ExtractedBankData,
    extractionTime: number,
    service: 'cloudVision' | 'gemini',
    imageCharacteristics?: any
  ): Promise<void> {
    console.log('🚫 PatternLearning: DISABLED - Always use fresh data, no pattern caching');
    return; // Early return - no learning/caching

    const patternId = this.generatePatternId(extractedData);
    const existingPattern = this.patterns.get(patternId);

    if (existingPattern) {
      // Update existing pattern
      existingPattern.successCount++;
      existingPattern.averageConfidence = (existingPattern.averageConfidence + extractedData.confidence) / 2;
      existingPattern.averageExtractionTime = (existingPattern.averageExtractionTime + extractionTime) / 2;
      existingPattern.timestamp = new Date();
      
      console.log(`📈 PatternLearning: Updated pattern for ${extractedData.bankName} (${existingPattern.successCount} successes)`);
    } else {
      // Create new pattern
      const newPattern: SuccessfulPattern = {
        id: patternId,
        bankName: extractedData.bankName,
        accountNumber: extractedData.accountNumber,
        accountHolderName: extractedData.accountHolderName,
        amount: extractedData.amount,
        extractionMethod: service,
        confidence: extractedData.confidence,
        timestamp: new Date(),
        successCount: 1,
        averageConfidence: extractedData.confidence,
        averageExtractionTime: extractionTime
      };

      this.patterns.set(patternId, newPattern);
      console.log(`🆕 PatternLearning: Created new pattern for ${extractedData.bankName}`);
    }

    // Update insights
    await this.updateInsights(extractedData, service);
    
    // Save patterns
    await this.savePatterns();
    
    // Clean up old patterns if too many
    if (this.patterns.size > this.MAX_PATTERNS) {
      await this.cleanupOldPatterns();
    }
  }

  /**
   * Get similar patterns for few-shot learning
   */
  async getSimilarPatterns(bankName: string, count: number = 3): Promise<SuccessfulPattern[]> {
    await this.initialize();

    const bankPatterns = Array.from(this.patterns.values())
      .filter(pattern => pattern.bankName.toLowerCase() === bankName.toLowerCase())
      .sort((a, b) => b.averageConfidence - a.averageConfidence)
      .slice(0, count);

    return bankPatterns;
  }

  /**
   * Get best extraction method for a bank
   */
  async getBestMethodForBank(bankName: string): Promise<'cloudVision' | 'gemini' | null> {
    await this.initialize();

    const bankPatterns = Array.from(this.patterns.values())
      .filter(pattern => pattern.bankName.toLowerCase() === bankName.toLowerCase());

    if (bankPatterns.length === 0) return null;

    const cloudVisionPatterns = bankPatterns.filter(p => p.extractionMethod === 'cloudVision');
    const geminiPatterns = bankPatterns.filter(p => p.extractionMethod === 'gemini');

    const cloudVisionAvg = cloudVisionPatterns.reduce((sum, p) => sum + p.averageConfidence, 0) / cloudVisionPatterns.length || 0;
    const geminiAvg = geminiPatterns.reduce((sum, p) => sum + p.averageConfidence, 0) / geminiPatterns.length || 0;

    return cloudVisionAvg > geminiAvg ? 'cloudVision' : 'gemini';
  }

  /**
   * Get pattern insights for a bank
   */
  async getInsights(bankName: string): Promise<PatternInsight | null> {
    await this.initialize();
    return this.insights.get(bankName.toLowerCase()) || null;
  }

  /**
   * Get overall statistics
   */
  async getStatistics(): Promise<{
    totalPatterns: number;
    bankCoverage: number;
    averageConfidence: number;
    bestPerformingBanks: string[];
    methodPreference: { cloudVision: number; gemini: number };
  }> {
    await this.initialize();

    const allPatterns = Array.from(this.patterns.values());
    const totalPatterns = allPatterns.length;
    const bankCoverage = new Set(allPatterns.map(p => p.bankName.toLowerCase())).size;
    const averageConfidence = allPatterns.reduce((sum, p) => sum + p.averageConfidence, 0) / totalPatterns || 0;

    const bestPerformingBanks = Array.from(this.insights.entries())
      .sort(([,a], [,b]) => b.averageConfidence - a.averageConfidence)
      .slice(0, 5)
      .map(([bankName]) => bankName);

    const cloudVisionCount = allPatterns.filter(p => p.extractionMethod === 'cloudVision').length;
    const geminiCount = allPatterns.filter(p => p.extractionMethod === 'gemini').length;

    return {
      totalPatterns,
      bankCoverage,
      averageConfidence,
      bestPerformingBanks,
      methodPreference: {
        cloudVision: cloudVisionCount,
        gemini: geminiCount
      }
    };
  }

  /**
   * Check if we've seen this pattern before (for caching)
   * DISABLED FOR FRESH DATA - ALWAYS RETURN FALSE
   */
  async hasSeenPattern(bankName: string, accountNumber: string): Promise<boolean> {
    console.log('🚫 PatternLearning: Pattern checking DISABLED - Always return false for fresh data');
    return false; // Always return false - no pattern caching
  }

  /**
   * Generate unique pattern ID
   */
  private generatePatternId(data: ExtractedBankData): string {
    return `${data.bankName.toLowerCase().replace(/\s+/g, '_')}_${data.accountNumber}`;
  }

  /**
   * Update insights for a bank
   */
  private async updateInsights(data: ExtractedBankData, service: 'cloudVision' | 'gemini'): Promise<void> {
    const bankName = data.bankName.toLowerCase();
    const existingInsight = this.insights.get(bankName);

    if (existingInsight) {
      // Update existing insight
      existingInsight.averageConfidence = (existingInsight.averageConfidence + data.confidence) / 2;
      
      // Update best method based on recent performance
      const bankPatterns = Array.from(this.patterns.values())
        .filter(p => p.bankName.toLowerCase() === bankName);
      
      const cloudVisionAvg = bankPatterns.filter(p => p.extractionMethod === 'cloudVision')
        .reduce((sum, p) => sum + p.averageConfidence, 0) / bankPatterns.filter(p => p.extractionMethod === 'cloudVision').length || 0;
      const geminiAvg = bankPatterns.filter(p => p.extractionMethod === 'gemini')
        .reduce((sum, p) => sum + p.averageConfidence, 0) / bankPatterns.filter(p => p.extractionMethod === 'gemini').length || 0;
      
      existingInsight.bestMethod = cloudVisionAvg > geminiAvg ? 'cloudVision' : 'gemini';
    } else {
      // Create new insight
      const newInsight: PatternInsight = {
        bankName: data.bankName,
        bestMethod: service,
        averageConfidence: data.confidence,
        commonIssues: [],
        recommendations: []
      };
      
      this.insights.set(bankName, newInsight);
    }

    await this.saveInsights();
  }

  /**
   * Save patterns to storage
   */
  private async savePatterns(): Promise<void> {
    try {
      const patternsArray = Array.from(this.patterns.values());
      await AsyncStorage.setItem(this.PATTERNS_CACHE_KEY, JSON.stringify(patternsArray));
    } catch (error) {
      console.error('❌ PatternLearning: Error saving patterns:', error);
    }
  }

  /**
   * Save insights to storage
   */
  private async saveInsights(): Promise<void> {
    try {
      const insightsArray = Array.from(this.insights.values());
      await AsyncStorage.setItem(this.INSIGHTS_CACHE_KEY, JSON.stringify(insightsArray));
    } catch (error) {
      console.error('❌ PatternLearning: Error saving insights:', error);
    }
  }

  /**
   * Clean up old patterns when limit reached
   */
  private async cleanupOldPatterns(): Promise<void> {
    const patterns = Array.from(this.patterns.entries());
    
    // Sort by timestamp (oldest first)
    patterns.sort(([,a], [,b]) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Remove 20% of oldest patterns
    const patternsToRemove = Math.floor(patterns.length * 0.2);
    
    for (let i = 0; i < patternsToRemove; i++) {
      this.patterns.delete(patterns[i][0]);
    }
    
    console.log(`🧹 PatternLearning: Removed ${patternsToRemove} old patterns (total: ${this.patterns.size})`);
    await this.savePatterns();
  }

  /**
   * Reset all patterns and insights (for testing)
   */
  async resetPatterns(): Promise<void> {
    await AsyncStorage.removeItem(this.PATTERNS_CACHE_KEY);
    await AsyncStorage.removeItem(this.INSIGHTS_CACHE_KEY);
    this.patterns.clear();
    this.insights.clear();
    this.initialized = false;
    console.log('🔄 PatternLearning: All patterns and insights reset');
  }
}

export default new PatternLearningService(); 