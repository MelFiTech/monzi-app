import AsyncStorage from '@react-native-async-storage/async-storage';

interface BankPattern {
  bankName: string;
  commonFormats: string[];
  colorScheme: string;
  logoDescription: string;
  accountNumberFormat: string;
  successfulExtractions: number;
  lastUpdated: Date;
}

interface ExtractionContext {
  bankName?: string;
  confidence?: number;
  extractedFields?: Record<string, boolean>;
}

interface PromptTemplate {
  cloudVision: string;
  gemini: string;
  examples: string[];
}

class SmartPromptService {
  private readonly PATTERN_CACHE_KEY = 'nigerian_bank_patterns';
  private readonly MAX_EXAMPLES = 5;
  private bankPatterns: Map<string, BankPattern> = new Map();
  private initialized = false;

  // Nigerian bank patterns database
  private readonly NIGERIAN_BANKS_DB: Record<string, BankPattern> = {
    'gtbank': {
      bankName: 'GTBank',
      commonFormats: ['0123456789', '012-345-6789', '012 345 6789'],
      colorScheme: 'Orange and White',
      logoDescription: 'GT logo with orange/red background',
      accountNumberFormat: '10 digits starting with 0',
      successfulExtractions: 0,
      lastUpdated: new Date()
    },
    'access': {
      bankName: 'Access Bank',
      commonFormats: ['0123456789', '012-345-6789'],
      colorScheme: 'Orange and Blue',
      logoDescription: 'Access logo with orange diamond',
      accountNumberFormat: '10 digits',
      successfulExtractions: 0,
      lastUpdated: new Date()
    },
    'zenith': {
      bankName: 'Zenith Bank',
      commonFormats: ['2123456789', '212-345-6789'],
      colorScheme: 'Blue and White',
      logoDescription: 'Zenith logo with blue design',
      accountNumberFormat: '10 digits starting with 2',
      successfulExtractions: 0,
      lastUpdated: new Date()
    },
    'uba': {
      bankName: 'United Bank for Africa',
      commonFormats: ['2023456789', '202-345-6789'],
      colorScheme: 'Red and White',
      logoDescription: 'UBA logo with red background',
      accountNumberFormat: '10 digits starting with 2',
      successfulExtractions: 0,
      lastUpdated: new Date()
    },
    'firstbank': {
      bankName: 'First Bank',
      commonFormats: ['3123456789', '312-345-6789'],
      colorScheme: 'Blue and Gold',
      logoDescription: 'First Bank logo with blue and gold',
      accountNumberFormat: '10 digits starting with 3',
      successfulExtractions: 0,
      lastUpdated: new Date()
    },
    'moniepoint': {
      bankName: 'Moniepoint',
      commonFormats: ['7059957131', '705-995-7131'],
      colorScheme: 'Blue and White',
      logoDescription: 'Moniepoint logo with blue design',
      accountNumberFormat: '10 digits starting with 7',
      successfulExtractions: 0,
      lastUpdated: new Date()
    },
    'opay': {
      bankName: 'Opay',
      commonFormats: ['8012345678', '801-234-5678'],
      colorScheme: 'Green and White',
      logoDescription: 'Opay logo with green background',
      accountNumberFormat: '10 digits starting with 8',
      successfulExtractions: 0,
      lastUpdated: new Date()
    },
    'kuda': {
      bankName: 'Kuda Bank',
      commonFormats: ['1234567890', '123-456-7890'],
      colorScheme: 'Purple and White',
      logoDescription: 'Kuda logo with purple design',
      accountNumberFormat: '10 digits',
      successfulExtractions: 0,
      lastUpdated: new Date()
    }
  };

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🧠 SmartPrompts: Initializing with FRESH patterns only - NO CACHING...');
      
      // DO NOT load cached patterns - always use fresh default patterns
      console.log('🚫 SmartPrompts: Skipping cached patterns for fresh data');
      
      // Always initialize with fresh default patterns
      Object.entries(this.NIGERIAN_BANKS_DB).forEach(([key, pattern]) => {
        this.bankPatterns.set(key, pattern);
      });
      
      // DO NOT save patterns - no caching
      console.log('📚 Initialized with fresh default Nigerian bank patterns - NO CACHING');

