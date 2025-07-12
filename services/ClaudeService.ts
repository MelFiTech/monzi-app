import { ExtractedBankData } from './GeminiService';

class ClaudeService {
  private readonly API_URL = 'https://api.anthropic.com/v1/messages';
  private readonly API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;
  private readonly MODEL = 'claude-3-haiku-20240307'; // Faster model
  private readonly MAX_TOKENS = 500; // Reduced for speed

  async extractBankData(imageUri: string): Promise<ExtractedBankData> {
    try {
      console.log('🧠 Claude: Starting Nigerian bank data extraction...');
      
      if (!this.API_KEY) {
        throw new Error('Claude API key not configured');
      }

      const base64Image = await this.convertImageToBase64(imageUri);
      
      const prompt = `Extract Nigerian bank details from this image. Focus on:

1. BANK NAME: Look for bank logos, names, or distinctive colors (GTBank=orange, UBA=red, Zenith=blue, Access=orange, etc.)
2. ACCOUNT NUMBER: Find the 10-digit account number
3. ACCOUNT HOLDER: Person/company name if visible
4. AMOUNT: Any monetary values if present

Output EXACTLY in this format:
BANK NAME: [name] (Confidence: High/Medium/Low)  
ACCOUNT NUMBER: [10 digits]
ACCOUNT HOLDER: [name]
AMOUNT: [amount]

Be concise. If not found, write "Not found".`;

      console.log('📡 Claude: Making request to Anthropic API...');

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.MODEL,
          max_tokens: this.MAX_TOKENS,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }]
        })
      });

      console.log('📨 Claude: Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Claude: API error response:', errorText);
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 Claude: Full API response received');
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        console.warn('⚠️ Claude: No content in response');
        throw new Error('No content in Claude response');
      }

      const extractedText = data.content[0].text;
      console.log('🔤 Claude: Extracted text:', extractedText);

      // Parse the structured response
      const parsedData = this.parseClaudeResponse(extractedText);
      const validatedData = this.validateExtractedData(parsedData);
      
      console.log('✅ Claude: Validated data:', validatedData);
      
      return validatedData;
      
    } catch (error) {
      console.error('❌ Claude: Error extracting bank data:', error);
      
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

  private parseClaudeResponse(text: string): any {
    console.log('🔍 Claude: Parsing structured response...');
    
    let bankName = '';
    let accountNumber = '';
    let accountHolderName = '';
    let amount = '';
    let confidence = 0;

    // Extract bank name with confidence
    const bankNameMatch = text.match(/BANK NAME:\s*([^(]+?)(?:\s*\(Confidence:\s*(\w+)\))?/i);
    if (bankNameMatch && bankNameMatch[1].trim() !== 'Not found') {
      bankName = this.correctBankName(bankNameMatch[1].trim());
      const confidenceLevel = bankNameMatch[2]?.toLowerCase();
      if (confidenceLevel === 'high') confidence += 45;
      else if (confidenceLevel === 'medium') confidence += 30;
      else if (confidenceLevel === 'low') confidence += 20;
      console.log('✅ Claude: Found bank name:', bankName, 'Confidence:', confidenceLevel);
    }

    // Extract account number
    const accountMatch = text.match(/ACCOUNT NUMBER:\s*(\d{10}|Not found)/i);
    if (accountMatch && accountMatch[1] !== 'Not found' && /^\d{10}$/.test(accountMatch[1])) {
      accountNumber = accountMatch[1];
      confidence += 35;
      console.log('✅ Claude: Found account number:', accountNumber);
    }

    // Extract account holder name
    const holderMatch = text.match(/ACCOUNT HOLDER:\s*([^\n]+)/i);
    if (holderMatch && holderMatch[1].trim() !== '[Account holder name if visible]') {
      accountHolderName = holderMatch[1].trim();
      confidence += 15;
      console.log('✅ Claude: Found account holder:', accountHolderName);
    }

    // Extract amount if present
    const amountMatches = [
      /AMOUNT:\s*(?:₦|N|NGN)?\s*([0-9,]+(?:\.\d{2})?)/i,
      /(?:₦|N|NGN)\s*([0-9,]+(?:\.\d{2})?)/gi,
      /([0-9,]+(?:\.\d{2})?)\s*(?:₦|N|NGN)/gi
    ];

    for (const pattern of amountMatches) {
      const amountMatch = text.match(pattern);
      if (amountMatch) {
        amount = amountMatch[1].replace(/,/g, '');
        confidence += 15;
        console.log('✅ Claude: Found amount:', amount);
        break;
      }
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
    const bankMap: { [key: string]: string } = {
      'gtbank': 'GTBank',
      'gt bank': 'GTBank', 
      'guaranty trust': 'GTBank',
      'guaranty trust bank': 'GTBank',
      'access bank': 'Access Bank',
      'access': 'Access Bank',
      'diamond bank': 'Access Bank', // Merged
      'uba': 'United Bank for Africa',
      'united bank for africa': 'United Bank for Africa',
      'zenith bank': 'Zenith Bank',
      'zenith': 'Zenith Bank',
      'first bank': 'First Bank',
      'firstbank': 'First Bank',
      'fidelity bank': 'Fidelity Bank',
      'fidelity': 'Fidelity Bank',
      'sterling bank': 'Sterling Bank',
      'sterling': 'Sterling Bank',
      'stanbic ibtc': 'Stanbic IBTC Bank',
      'stanbic': 'Stanbic IBTC Bank',
      'union bank': 'Union Bank',
      'wema bank': 'Wema Bank',
      'wema': 'Wema Bank',
      'fcmb': 'FCMB',
      'first city monument bank': 'FCMB',
      'ecobank': 'Ecobank',
      'providus bank': 'Providus Bank',
      'providus': 'Providus Bank',
      'polaris bank': 'Polaris Bank',
      'polaris': 'Polaris Bank',
      'keystone bank': 'Keystone Bank',
      'unity bank': 'Unity Bank',
      'jaiz bank': 'Jaiz Bank',
      'palmPay': 'PalmPay',
      'opay': 'Opay',
      'kuda': 'Kuda Bank',
      'kuda bank': 'Kuda Bank'
    };

    const normalized = bankName.toLowerCase().trim();
    return bankMap[normalized] || bankName;
  }

  private validateExtractedData(data: any): ExtractedBankData {
    const { bankName, accountNumber, accountHolderName, amount, confidence } = data;
    
    // Validate account number (should be 10 digits for Nigerian banks)
    const isValidAccountNumber = /^\d{10}$/.test(accountNumber);
    
    return {
      bankName: bankName || '',
      accountNumber: isValidAccountNumber ? accountNumber : '',
      accountHolderName: accountHolderName || '',
      amount: amount || '',
      confidence: Math.max(confidence, 0),
      extractedFields: {
        bankName: !!bankName,
        accountNumber: isValidAccountNumber,
        accountHolderName: !!accountHolderName,
        amount: !!amount
      }
    };
  }

  private async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      console.log('🔄 Claude: Converting image to base64...');
      
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // Convert to base64
      let binary = '';
      bytes.forEach(byte => binary += String.fromCharCode(byte));
      const base64 = btoa(binary);
      
      console.log('✅ Claude: Image converted to base64');
      return base64;
    } catch (error) {
      console.error('❌ Claude: Error converting image to base64:', error);
      throw error;
    }
  }
}

export default new ClaudeService(); 