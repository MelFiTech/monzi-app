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
      console.log('🔍 CloudVision: Starting optimized bank data extraction...');
      
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
      
      if (!textAnnotations || textAnnotations.length === 0) {
        console.warn('⚠️ CloudVision: No text detected in image');
        throw new Error('No text detected in image');
      }

      // Use both text annotations and full text for better accuracy
      const fullText = textAnnotations[0]?.description || '';
      const structuredText = fullTextAnnotation?.text || '';
      const individualTexts = textAnnotations.slice(1).map((annotation: any) => ({
        text: annotation.description,
        confidence: annotation.confidence || 0,
        boundingPoly: annotation.boundingPoly
      }));

      console.log('🔤 CloudVision: Detected text:', fullText);

      // Use optimized parsing with context awareness
      const extractedData = this.parseTextForBankDataOptimized(fullText, structuredText, individualTexts);
      const validatedData = this.validateExtractedData(extractedData);
      
      console.log('✅ CloudVision: Validated data:', validatedData);
      
      return validatedData;
      
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

    // Extract account number
    const accountMatches = text.match(accountNumberPattern);
    if (accountMatches && accountMatches.length > 0) {
      accountNumber = accountMatches[0];
      confidence += 25;
      console.log('✅ CloudVision: Found account number:', accountNumber);
    }

    // Extract bank name
    for (const bank of nigerianBanks) {
      const bankRegex = new RegExp(bank, 'gi');
      if (bankRegex.test(text)) {
        bankName = this.correctBankName(bank);
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
    const nigerianBanks = [
      { names: ['GTBank', 'GTB', 'Guaranty Trust', 'GT Bank', 'G T Bank'], canonical: 'GTBank' },
      { names: ['Access Bank', 'Access', 'ACCESS BANK', 'ACCES BANK'], canonical: 'Access Bank' },
      { names: ['Zenith Bank', 'Zenith', 'ZENITH BANK', 'ZEN1TH'], canonical: 'Zenith Bank' },
      { names: ['UBA', 'United Bank for Africa', 'United Bank', 'U.B.A'], canonical: 'United Bank for Africa' },
      { names: ['First Bank', 'FirstBank', 'FIRST BANK', '1st Bank'], canonical: 'First Bank' },
      { names: ['Fidelity Bank', 'Fidelity', 'FIDELITY BANK'], canonical: 'Fidelity Bank' },
      { names: ['Sterling Bank', 'Sterling', 'STERLING BANK'], canonical: 'Sterling Bank' },
      { names: ['Stanbic IBTC', 'Stanbic', 'STANBIC IBTC BANK'], canonical: 'Stanbic IBTC Bank' },
      { names: ['Union Bank', 'UNION BANK'], canonical: 'Union Bank' },
      { names: ['Wema Bank', 'Wema', 'WEMA BANK'], canonical: 'Wema Bank' },
      { names: ['FCMB', 'First City Monument Bank', 'First City Monument'], canonical: 'FCMB' },
      { names: ['Ecobank', 'ECO BANK', 'ECOBANK'], canonical: 'Ecobank' }
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

    // Extract account number with higher confidence scoring
    const accountMatches = allText.match(accountNumberPattern);
    if (accountMatches && accountMatches.length > 0) {
      // Prefer account numbers that appear with context keywords
      const contextKeywords = ['account', 'number', 'acct', 'a/c'];
      let bestMatch = accountMatches[0];
      let bestScore = 1;
      
      for (const match of accountMatches) {
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
      console.log('✅ CloudVision: Found account number with context:', accountNumber);
    }

    // Extract bank name with fuzzy matching and confidence scoring
    for (const bankGroup of nigerianBanks) {
      let found = false;
      let bestConfidence = 0;
      
      for (const bankVariant of bankGroup.names) {
        // Check both exact and fuzzy matches
        const exactRegex = new RegExp(`\\b${bankVariant}\\b`, 'gi');
        const fuzzyRegex = new RegExp(bankVariant.replace(/\s+/g, '\\s*'), 'gi');
        
        if (exactRegex.test(allText)) {
          bankName = bankGroup.canonical;
          bestConfidence = 30;
          found = true;
          break;
        } else if (fuzzyRegex.test(allText)) {
          bankName = bankGroup.canonical;
          bestConfidence = 20;
          found = true;
        }
      }
      
      if (found) {
        confidence += bestConfidence;
        console.log('✅ CloudVision: Found bank:', bankName);
        break;
      }
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

  private correctBankName(bankName: string): string {
    if (!bankName) return '';
    
    const normalizedName = bankName.toLowerCase().trim();
    
    const bankCorrections: { [key: string]: string } = {
      'gtb': 'GTBank',
      'gtbank': 'GTBank',
      'guaranty trust': 'GTBank',
      'guaranty trust bank': 'GTBank',
      'access': 'Access Bank',
      'access bank': 'Access Bank',
      'zenith': 'Zenith Bank',
      'zenith bank': 'Zenith Bank',
      'uba': 'United Bank for Africa',
      'united bank': 'United Bank for Africa',
      'united bank for africa': 'United Bank for Africa',
      'first bank': 'First Bank',
      'firstbank': 'First Bank',
      'fidelity': 'Fidelity Bank',
      'fidelity bank': 'Fidelity Bank',
      'stanbic': 'Stanbic IBTC Bank',
      'stanbic ibtc': 'Stanbic IBTC Bank',
      'stanbic ibtc bank': 'Stanbic IBTC Bank',
      'sterling': 'Sterling Bank',
      'sterling bank': 'Sterling Bank',
      'union bank': 'Union Bank',
      'wema': 'Wema Bank',
      'wema bank': 'Wema Bank',
      'fcmb': 'FCMB',
      'first city monument bank': 'FCMB',
      'ecobank': 'Ecobank',
      'polaris': 'Polaris Bank',
      'polaris bank': 'Polaris Bank',
      'keystone': 'Keystone Bank',
      'keystone bank': 'Keystone Bank',
      'unity': 'Unity Bank',
      'unity bank': 'Unity Bank',
      'jaiz': 'Jaiz Bank',
      'jaiz bank': 'Jaiz Bank',
      'palmpay': 'PalmPay',
      'palm pay': 'PalmPay',
      'opay': 'Opay',
      'kuda': 'Kuda',
      'vfd': 'VFD Microfinance Bank',
      'vfd microfinance': 'VFD Microfinance Bank',
      'moniepoint': 'Moniepoint',
      'providus': 'Providus Bank',
      'providus bank': 'Providus Bank',
    };

    if (bankCorrections[normalizedName]) {
      return bankCorrections[normalizedName];
    }

    for (const [key, value] of Object.entries(bankCorrections)) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        return value;
      }
    }

    // If no exact match, return the original bank name if it contains banking keywords
    const bankKeywords = ['bank', 'microfinance', 'pay', 'finance'];
    if (bankKeywords.some(keyword => normalizedName.includes(keyword))) {
      return bankName;
    }

    return '';
  }

  private validateExtractedData(data: any): ExtractedBankData {
    const accountNumber = data.accountNumber?.replace(/\D/g, '') || '';
    const isValidAccountNumber = accountNumber.length === 10;

    const amount = data.amount?.replace(/[^\d.]/g, '') || '';

    const correctedBankName = this.correctBankName(data.bankName);

    const accountHolderName = data.accountHolderName?.replace(/^(MR|MRS|DR|PROF|MS)\.?\s+/i, '').trim() || '';

    return {
      bankName: correctedBankName,
      accountNumber: isValidAccountNumber ? accountNumber : '',
      accountHolderName: accountHolderName,
      amount: amount,
      confidence: Math.min(Math.max(data.confidence || 0, 0), 100),
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
}

export default new CloudVisionService(); 