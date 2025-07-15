interface BankMatch {
  name: string;
  priority: number;
  patterns: string[];
}

interface BankFromAPI {
  code: string;
  name: string;
}

export class BankCorrectionService {
  // Core banks for pattern matching (prioritized by type)
  private static readonly BANK_MATCHES: BankMatch[] = [
    // Priority 1: Digital Banks (fintech, mobile money, digital-first) - HIGHEST PRIORITY
    {
      name: 'Opay Digital Services Limited',
      priority: 1,
      patterns: ['opay', 'o-pay', 'o pay', 'opay digital', 'opay digital services', 'opay digital services limited']
    },
    {
      name: 'PALMPAY',
      priority: 1,
      patterns: ['palmpay', 'palm-pay', 'palm pay']
    },
    {
      name: 'Kuda.',
      priority: 1,
      patterns: ['kuda', 'kuda bank', 'kuda microfinance', 'kuda.']
    },
    {
      name: 'Moniepoint',
      priority: 1,
      patterns: ['moniepoint', 'monie point', 'moniepoint mfb']
    },
    {
      name: 'Carbon',
      priority: 1,
      patterns: ['carbon', 'carbon microfinance', 'carbon mfb']
    },
    {
      name: '9 Payment Service Bank (9PSB)',
      priority: 1,
      patterns: ['9psb', '9 psb', '9 payment', '9 payment service', '9 payment service bank']
    },
    {
      name: 'UBA MONI',
      priority: 1,
      patterns: ['uba moni', 'ubamoni', 'moni']
    },
    {
      name: 'Zenith Eazy Wallet',
      priority: 1,
      patterns: ['zenith eazy', 'zenith wallet', 'eazy wallet', 'zenith eazy wallet']
    },
    {
      name: 'StanbicMobileMoney',
      priority: 1,
      patterns: ['stanbic mobile', 'stanbic mobile money', 'stanbicmobilemoney']
    },
    {
      name: 'Ecobank Xpress Account',
      priority: 1,
      patterns: ['ecobank xpress', 'eco xpress', 'ecobank express', 'xpress account']
    },
    {
      name: 'Rubies',
      priority: 1,
      patterns: ['rubies', 'rubies bank', 'rubies mfb', 'rubies microfinance']
    },
    {
      name: 'VFD MFB',
      priority: 1,
      patterns: ['vfd', 'vfd microfinance', 'vfd mfb', 'vfd microfinance bank']
    },
    {
      name: 'Sparkle MFB',
      priority: 1,
      patterns: ['sparkle', 'sparkle microfinance', 'sparkle mfb']
    },
    
    // Priority 2: Commercial Banks (traditional established banks) - SECOND PRIORITY
    {
      name: 'GTBank Plc',
      priority: 2,
      patterns: ['gtbank', 'gt bank', 'guaranty trust', 'gtb', 'gtbank plc', 'guaranty trust bank']
    },
    {
      name: 'Access Bank',
      priority: 2,
      patterns: ['access bank', 'access bank plc']
    },
    {
      name: 'Access Bank PLC (Diamond)',
      priority: 2,
      patterns: ['access diamond', 'access bank diamond', 'diamond bank', 'access bank plc diamond']
    },
    {
      name: 'ZENITH BANK PLC',
      priority: 2,
      patterns: ['zenith bank', 'zenith', 'zenith bank plc']
    },
    {
      name: 'United Bank for Africa',
      priority: 2,
      patterns: ['uba', 'united bank', 'united bank for africa', 'united bank africa']
    },
    {
      name: 'First Bank of Nigeria',
      priority: 2,
      patterns: ['first bank', 'firstbank', 'fbn', 'first bank of nigeria', 'first bank nigeria']
    },
    {
      name: 'Fidelity Bank',
      priority: 2,
      patterns: ['fidelity', 'fidelity bank', 'fidelity bank plc']
    },
    {
      name: 'Sterling Bank',
      priority: 2,
      patterns: ['sterling', 'sterling bank', 'sterling bank plc']
    },
    {
      name: 'Union Bank',
      priority: 2,
      patterns: ['union bank', 'union bank of nigeria', 'union bank nigeria', 'union bank plc']
    },
    {
      name: 'Stanbic IBTC Bank',
      priority: 2,
      patterns: ['stanbic', 'stanbic ibtc', 'stanbic bank', 'stanbic ibtc bank']
    },
    {
      name: 'Ecobank Bank',
      priority: 2,
      patterns: ['ecobank', 'eco bank', 'ecobank nigeria', 'ecobank bank']
    },
    {
      name: 'Wema Bank',
      priority: 2,
      patterns: ['wema', 'wema bank', 'wema bank plc']
    },
    {
      name: 'FCMB',
      priority: 2,
      patterns: ['fcmb', 'first city monument bank', 'fcmb group']
    },
    {
      name: 'Keystone Bank',
      priority: 2,
      patterns: ['keystone', 'keystone bank', 'keystone bank limited']
    },
    {
      name: 'POLARIS BANK',
      priority: 2,
      patterns: ['polaris', 'polaris bank', 'polaris bank limited']
    },
    {
      name: 'Unity Bank',
      priority: 2,
      patterns: ['unity', 'unity bank', 'unity bank plc']
    },
    {
      name: 'Providus Bank',
      priority: 2,
      patterns: ['providus', 'providus bank', 'providus bank limited']
    },
    {
      name: 'JAIZ Bank',
      priority: 2,
      patterns: ['jaiz', 'jaiz bank', 'jaiz bank plc']
    },
    {
      name: 'Standard Chartered',
      priority: 2,
      patterns: ['standard chartered', 'standard chartered bank', 'scb']
    },
    {
      name: 'Citibank',
      priority: 2,
      patterns: ['citibank', 'citi bank', 'citi']
    },
    
    // Priority 3: Microfinance Banks and smaller institutions - THIRD PRIORITY
    {
      name: 'ACCION MFB',
      priority: 3,
      patterns: ['accion', 'accion mfb', 'accion microfinance']
    },
    {
      name: 'Aella MFB',
      priority: 3,
      patterns: ['aella', 'aella mfb', 'aella microfinance']
    },
    {
      name: 'FCMB MFB',
      priority: 3,
      patterns: ['fcmb mfb', 'fcmb microfinance', 'first city monument microfinance']
    },
    {
      name: 'Abbey Mortgage Bank',
      priority: 3,
      patterns: ['abbey', 'abbey mortgage', 'abbey mortgage bank']
    },
    {
      name: 'AG Mortgage Bank',
      priority: 3,
      patterns: ['ag mortgage', 'ag mortgage bank']
    },
    {
      name: '9jaPay MFB',
      priority: 3,
      patterns: ['9japay', '9ja pay', '9japay mfb']
    },
    {
      name: '5TT MFB',
      priority: 3,
      patterns: ['5tt', '5tt mfb', '5tt microfinance']
    },
    {
      name: '78 Finance Company Limited',
      priority: 3,
      patterns: ['78 finance', '78finance', '78 finance company']
    },
    {
      name: 'Advans La Fayette MFB',
      priority: 3,
      patterns: ['advans', 'la fayette', 'advans la fayette', 'advans mfb']
    },
    {
      name: 'Advancly MFB',
      priority: 3,
      patterns: ['advancly', 'advancly mfb', 'advancly microfinance']
    },
    
    // Priority 4: Generic terms (lowest priority) - FALLBACK
    {
      name: 'Access Bank',
      priority: 4,
      patterns: ['access']
    },
    {
      name: 'GTBank Plc',
      priority: 4,
      patterns: ['gt']
    },
    {
      name: 'United Bank for Africa',
      priority: 4,
      patterns: ['united']
    },
    {
      name: 'Zenith Bank',
      priority: 4,
      patterns: ['zenith']
    }
  ];

