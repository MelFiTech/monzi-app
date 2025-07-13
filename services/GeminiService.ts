import SmartPromptService from './SmartPromptService';

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

  private async createIntelligentPrompt(): Promise<string> {
    // Use smart prompt service with pattern learning
    const smartPrompt = await SmartPromptService.generateGeminiPrompt();
    return smartPrompt;
  }

  async extractBankData(imageUri: string): Promise<ExtractedBankData> {
    try {
      console.log('🔍 Starting enhanced bank data extraction...');
      
      const base64Image = await this.convertImageToBase64(imageUri);
      
      const requestBody = {
        contents: [
          {
            parts: [
              { text: await this.createIntelligentPrompt() },
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