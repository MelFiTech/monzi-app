const GEMINI_API_KEY = 'AIzaSyDsKEEDirE1Y3QLkEZQ66-D-SFgvER-blA';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export interface ExtractedBankData {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  amount?: string;
  confidence: number;
  extractedFields: {
    bankName: boolean;
    accountNumber: boolean;
    accountHolderName: boolean;
    amount: boolean;
  };
}

class GeminiService {
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
      console.error('Error converting image to base64:', error);
      throw new Error('Failed to process image');
    }
  }

  private createIntelligentPrompt(): string {
    return `
You are an EXPERT Nigerian bank document analyzer with 99%+ accuracy rate. 
Your specialty is extracting data from bank cards, statements, and financial documents with ABSOLUTE ZERO tolerance for errors.

CRITICAL MISSION: Extract bank information with surgical precision. If you're not 100% certain, return empty string.

🏦 NIGERIAN BANK VISUAL SIGNATURES (Study these meticulously):

TIER 1 BANKS:
- GTBank/Guaranty Trust Bank: ORANGE/WHITE theme, "GTB" logo, Diamond-shaped logo, Unique font style
- Access Bank: ORANGE/BLUE gradient, Diamond symbol, "ACCESS" text, Modern design
- Zenith Bank: RED dominant color, "ZENITH" in white text, Red/White cards, Premium finish
- UBA (United Bank for Africa): RED/BLACK theme, "UBA" logo, Pan-African branding, Lion symbol
- First Bank: ROYAL BLUE/WHITE, Elephant logo/symbol, "FIRSTBANK" text, Heritage design
- Fidelity Bank: GREEN primary color, "FIDELITY" text, Professional layout
- Stanbic IBTC: BLUE/WHITE, "STANBIC IBTC" branding, Corporate style
- Sterling Bank: GREEN/ORANGE combination, "STERLING" text, Modern aesthetic

TIER 2 BANKS:
- Union Bank: NAVY BLUE, "UNION BANK" text, Traditional design
- Wema Bank: PURPLE/VIOLET branding, "WEMA" text, Digital-forward look
- FCMB: YELLOW/BLUE combo, "FCMB" acronym, Corporate style
- Ecobank: BLUE/GREEN, "ECOBANK" pan-African branding, Global look
- Polaris Bank: BLUE theme, "POLARIS" text, Contemporary design
- Keystone Bank: RED branding, "KEYSTONE" text, Bold typography
- Unity Bank: GREEN, "UNITY BANK" text, Clean layout
- Jaiz Bank: GREEN/GOLD, Islamic banking, "JAIZ" text, Unique identity
- Providus Bank: BLUE/GOLD, "PROVIDUS" text, Premium banking style

FINTECH/DIGITAL BANKS:
- PalmPay: BRIGHT GREEN/WHITE, "PalmPay" text, Modern fintech styling
- Opay: BLUE/CYAN, "Opay" modern font, Digital wallet aesthetic
- Kuda: PURPLE/WHITE, "KUDA" minimalist design, Digital-first
- VFD Microfinance: BLUE, "VFD" text, Professional fintech look
- Moniepoint: GREEN, "Moniepoint" text, Modern banking design

🔍 ENHANCED EXTRACTION RULES:

1. ACCOUNT NUMBERS: 
   - Nigerian NUBAN: STRICTLY 10 digits
   - Pattern recognition: Look for consistent spacing, font style
   - Context validation: Position on document/card
   - STRICT REJECTION: Any number not exactly 10 digits
   - Double verification against bank-specific patterns

2. BANK NAMES:
   - Multi-point verification:
     * Visual branding match
     * Color scheme confirmation
     * Logo identification
     * Text pattern recognition
   - Advanced fuzzy matching with confidence threshold
   - Cross-reference with official bank registry

3. ACCOUNT HOLDER NAMES:
   - Full name extraction (First + Last minimum)
   - Advanced name cleaning:
     * Remove all titles (MR/MRS/DR/PROF)
     * Correct capitalization
     * Remove special characters
     * Validate against Nigerian name patterns

4. AMOUNTS:
   - Precision extraction:
     * Remove all currency symbols
     * Standardize number format
     * Validate decimal places
     * Context-aware amount recognition

🎯 ENHANCED CONFIDENCE SCORING:
- 95-100: Crystal clear data, multiple confirmation points
- 90-94: Very clear data, single minor uncertainty
- 85-89: Clear data with minimal ambiguity
- Below 85: Return something close to the correct data, but not empty strings
-Be accurate

Return ONLY this JSON (no explanation):
{
  "bankName": "exact bank name from approved list or empty string",
  "accountNumber": "exactly 10 digits or empty string", 
  "accountHolderName": "full clean name or empty string",
  "amount": "numerical value only or empty string",
  "confidence": number_between_0_and_100,
  "extractedFields": {
    "bankName": boolean,
    "accountNumber": boolean, 
    "accountHolderName": boolean,
    "amount": boolean
  }
}

CRITICAL: Accuracy is ABSOLUTE PRIORITY. Return empty string if 90% confidence cannot be achieved.
`;
  }

  async extractBankData(imageUri: string): Promise<ExtractedBankData> {
    try {
      console.log('🔍 Starting enhanced bank data extraction...');
      
      const base64Image = await this.convertImageToBase64(imageUri);
      
      const requestBody = {
        contents: [
          {
            parts: [
              { text: this.createIntelligentPrompt() },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.05, // Reduced for higher precision
          topK: 16, // Reduced for more focused results
          topP: 0.9, // Adjusted for better accuracy
          maxOutputTokens: 1024,
        }
      };

      console.log('📡 Making enhanced request to Gemini API...');

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📨 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API error response:', errorText);
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 Full API response:', JSON.stringify(data, null, 2));
      
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) {
        console.error('❌ No response text found in:', data);
        throw new Error('No response from Gemini API');
      }

      console.log('🤖 Gemini response text:', responseText);

      const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      let extractedData: ExtractedBankData;
      
      try {
        extractedData = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('❌ Raw response:', cleanedResponse);
        throw new Error('Failed to parse Gemini response');
      }

      const validatedData = this.validateExtractedData(extractedData);
      console.log('✅ Validated data:', validatedData);
      
      return validatedData;
      
    } catch (error) {
      console.error('❌ Error extracting bank data:', error);
      
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
           data.confidence >= 90; // Increased threshold for higher accuracy
  }
}

export default new GeminiService();