  // Cache for all banks from API (loaded once)
  private static allBanksCache: BankFromAPI[] | null = null;

  /**
   * Load all banks from the stored banks data (one-time initialization)
   */
  private static async initializeAllBanks(): Promise<void> {
    if (this.allBanksCache) return;

    try {
      // In a real app, this would be loaded from AsyncStorage or fetched from API
      // For now, we'll simulate with a subset for demonstration
      this.allBanksCache = [
        { code: '090267', name: 'Kuda.' },
        { code: '000014', name: 'Access Bank' },
        { code: '000005', name: 'Access Bank PLC (Diamond)' },
        { code: '070010', name: 'Abbey Mortgage Bank' },
        { code: '090832', name: '5TT MFB' },
        // ... In production, this would be the full 401 banks list
      ];
      
      console.log('[BankCorrectionService] Initialized with cached banks:', this.allBanksCache.length);
    } catch (error) {
      console.error('[BankCorrectionService] Failed to initialize all banks:', error);
      this.allBanksCache = [];
    }
  }

  /**
   * Primary method: Fast pattern matching with comprehensive fallback
   */
  static async correctBankName(detectedText: string): Promise<string> {
    if (!detectedText) return detectedText;

    // Step 1: Try fast pattern matching for popular banks
    const patternResult = this.correctBankNameWithPatterns(detectedText);
    if (patternResult !== detectedText) {
      console.log(`[BankCorrectionService] ✅ Pattern match: "${detectedText}" → "${patternResult}"`);
      return patternResult;
    }

    // Step 2: Fallback to comprehensive bank list search
    await this.initializeAllBanks();
    const fuzzyResult = this.findBankInComprehensiveList(detectedText);
    if (fuzzyResult) {
      console.log(`[BankCorrectionService] ✅ Fuzzy match: "${detectedText}" → "${fuzzyResult}"`);
      return fuzzyResult;
    }

    console.log(`[BankCorrectionService] ❌ No match found for: "${detectedText}"`);
    return detectedText;
  }