      this.initialized = true;
    } catch (error) {
      console.error('❌ SmartPrompts: Error initializing:', error);
      // Fallback to default patterns
      Object.entries(this.NIGERIAN_BANKS_DB).forEach(([key, pattern]) => {
        this.bankPatterns.set(key, pattern);
      });
      this.initialized = true;
    }
  }

  /**
   * Generate optimized CloudVision prompt
   */
  async generateCloudVisionPrompt(context?: ExtractionContext): Promise<string> {
    await this.initialize();

    const basePrompt = `Extract Nigerian bank account details from this image:

REQUIRED FIELDS:
- Bank Name (exact match from list)
- Account Number (10 digits)
- Account Holder Name
- Amount (if visible)

NIGERIAN BANKS TO LOOK FOR:`;

    const banksList = Array.from(this.bankPatterns.values())
      .sort((a, b) => b.successfulExtractions - a.successfulExtractions)
      .slice(0, 10)
      .map(bank => `- ${bank.bankName} (${bank.colorScheme}, ${bank.accountNumberFormat})`)
      .join('\n');

    const examples = this.getTopExamples(3);

    return `${basePrompt}\n${banksList}\n\nEXAMPLES:\n${examples}\n\nReturn structured JSON with confidence score.`;
  }

  /**
   * Generate optimized Gemini prompt with few-shot learning
   */
  async generateGeminiPrompt(context?: ExtractionContext): Promise<string> {
    await this.initialize();

    const specificBankGuidance = context?.bankName ? this.getBankSpecificGuidance(context.bankName) : '';
    const examples = this.getTopExamples(this.MAX_EXAMPLES);

    return `You are an expert at extracting Nigerian bank account information. Analyze this image and extract:

1. **Bank Name**: Match exactly from this list of Nigerian banks:
${this.getBankNamesList()}

2. **Account Number**: Must be exactly 10 digits (Nigerian standard)

3. **Account Holder Name**: Full name as written

4. **Amount**: Any monetary value if visible

${specificBankGuidance}

**SUCCESSFUL EXAMPLES:**
${examples}

**OUTPUT FORMAT:**
\`\`\`json
{
  "bankName": "Exact bank name from list",
  "accountNumber": "1234567890",
  "accountHolderName": "FULL NAME",
  "amount": "1000.00",
  "confidence": 95,
  "extractedFields": {
    "bankName": true,
    "accountNumber": true,
    "accountHolderName": true,
    "amount": true
  }
}
\`\`\`

Focus on accuracy over speed. Use context clues like logos, colors, and formatting patterns.`;
  }

  /**
   * Learn from successful extraction
   */
  async learnFromSuccess(bankName: string, extractedData: any): Promise<void> {
    await this.initialize();

    const normalizedBankName = bankName.toLowerCase().replace(/\s+/g, '');
    const pattern = this.bankPatterns.get(normalizedBankName);

    if (pattern) {
      pattern.successfulExtractions++;
      pattern.lastUpdated = new Date();
      
      // Add new format if not already present
      if (extractedData.accountNumber && !pattern.commonFormats.includes(extractedData.accountNumber)) {
        pattern.commonFormats.push(extractedData.accountNumber);
        if (pattern.commonFormats.length > 10) {
          pattern.commonFormats = pattern.commonFormats.slice(-10); // Keep last 10
        }
      }

      await this.savePatterns();
      console.log(`📈 SmartPrompts: Learned from successful ${bankName} extraction`);
    }
  }

  /**
   * Get bank-specific guidance for better extraction
   */
  private getBankSpecificGuidance(bankName: string): string {
    const normalizedBankName = bankName.toLowerCase().replace(/\s+/g, '');
    const pattern = this.bankPatterns.get(normalizedBankName);

    if (!pattern) return '';

    return `
**BANK-SPECIFIC GUIDANCE for ${pattern.bankName}:**
- Look for ${pattern.colorScheme} color scheme
- Logo: ${pattern.logoDescription}
- Account format: ${pattern.accountNumberFormat}
- Common formats: ${pattern.commonFormats.slice(0, 3).join(', ')}
`;
  }

  /**
   * Get list of Nigerian banks for prompt
   */
  private getBankNamesList(): string {
    return Array.from(this.bankPatterns.values())
      .sort((a, b) => b.successfulExtractions - a.successfulExtractions)
      .map(bank => `- ${bank.bankName}`)
      .join('\n');
  }

  /**
   * Get top performing examples for few-shot learning
   */
  private getTopExamples(count: number): string {
    const topBanks = Array.from(this.bankPatterns.values())
      .filter(bank => bank.successfulExtractions > 0)
      .sort((a, b) => b.successfulExtractions - a.successfulExtractions)
      .slice(0, count);

    if (topBanks.length === 0) {
      return "No successful extractions yet. Focus on clear text and logos.";
    }

    return topBanks.map(bank => 
      `${bank.bankName}: ${bank.accountNumberFormat} (${bank.successfulExtractions} successful)`
    ).join('\n');
  }

  /**
   * Save patterns to storage
   */
  private async savePatterns(): Promise<void> {
    try {
      const patternsArray = Array.from(this.bankPatterns.values());
      await AsyncStorage.setItem(this.PATTERN_CACHE_KEY, JSON.stringify(patternsArray));
    } catch (error) {
      console.error('❌ SmartPrompts: Error saving patterns:', error);
    }
  }

  /**
   * Get pattern statistics
   */
  async getPatternStats(): Promise<{ totalExtractions: number; topBanks: string[] }> {
    await this.initialize();
    
    const patterns = Array.from(this.bankPatterns.values());
    const totalExtractions = patterns.reduce((sum, pattern) => sum + pattern.successfulExtractions, 0);
    const topBanks = patterns
      .filter(pattern => pattern.successfulExtractions > 0)
      .sort((a, b) => b.successfulExtractions - a.successfulExtractions)
      .slice(0, 5)
      .map(pattern => pattern.bankName);

    return { totalExtractions, topBanks };
  }

  /**
   * Reset all patterns (for testing)
   */
  async resetPatterns(): Promise<void> {
    await AsyncStorage.removeItem(this.PATTERN_CACHE_KEY);
    this.bankPatterns.clear();
    this.initialized = false;
    console.log('🔄 SmartPrompts: Patterns reset');
  }
}

export default new SmartPromptService(); 