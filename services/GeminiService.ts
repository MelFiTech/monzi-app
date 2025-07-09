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
You are an expert at analyzing Nigerian bank documents and financial instruments. 
Analyze this image and extract the following information with high accuracy:

LOOK FOR THESE NIGERIAN BANKS BY THEIR VISUAL IDENTITY:
- GTBank (Orange/White branding, GTB logo)
- Access Bank (Orange/Blue branding, Diamond logo)
- Zenith Bank (Red branding, Zenith logo)
- UBA (Red/Black branding, UBA logo)
- First Bank (Blue/White branding, Elephant logo)
- Fidelity Bank (Green branding)
- Stanbic IBTC (Blue/White branding)
- Sterling Bank (Green/Orange branding)
- Union Bank (Blue branding)
- Wema Bank (Purple branding)
- FCMB (Yellow/Blue branding)
- Ecobank (Blue/Green branding)
- Polaris Bank (Blue branding)
- Keystone Bank (Red branding)
- Unity Bank (Green branding)
- Jaiz Bank (Green/Gold Islamic branding)
- PalmPay (Green/White fintech branding)
- Opay (Blue fintech branding)
- Kuda (Purple fintech branding)

EXTRACT THESE FIELDS:
1. BANK NAME: Look for logos, colors, watermarks, and text
2. ACCOUNT NUMBER: Nigerian banks use 10-digit NUBAN format
3. ACCOUNT HOLDER NAME: Full name of account owner
4. AMOUNT: Any monetary value in Naira (₦) or Dollar ($) format

DOCUMENT TYPES TO EXPECT:
- ATM/Debit cards
- Bank statements
- Transfer receipts
- Cheques
- Account opening forms
- Mobile banking screenshots

Return ONLY valid JSON in this exact format:
{
  "bankName": "extracted bank name or empty string",
  "accountNumber": "10-digit number or empty string", 
  "accountHolderName": "full name or empty string",
  "amount": "amount without currency symbol or empty string",
  "confidence": number between 0-100,
  "extractedFields": {
    "bankName": boolean,
    "accountNumber": boolean, 
    "accountHolderName": boolean,
    "amount": boolean
  }
}

IMPORTANT: 
- Return empty string for fields you cannot confidently extract
- Set extractedFields boolean to true only if you found that field
- Confidence should reflect overall extraction accuracy
- For amounts, extract only the numerical value (remove ₦, $, commas)
`;
  }

  async extractBankData(imageUri: string): Promise<ExtractedBankData> {
    try {
      console.log('🔍 Starting bank data extraction...');
      
      // Convert image to base64
      const base64Image = await this.convertImageToBase64(imageUri);
      
      // Prepare request payload for Gemini 1.5 Flash
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
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1024,
        }
      };

      console.log('📡 Making request to Gemini API...');

      // Make API request to Gemini
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
      
      // Extract response text
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) {
        console.error('❌ No response text found in:', data);
        throw new Error('No response from Gemini API');
      }

      console.log('🤖 Gemini response text:', responseText);

      // Parse JSON response
      const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      let extractedData: ExtractedBankData;
      
      try {
        extractedData = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('❌ Raw response:', cleanedResponse);
        throw new Error('Failed to parse Gemini response');
      }

      // Validate and sanitize extracted data
      const validatedData = this.validateExtractedData(extractedData);
      console.log('✅ Validated data:', validatedData);
      
      return validatedData;
      
    } catch (error) {
      console.error('❌ Error extracting bank data:', error);
      
      // Return empty result on error
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

  private validateExtractedData(data: any): ExtractedBankData {
    // Validate account number (must be 10 digits for Nigerian banks)
    const accountNumber = data.accountNumber?.replace(/\D/g, '') || '';
    const isValidAccountNumber = accountNumber.length === 10;

    // Clean amount (remove non-numeric except decimal point)
    const amount = data.amount?.replace(/[^\d.]/g, '') || '';

    return {
      bankName: data.bankName || '',
      accountNumber: isValidAccountNumber ? accountNumber : '',
      accountHolderName: data.accountHolderName || '',
      amount: amount,
      confidence: Math.min(Math.max(data.confidence || 0, 0), 100),
      extractedFields: {
        bankName: Boolean(data.bankName && data.bankName.trim()),
        accountNumber: isValidAccountNumber,
        accountHolderName: Boolean(data.accountHolderName && data.accountHolderName.trim()),
        amount: Boolean(amount),
      }
    };
  }

  // Helper method to format extracted data for display
  formatExtractedAmount(amount: string): string {
    if (!amount) return '';
    const num = parseFloat(amount);
    if (isNaN(num)) return '';
    return num.toLocaleString();
  }

  // Check if extraction has minimum required data
  isExtractionValid(data: ExtractedBankData): boolean {
    return data.extractedFields.bankName && 
           data.extractedFields.accountNumber && 
           data.confidence > 70;
  }
}

export default new GeminiService(); 