  /**
   * Fast pattern matching for popular banks (synchronous)
   */
  private static correctBankNameWithPatterns(detectedText: string): string {
    const normalizedText = detectedText.toLowerCase().trim();
    let bestMatch: { bank: string; priority: number; score: number } | null = null;

    for (const bankMatch of this.BANK_MATCHES) {
      for (const pattern of bankMatch.patterns) {
        const regex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        
        if (regex.test(normalizedText)) {
          // Digital banks get massive priority boost
          const priorityBonus = bankMatch.priority === 1 ? 10000 : // Digital banks
                               bankMatch.priority === 2 ? 5000 :  // Commercial banks  
                               bankMatch.priority === 3 ? 500 :   // Microfinance banks
                               10;                                 // Generic terms
          const specificityScore = pattern.length;
          const totalScore = priorityBonus + specificityScore;

          if (!bestMatch || totalScore > bestMatch.score) {
            bestMatch = {
              bank: bankMatch.name,
              priority: bankMatch.priority,
              score: totalScore
            };
          }
        }
      }
    }

    return bestMatch ? bestMatch.bank : detectedText;
  }

  /**
   * Comprehensive fuzzy search in all 401 banks
   */
  private static findBankInComprehensiveList(detectedText: string): string | null {
    if (!this.allBanksCache) return null;

    const normalized = detectedText.toLowerCase().trim();
    
    // Exact match first
    for (const bank of this.allBanksCache) {
      if (bank.name.toLowerCase() === normalized) {
        return bank.name;
      }
    }

    // Partial match (contains)
    for (const bank of this.allBanksCache) {
      if (bank.name.toLowerCase().includes(normalized) || 
          normalized.includes(bank.name.toLowerCase())) {
        return bank.name;
      }
    }

    // Word-based fuzzy matching
    const words = normalized.split(/\s+/);
    for (const bank of this.allBanksCache) {
      const bankWords = bank.name.toLowerCase().split(/\s+/);
      const matchCount = words.filter(word => 
        bankWords.some(bankWord => bankWord.includes(word) || word.includes(bankWord))
      ).length;
      
      if (matchCount >= Math.min(2, words.length)) {
        return bank.name;
      }
    }

    return null;
  }

  /**
   * Synchronous version for backward compatibility
   */
  static correctBankNameSync(detectedText: string): string {
    return this.correctBankNameWithPatterns(detectedText);
  }

  /**
   * Get all supported bank names for reference
   */
  static getSupportedBanks(): string[] {
    const uniqueBanks = new Set<string>();
    this.BANK_MATCHES.forEach(match => uniqueBanks.add(match.name));
    return Array.from(uniqueBanks).sort();
  }

  /**
   * Get all banks from comprehensive list
   */
  static async getAllBanks(): Promise<BankFromAPI[]> {
    await this.initializeAllBanks();
    return this.allBanksCache || [];
  }

  /**
   * Check if a bank name is supported in patterns
   */
  static isBankSupported(bankName: string): boolean {
    return this.BANK_MATCHES.some(match => 
      match.name.toLowerCase() === bankName.toLowerCase()
    );
  }

  /**
   * Get bank patterns for debugging
   */
  static getBankPatterns(bankName: string): string[] {
    const matches = this.BANK_MATCHES.filter(match => 
      match.name.toLowerCase() === bankName.toLowerCase()
    );
    return matches.flatMap(match => match.patterns);
  }

  /**
   * Get statistics about supported banks
   */
  static getBankStats(): {
    totalPatternBanks: number;
    fintechBanks: number;
    traditionalBanks: number;
    microfinanceBanks: number;
    genericPatterns: number;
    totalCachedBanks: number;
  } {
    const uniqueBanks = new Set<string>();
    let fintechCount = 0;
    let traditionalCount = 0;
    let microfinanceCount = 0;
    let genericCount = 0;

    this.BANK_MATCHES.forEach(match => {
      uniqueBanks.add(match.name);
      
      switch (match.priority) {
        case 1:
          fintechCount++;
          break;
        case 2:
          traditionalCount++;
          break;
        case 3:
          microfinanceCount++;
          break;
        case 4:
          genericCount++;
          break;
      }
    });

    return {
      totalPatternBanks: uniqueBanks.size,
      fintechBanks: fintechCount,
      traditionalBanks: traditionalCount,
      microfinanceBanks: microfinanceCount,
      genericPatterns: genericCount,
      totalCachedBanks: this.allBanksCache?.length || 0
    };
  }
} 