const CLOUD_VISION_API_KEY = 'AIzaSyDtS7CjSBLq8aYAVpzw13vHp4E_wxMRQio';
const CLOUD_VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${CLOUD_VISION_API_KEY}`;

import { ExtractedBankData } from './GeminiService';

class CloudVisionService {
  private async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('CloudVision: Error converting image to base64:', error);
      throw new Error('Failed to process image');
    }
  }

  async extractBankData(imageUri: string): Promise<ExtractedBankData> {
    try {
      console.log('🔍 CloudVision: Starting FRESH optimized bank data extraction...');
      console.log('🔄 CloudVision: Processing new image data - NO CACHE USED');
      
      const base64Image = await this.convertImageToBase64(imageUri);
      
      // Optimized request with multiple features for better accuracy
      const requestBody = {
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              {
                type: 'DOCUMENT_TEXT_DETECTION',
                maxResults: 1
              },
              {
                type: 'TEXT_DETECTION',
                maxResults: 50
              },
              {
                type: 'LOGO_DETECTION', // Add logo detection for bank recognition
                maxResults: 10
              }
            ],
            imageContext: {
              languageHints: ['en', 'en-NG'], // Nigerian English context
              textDetectionParams: {
                enableTextDetectionConfidenceScore: true
              }
            }
          }
        ]
      };

      console.log('📡 CloudVision: Making optimized request to Google Cloud Vision API...');

      const response = await fetch(CLOUD_VISION_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📨 CloudVision: Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ CloudVision: API error response:', errorText);
        throw new Error(`Cloud Vision API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 CloudVision: Full API response received');
      
      const textAnnotations = data.responses?.[0]?.textAnnotations;
      const fullTextAnnotation = data.responses?.[0]?.fullTextAnnotation;
      const logoAnnotations = data.responses?.[0]?.logoAnnotations;

      if (!textAnnotations || textAnnotations.length === 0) {
        console.log('❌ CloudVision: No text detected in image');
        throw new Error('No text detected in the image');
      }

      // Enhanced Nigerian bank detection with visual intelligence
      console.log('🔍 CloudVision: Analyzing text and visual patterns for Nigerian banks...');
      
      const fullText = textAnnotations[0]?.description || '';
      console.log('📝 CloudVision: Full detected text:', fullText);
      
      // Log detected logos if any
      if (logoAnnotations && logoAnnotations.length > 0) {
        console.log('🏦 CloudVision: Detected logos:', logoAnnotations.map((logo: any) => logo.description));
      }

      let extractedData = this.parseTextForBankDataOptimized(fullText, fullText, []);
      
      // Enhance with visual pattern analysis
      extractedData = this.enhanceWithVisualIntelligence(extractedData, fullText, logoAnnotations);
      
      console.log('✅ CloudVision: Enhanced extraction result:', extractedData);
      return this.validateExtractedData(extractedData);
      
    } catch (error) {
      console.error('❌ CloudVision: Error extracting bank data:', error);
      
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
  }

  private parseTextForBankData(text: string): any {
    console.log('🔍 CloudVision: Parsing text for bank data...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let bankName = '';
    let accountNumber = '';
    let accountHolderName = '';
    let amount = '';
    let confidence = 0;

    // Nigerian bank patterns
    const nigerianBanks = [
      'GTBank', 'GTB', 'Guaranty Trust',
      'Access Bank', 'Access',
      'Zenith Bank', 'Zenith',
      'UBA', 'United Bank for Africa',
      'First Bank', 'FirstBank',
      'Fidelity Bank', 'Fidelity',
      'Sterling Bank', 'Sterling',
      'Stanbic IBTC', 'Stanbic',
      'Union Bank', 'Wema Bank', 'Wema',
      'FCMB', 'First City Monument',
      'Ecobank', 'Polaris Bank', 'Polaris',
      'Keystone Bank', 'Keystone',
      'Unity Bank', 'Unity',
      'Jaiz Bank', 'Jaiz',
      'PalmPay', 'Opay', 'Kuda',
      'VFD', 'Moniepoint', 'Providus'
    ];

    // Account number pattern (10 digits for Nigerian NUBAN)
    const accountNumberPattern = /\b\d{10}\b/g;
    
    // Amount patterns (various formats)
    const amountPatterns = [
      /(?:₦|N|NGN)\s*([0-9,]+(?:\.\d{2})?)/gi,
      /([0-9,]+(?:\.\d{2})?)\s*(?:₦|N|NGN)/gi,
      /(?:amount|total|sum)\s*:?\s*(?:₦|N|NGN)?\s*([0-9,]+(?:\.\d{2})?)/gi
    ];

    // Extract account number with improved logic
    const accountMatches = text.match(accountNumberPattern);
    if (accountMatches && accountMatches.length > 0) {
      // If multiple 10-digit numbers found, prioritize the one that's not part of other text
      if (accountMatches.length > 1) {
        console.log('🔍 CloudVision: Multiple account numbers found:', accountMatches);
        
        // Filter out numbers that are part of other words/phrases
        const validAccountNumbers = accountMatches.filter(match => {
          const context = text.substring(Math.max(0, text.indexOf(match) - 10), text.indexOf(match) + match.length + 10);
          console.log('🔍 CloudVision: Context for', match, ':', context);
          
          // Exclude if it's part of "Frame" or other non-account contexts
          const isPartOfFrame = /frame\s*\d{10}/i.test(context);
          const isPartOfOtherWord = /[a-zA-Z]\d{10}|\d{10}[a-zA-Z]/.test(context);
          
          return !isPartOfFrame && !isPartOfOtherWord;
        });
        
        if (validAccountNumbers.length > 0) {
          accountNumber = validAccountNumbers[0];
          console.log('✅ CloudVision: Selected valid account number:', accountNumber);
        } else {
          // Fallback to first match if no valid ones found
          accountNumber = accountMatches[0];
          console.log('⚠️ CloudVision: Using fallback account number:', accountNumber);
        }
      } else {
        accountNumber = accountMatches[0];
        console.log('✅ CloudVision: Found single account number:', accountNumber);
      }
      confidence += 25;
    }

    // Extract bank name
    for (const bank of nigerianBanks) {
      const bankRegex = new RegExp(bank, 'gi');
      if (bankRegex.test(text)) {
                    // Apply basic OCR corrections only
            const basicCorrections: { [key: string]: string } = {
              'opay': 'OPAY',
              'palmpay': 'PALMPAY',
              'gtb': 'GTBank',
              'gtbank': 'GTBank'
            };
            const normalized = bank.toLowerCase();
            bankName = basicCorrections[normalized] || bank;
        confidence += 25;
        console.log('✅ CloudVision: Found bank:', bankName);
        break;
      }
    }

    // Extract amount
    for (const pattern of amountPatterns) {
      const amountMatch = text.match(pattern);
      if (amountMatch && amountMatch.length > 0) {
        // Extract numeric value
        const numericMatch = amountMatch[0].match(/([0-9,]+(?:\.\d{2})?)/);
        if (numericMatch) {
          amount = numericMatch[1].replace(/,/g, '');
          confidence += 20;
          console.log('✅ CloudVision: Found amount:', amount);
          break;
        }
      }
    }

    // Extract account holder name (heuristic approach)
    // Look for lines that might contain names (typically 2-4 words, proper case)
    const namePattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/;
    for (const line of lines) {
      if (namePattern.test(line) && 
          !nigerianBanks.some(bank => line.toLowerCase().includes(bank.toLowerCase())) &&
          !accountNumberPattern.test(line)) {
        accountHolderName = line;
        confidence += 15;
        console.log('✅ CloudVision: Found potential name:', accountHolderName);
        break;
      }
    }

    // Additional confidence based on overall detection quality
    if (bankName && accountNumber) confidence += 15;

    return {
      bankName,
      accountNumber,
      accountHolderName,
      amount,
      confidence: Math.min(confidence, 100)
    };
  }

  private parseTextForBankDataOptimized(
    fullText: string, 
    structuredText: string, 
    individualTexts: Array<{text: string, confidence: number, boundingPoly: any}>
  ): any {
    console.log('🔍 CloudVision: Starting optimized parsing with context awareness...');
    
    // Combine all text sources for comprehensive analysis
    const allText = `${fullText}\n${structuredText}`;
    const lines = allText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let bankName = '';
    let accountNumber = '';
    let accountHolderName = '';
    let amount = '';
    let confidence = 0;

    // Enhanced Nigerian bank patterns with variations and common OCR mistakes
    // PRIORITY ORDER: Fintech banks first (more specific), then traditional banks
    const nigerianBanks = [
      // FINTECH BANKS (Higher priority - more specific names)
      { names: ['OPAY', 'Opay', 'OPay', 'O PAY', 'OPAY DIGITAL SERVICES LIMITED'], canonical: 'Opay Digital Services Limited', priority: 1 },
      { names: ['PALMPAY', 'PalmPay', 'Palm Pay', 'PALM PAY'], canonical: 'PalmPay', priority: 1 },
      { names: ['KUDA', 'Kuda', 'KUDA BANK'], canonical: 'Kuda Bank', priority: 1 },
      { names: ['MONIEPOINT', 'Moniepoint', 'MONIE POINT'], canonical: 'Moniepoint MFB', priority: 1 },
      { names: ['VFD', 'VFD MICROFINANCE BANK', 'VFD MFB'], canonical: 'VFD Microfinance Bank', priority: 1 },
      { names: ['PROVIDUS', 'Providus Bank', 'PROVIDUS BANK'], canonical: 'Providus Bank', priority: 1 },
      
      // TRADITIONAL BANKS (Lower priority - more generic terms)
      { names: ['GTBank', 'GTB', 'Guaranty Trust', 'GT Bank', 'G T Bank', 'GUARANTY TRUST BANK'], canonical: 'GTBank', priority: 2 },
      { names: ['Access Bank', 'ACCESS BANK', 'ACCES BANK'], canonical: 'Access Bank', priority: 2 },
      { names: ['Zenith Bank', 'Zenith', 'ZENITH BANK', 'ZEN1TH'], canonical: 'Zenith Bank', priority: 2 },
      { names: ['UBA', 'United Bank for Africa', 'United Bank', 'U.B.A', 'UNITED BANK FOR AFRICA'], canonical: 'United Bank for Africa', priority: 2 },
      { names: ['First Bank', 'FirstBank', 'FIRST BANK', '1st Bank', 'FIRSTBANK OF NIGERIA'], canonical: 'First Bank', priority: 2 },
      { names: ['Fidelity Bank', 'Fidelity', 'FIDELITY BANK'], canonical: 'Fidelity Bank', priority: 2 },
      { names: ['Sterling Bank', 'Sterling', 'STERLING BANK'], canonical: 'Sterling Bank', priority: 2 },
      { names: ['Stanbic IBTC', 'Stanbic', 'STANBIC IBTC BANK'], canonical: 'Stanbic IBTC Bank', priority: 2 },
      { names: ['Union Bank', 'UNION BANK'], canonical: 'Union Bank', priority: 2 },
      { names: ['Wema Bank', 'Wema', 'WEMA BANK'], canonical: 'Wema Bank', priority: 2 },
      { names: ['FCMB', 'First City Monument Bank', 'First City Monument'], canonical: 'FCMB', priority: 2 },
      { names: ['Ecobank', 'ECO BANK', 'ECOBANK'], canonical: 'Ecobank', priority: 2 },
      
      // GENERIC TERMS (Lowest priority - only exact word matches)
      { names: ['Access'], canonical: 'Access Bank', priority: 3 }, // Generic "access" gets lowest priority
    ];

    // Enhanced account number pattern with context
    const accountNumberPattern = /\b\d{10}\b/g;
    
    // Enhanced amount patterns with better context recognition
    const amountPatterns = [
      /(?:₦|NGN|N)\s*([0-9,]+(?:\.\d{2})?)/gi,
      /([0-9,]+(?:\.\d{2})?)\s*(?:₦|NGN|N)/gi,
      /(?:amount|total|sum|balance|value)\s*:?\s*(?:₦|NGN|N)?\s*([0-9,]+(?:\.\d{2})?)/gi,
      /(?:receive|send|transfer)\s*(?:₦|NGN|N)?\s*([0-9,]+(?:\.\d{2})?)/gi
    ];

    // Extract account number with higher confidence scoring and context filtering
    const accountMatches = allText.match(accountNumberPattern);
    if (accountMatches && accountMatches.length > 0) {
      console.log('🔍 CloudVision: Found account number candidates:', accountMatches);
      
      // Filter out numbers that are part of other words/phrases
      const validAccountNumbers = accountMatches.filter(match => {
        const context = allText.substring(Math.max(0, allText.indexOf(match) - 15), allText.indexOf(match) + match.length + 15);
        console.log('🔍 CloudVision: Context for', match, ':', context);
        
        // Exclude if it's part of "Frame" or other non-account contexts
        const isPartOfFrame = /frame\s*\d{10}/i.test(context);
        const isPartOfOtherWord = /[a-zA-Z]\d{10}|\d{10}[a-zA-Z]/.test(context);
        const isPartOfDate = /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/.test(context);
        
        return !isPartOfFrame && !isPartOfOtherWord && !isPartOfDate;
      });
      
      if (validAccountNumbers.length > 0) {
        // Prefer account numbers that appear with context keywords
        const contextKeywords = ['account', 'number', 'acct', 'a/c', 'bank'];
        let bestMatch = validAccountNumbers[0];
        let bestScore = 1;
        
        for (const match of validAccountNumbers) {
          const contextScore = contextKeywords.reduce((score, keyword) => {
            const regex = new RegExp(`${keyword}.*${match}|${match}.*${keyword}`, 'gi');
            return regex.test(allText) ? score + 1 : score;
          }, 0);
          
          if (contextScore > bestScore) {
            bestMatch = match;
            bestScore = contextScore;
          }
        }
        
        accountNumber = bestMatch;
        confidence += 30 + (bestScore * 5); // Bonus for context
        console.log('✅ CloudVision: Selected valid account number with context:', accountNumber);
      } else {
        // Fallback to first match if no valid ones found
        accountNumber = accountMatches[0];
        confidence += 20; // Lower confidence for fallback
        console.log('⚠️ CloudVision: Using fallback account number:', accountNumber);
      }
    }

    // Extract bank name with PRIORITY-BASED matching and confidence scoring
    let bestBankMatch = null;
    let bestBankConfidence = 0;
    let bestBankPriority = 99;
    
    for (const bankGroup of nigerianBanks) {
      for (const bankVariant of bankGroup.names) {
        let matchConfidence = 0;
        let matchType = '';
        
        // Check exact word boundary match (highest confidence)
        const exactRegex = new RegExp(`\\b${bankVariant}\\b`, 'gi');
        if (exactRegex.test(allText)) {
          matchConfidence = 35;
          matchType = 'exact';
        }
        // Check fuzzy match (lower confidence)  
        else {
          const fuzzyRegex = new RegExp(bankVariant.replace(/\s+/g, '\\s*'), 'gi');
          if (fuzzyRegex.test(allText)) {
            matchConfidence = 20;
            matchType = 'fuzzy';
          }
        }
        
        // Apply priority bonus/penalty
        if (matchConfidence > 0) {
          const priorityBonus = bankGroup.priority === 1 ? 15 : bankGroup.priority === 2 ? 5 : 0;
          const totalConfidence = matchConfidence + priorityBonus;
          
          // Choose this match if it has higher priority or higher confidence
          if (bankGroup.priority < bestBankPriority || 
              (bankGroup.priority === bestBankPriority && totalConfidence > bestBankConfidence)) {
            bestBankMatch = bankGroup.canonical;
            bestBankConfidence = totalConfidence;
            bestBankPriority = bankGroup.priority;
            
            console.log(`🏆 CloudVision: Found bank "${bankVariant}" -> ${bankGroup.canonical} (${matchType} match, priority ${bankGroup.priority}, confidence ${totalConfidence})`);
          }
        }
      }
    }
    
    if (bestBankMatch) {
      bankName = bestBankMatch;
      confidence += bestBankConfidence;
      console.log('✅ CloudVision: Selected best bank match:', bankName, `(priority ${bestBankPriority})`);
    }

    // Extract amount with enhanced pattern matching
    for (const pattern of amountPatterns) {
      const amountMatches = allText.match(pattern);
      if (amountMatches && amountMatches.length > 0) {
        for (const match of amountMatches) {
          const numericMatch = match.match(/([0-9,]+(?:\.\d{2})?)/);
          if (numericMatch) {
            const candidateAmount = numericMatch[1].replace(/,/g, '');
            const numericValue = parseFloat(candidateAmount);
            
            // Validate amount range (reasonable transaction amounts)
            if (numericValue >= 1 && numericValue <= 10000000) {
              amount = candidateAmount;
              confidence += 25;
              console.log('✅ CloudVision: Found amount:', amount);
              break;
            }
          }
        }
        if (amount) break;
      }
    }

    // Enhanced name extraction using individual text confidence scores
    const highConfidenceTexts = individualTexts.filter(item => item.confidence > 0.8);
    const namePattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4}$/;
    
    for (const textItem of highConfidenceTexts) {
      const text = textItem.text.trim();
      if (namePattern.test(text) && 
          !nigerianBanks.some(bank => bank.names.some(name => text.toLowerCase().includes(name.toLowerCase()))) &&
          !accountNumberPattern.test(text) &&
          text.length > 5 && text.length < 50) {
        accountHolderName = text;
        confidence += 20;
        console.log('✅ CloudVision: Found high-confidence name:', accountHolderName);
        break;
      }
    }

    // If no high-confidence name found, use fallback with lower confidence
    if (!accountHolderName) {
      for (const line of lines) {
        if (namePattern.test(line) && 
            !nigerianBanks.some(bank => bank.names.some(name => line.toLowerCase().includes(name.toLowerCase()))) &&
            !accountNumberPattern.test(line) &&
            line.length > 5 && line.length < 50) {
          accountHolderName = line;
          confidence += 10;
          console.log('✅ CloudVision: Found fallback name:', accountHolderName);
          break;
        }
      }
    }

    // Bonus confidence for multiple fields found
    const fieldsFound = [bankName, accountNumber, accountHolderName, amount].filter(field => field).length;
    confidence += fieldsFound * 5;

    // Context validation bonus
    if (bankName && accountNumber) {
      confidence += 10;
    }

    return {
      bankName,
      accountNumber,
      accountHolderName,
      amount,
      confidence: Math.min(confidence, 100)
    };
  }



  private validateExtractedData(data: any): ExtractedBankData {
    // Remove all non-digits (spaces, dashes, etc.) and keep only numbers
    const accountNumber = data.accountNumber?.replace(/\D/g, '') || '';
    const isValidAccountNumber = accountNumber.length === 10;
    
    console.log(`[CloudVision] Account number sanitization: "${data.accountNumber}" → "${accountNumber}" (${accountNumber.length} digits)`);

    const amount = data.amount?.replace(/[^\d.]/g, '') || '';

    // Only apply basic OCR error corrections, don't restrict to known banks
    const rawBankName = data.bankName?.trim() || '';
    let correctedBankName = rawBankName;
    
    // Apply only obvious OCR corrections (very limited)
    const basicOCRCorrections: { [key: string]: string } = {
      'opay': 'OPAY',
      'palmpay': 'PALMPAY', 
      'gtb': 'GTBank',
      'gtbank': 'GTBank',
      'uba': 'UBA',
      'fcmb': 'FCMB'
    };
    
    const normalizedName = rawBankName.toLowerCase();
    if (basicOCRCorrections[normalizedName]) {
      correctedBankName = basicOCRCorrections[normalizedName];
      console.log(`[CloudVision] Basic OCR correction: "${rawBankName}" → "${correctedBankName}"`);
    } else {
      // Trust the extracted text - let resolve service handle validation
      correctedBankName = rawBankName;
      console.log(`[CloudVision] Using extracted bank name as-is: "${correctedBankName}"`);
    }

    const accountHolderName = data.accountHolderName?.replace(/^(MR|MRS|DR|PROF|MS)\.?\s+/i, '').trim() || '';

    return {
      bankName: correctedBankName,
      accountNumber: isValidAccountNumber ? accountNumber : '',
      accountHolderName: accountHolderName,
      amount: amount,
      confidence: Math.min(data.confidence || 50, 95),
      extractedFields: {
        bankName: Boolean(correctedBankName),
        accountNumber: isValidAccountNumber,
        accountHolderName: Boolean(accountHolderName),
        amount: Boolean(amount),
      }
    };
  }

  formatExtractedAmount(amount: string): string {
    if (!amount) return '';
    const num = parseFloat(amount);
    if (isNaN(num)) return '';
    return num.toLocaleString();
  }

  isExtractionValid(data: ExtractedBankData): boolean {
    return data.extractedFields.bankName && 
           data.extractedFields.accountNumber && 
           data.confidence >= 80; // Slightly lower threshold than Gemini
  }

  private enhanceWithVisualIntelligence(extractedData: any, fullText: string, logoAnnotations: any[]): any {
    console.log('🎨 CloudVision: Applying visual intelligence for bank recognition...');
    
    // Enhanced bank recognition using visual patterns and logos
    let enhancedBankName = extractedData.bankName;
    
    // Logo-based recognition
    if (logoAnnotations && logoAnnotations.length > 0) {
      for (const logo of logoAnnotations) {
        const logoName = logo.description?.toLowerCase() || '';
        console.log(`🏦 Detected logo: ${logoName}`);
        
        // Map logo names to bank names
        if (logoName.includes('gtbank') || logoName.includes('guaranty')) {
          enhancedBankName = 'GTBank';
          console.log('✅ Logo recognition: GTBank identified');
        } else if (logoName.includes('access')) {
          enhancedBankName = 'Access Bank';
          console.log('✅ Logo recognition: Access Bank identified');
        }
      }
    }
    
    // Text pattern enhancement with visual context
    const textLower = fullText.toLowerCase();
    
    // Enhanced pattern matching with visual intelligence
    const visualPatterns = [
      // Fintech patterns (often have distinctive UI)
      { patterns: ['opay', 'o-pay', 'o pay'], name: 'OPAY', type: 'fintech' },
      { patterns: ['palmpay', 'palm pay', 'palm-pay'], name: 'PALMPAY', type: 'fintech' },
      { patterns: ['kuda', 'kuda bank'], name: 'Kuda', type: 'fintech' },
      { patterns: ['moniepoint', 'monie point'], name: 'Moniepoint', type: 'fintech' },
      
      // Traditional banks (formal interfaces)
      { patterns: ['gtbank', 'gt bank', 'guaranty trust'], name: 'GTBank', type: 'traditional' },
      { patterns: ['access bank', 'access'], name: 'Access Bank', type: 'traditional' },
      { patterns: ['zenith bank', 'zenith'], name: 'Zenith Bank', type: 'traditional' },
      { patterns: ['uba', 'united bank'], name: 'United Bank for Africa', type: 'traditional' },
      { patterns: ['first bank', 'firstbank'], name: 'First Bank', type: 'traditional' },
    ];
    
    // Find best pattern match
    for (const pattern of visualPatterns) {
      for (const p of pattern.patterns) {
        if (textLower.includes(p)) {
          console.log(`🎯 Visual pattern match: "${p}" → ${pattern.name} (${pattern.type})`);
          enhancedBankName = pattern.name;
          extractedData.confidence += 10; // Boost confidence for visual match
          break;
        }
      }
    }
    
    // Return enhanced data
    return {
      ...extractedData,
      bankName: enhancedBankName,
      confidence: Math.min(extractedData.confidence, 95)
    };
  }
}

export default new CloudVisionService(); 