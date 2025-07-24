import SmartPromptService from './SmartPromptService';

// OpenAI API configuration
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

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

class OpenAIService {
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
      console.error('OpenAI: Error converting image to base64:', error);
      throw new Error('Failed to process image');
    }
  }

  private async createIntelligentPrompt(): Promise<string> {
    const smartPrompts = await SmartPromptService.generateGeminiPrompt();

    return `You are an expert at extracting Nigerian bank transfer details from images. Use ALL visual clues to accurately identify banks.

VISUAL RECOGNITION STRATEGY:
🎨 **Colors & Branding:**
- OPAY: Green/lime green background, white text
- PALMPAY: Purple/violet branding, white text
- Kuda: Purple branding, modern minimalist design
- GTBank: Orange/red branding, "GT" logo
- Access Bank: Orange diamond logo, blue/orange colors
- Zenith Bank: Blue branding, "ZENITH" in blue
- UBA: Red branding, "UBA" in red/white
- First Bank: Blue and gold, "FIRST BANK" text
- Moniepoint: Blue branding, clean design

📱 **App Interface Patterns:**
- Mobile money apps: Clean, modern UI with large buttons
- Traditional bank apps: More formal layout, bank logos prominent
- Fintech apps: Colorful, user-friendly design

🏦 **Logo Recognition:**
- Look for bank logos, even if partially visible
- Recognize brand patterns and color schemes
- Identify unique design elements

EXTRACTION INSTRUCTIONS:
1. **Analyze visual elements FIRST** - colors, logos, patterns
2. **Match visual cues to known Nigerian banks** 
3. **Extract bank names using visual + text recognition**
4. **Be intelligent about brand recognition** - you know Nigerian bank designs
5. **If you see green/lime interface → likely OPAY**
6. **If you see purple interface → likely PALMPAY or Kuda**
7. **If you see orange elements → likely GTBank or Access Bank**
8. **Use visual context to disambiguate similar text**

REQUIRED FIELDS:
- Bank Name: Use visual recognition + text to get EXACT bank name
- Account Number: 10-digit account number only
- Account Holder Name: Full name of account owner
- Amount: Transaction amount if visible

BANK NAME INTELLIGENCE:
- Trust your visual recognition of Nigerian bank interfaces
- Match colors/logos to correct bank names
- Extract complete bank names (e.g., "Opay Digital Services Limited")
- Use brand recognition to correct unclear text
- If visual cues suggest OPAY but text says "PAY" → use "OPAY"
- If you see GTBank orange but text unclear → use "GTBank"

RESPONSE FORMAT:
{
  "bankName": "Exact bank name based on visual + text recognition",
  "accountNumber": "1234567890", 
  "accountHolderName": "Full Name",
  "amount": "0000.00",
  "confidence": 95,
  "visualCues": "Brief description of visual elements that helped identify the bank"
}

${smartPrompts}

Use your AI knowledge of Nigerian bank designs, colors, and patterns to make intelligent bank identification.`;
  }

  async extractBankDataWithContext(imageUri: string, cloudVisionContext: ExtractedBankData): Promise<ExtractedBankData> {
    try {
      console.log('🤖 OpenAI: Starting CONTEXT-AWARE bank data extraction...');
      console.log('📝 OpenAI: Using CloudVision as reference context');
      
      const base64Image = await this.convertImageToBase64(imageUri);
      
      const contextPrompt = `You are an intelligent bank data extraction assistant. You have access to initial OCR results from CloudVision, but your job is to be smarter and more accurate using VISUAL RECOGNITION.

CLOUDVISION CONTEXT (use as reference):
- Bank Name: "${cloudVisionContext.bankName}"
- Account Number: "${cloudVisionContext.accountNumber}" 
- Account Holder Name: "${cloudVisionContext.accountHolderName}"
- Amount: "${cloudVisionContext.amount || 'Not found'}"
- CloudVision Confidence: ${cloudVisionContext.confidence}%

VISUAL INTELLIGENCE STRATEGY:
🎨 **Analyze Colors & Branding:**
- Green/lime interface → OPAY Digital Services
- Purple/violet → PALMPAY or Kuda
- Orange/red → GTBank or Access Bank  
- Blue → Zenith Bank, UBA, or First Bank
- Look for distinctive color patterns

🏦 **Logo & Pattern Recognition:**
- Identify bank logos even if text is unclear
- Match interface design to known Nigerian banks
- Use brand colors to confirm/correct bank names
- Modern fintech UI vs traditional bank layout

🧠 **Smart Bank Identification:**
- If CloudVision says "Access" but you see green → likely OPAY, not Access
- If you see orange but text unclear → check for GTBank vs Access Bank logos
- Purple interface with modern design → likely PALMPAY or Kuda
- Use visual cues to validate or correct CloudVision results

YOUR ENHANCED TASK:
1. **Use CloudVision as starting point** - they got the text extraction
2. **Apply visual intelligence** - you can see colors, patterns, logos
3. **Cross-reference visual cues with text** to get accurate bank names
4. **Correct CloudVision if visual evidence is strong** (90%+ confidence)
5. **Fill in missing account holder names** using your superior text recognition
6. **Trust your visual analysis** - you can see what CloudVision text-only OCR might miss

BANK NAME CORRECTION EXAMPLES:
- CloudVision: "Access" + Visual: Green interface → "OPAY Digital Services Limited"
- CloudVision: "Pay" + Visual: Purple design → "PALMPAY"  
- CloudVision: "GT" + Visual: Orange branding → "GTBank"
- CloudVision: "Zenith" + Visual: Blue interface → "Zenith Bank"

INSTRUCTIONS:
- Use CloudVision bank name as baseline
- Apply visual intelligence to verify/correct bank identification
- Only override CloudVision if visual evidence is compelling
- Preserve all parts of bank names (full official names)
- Fill in missing account holder names with your enhanced recognition

Return JSON with this structure:
{
  "bankName": "Visually-verified bank name",
  "accountNumber": "1234567890",
  "accountHolderName": "Full Name", 
  "amount": "0000.00",
  "confidence": 95,
  "visualCues": "Description of visual elements used for bank identification",
  "reasoning": "Why this bank name is correct based on visual + text analysis"
}`;

      const requestBody = {
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: contextPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1024,
        temperature: 0.1,
        response_format: { type: "json_object" }
      };

      console.log('📡 OpenAI: Making context-aware request...');

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenAI: API error response:', errorText);
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content;
      
      if (!responseText) {
        throw new Error('No response from OpenAI API');
      }

      console.log('🤖 OpenAI context-aware response received:', `${responseText.length} characters`);

      let extractedData;
      try {
        extractedData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ OpenAI: JSON parsing failed:', parseError);
        console.error('🔍 OpenAI: Failed to parse response:', responseText);
        
        // Try to fix common JSON issues
        const fixedResponse = this.tryFixJsonResponse(responseText);
        if (fixedResponse) {
          try {
            extractedData = JSON.parse(fixedResponse);
            console.log('✅ OpenAI: Successfully fixed and parsed JSON');
          } catch (secondParseError) {
            throw new Error('Invalid JSON response from OpenAI');
          }
        } else {
          throw new Error('Invalid JSON response from OpenAI');
        }
      }

      console.log('📊 OpenAI: Parsed data:', extractedData);

      return this.validateExtractedDataWithContext(extractedData, cloudVisionContext);
    } catch (error) {
      console.error('❌ OpenAI: Error extracting bank data with context:', error);
      throw error;
    }
  }

  async extractBankData(imageUri: string): Promise<ExtractedBankData> {
    try {
      console.log('🤖 OpenAI: Starting FRESH bank data extraction...');
      
      const base64Image = await this.convertImageToBase64(imageUri);
      const prompt = await this.createIntelligentPrompt();

      const requestBody = {
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1024,
        temperature: 0.1,
        response_format: { type: "json_object" }
      };

      console.log('📡 OpenAI: Making request...');

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenAI: API error response:', errorText);
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content;
      
      if (!responseText) {
        throw new Error('No response from OpenAI API');
      }

      console.log('🤖 OpenAI response received:', `${responseText.length} characters`);

      let extractedData;
      try {
        extractedData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ OpenAI: JSON parsing failed:', parseError);
        console.error('🔍 OpenAI: Failed to parse response:', responseText);
        
        // Try to fix common JSON issues
        const fixedResponse = this.tryFixJsonResponse(responseText);
        if (fixedResponse) {
          try {
            extractedData = JSON.parse(fixedResponse);
            console.log('✅ OpenAI: Successfully fixed and parsed JSON');
          } catch (secondParseError) {
            throw new Error('Invalid JSON response from OpenAI');
          }
        } else {
          throw new Error('Invalid JSON response from OpenAI');
        }
      }

      console.log('📊 OpenAI: Parsed data:', extractedData);

      return this.validateExtractedData(extractedData);
    } catch (error) {
      console.error('❌ OpenAI: Error extracting bank data:', error);
      throw error;
    }
  }

  private validateExtractedDataWithContext(data: any, cloudVisionContext: ExtractedBankData): ExtractedBankData {
    console.log('🔍 OpenAI: Validating extracted data with context...');

    // Sanitize account number - remove spaces, dashes, etc., keep only digits
    const rawAccountNumber = data.accountNumber || cloudVisionContext.accountNumber || '';
    const sanitizedAccountNumber = rawAccountNumber.replace(/\D/g, '');
    
    console.log(`[OpenAI] Account number sanitization: "${rawAccountNumber}" → "${sanitizedAccountNumber}" (${sanitizedAccountNumber.length} digits)`);

    const validatedData: ExtractedBankData = {
      bankName: data.bankName || cloudVisionContext.bankName || '',
      accountNumber: sanitizedAccountNumber,
      accountHolderName: data.accountHolderName || cloudVisionContext.accountHolderName || '',
      amount: data.amount || cloudVisionContext.amount || '',
      confidence: Math.min(Math.max(data.confidence || 0, 0), 100),
      extractedFields: {
        bankName: !!(data.bankName || cloudVisionContext.bankName),
        accountNumber: !!(sanitizedAccountNumber && sanitizedAccountNumber.length === 10),
        accountHolderName: !!(data.accountHolderName || cloudVisionContext.accountHolderName),
        amount: !!(data.amount || cloudVisionContext.amount),
      }
    };

    // Log validation results
    console.log('✅ OpenAI: Validation complete');
    console.log('📊 OpenAI: Extracted fields:', validatedData.extractedFields);
    console.log('📊 OpenAI: Confidence:', validatedData.confidence);

    return validatedData;
  }

  private validateExtractedData(data: any): ExtractedBankData {
    console.log('🔍 OpenAI: Validating extracted data...');

    const validatedData: ExtractedBankData = {
      bankName: data.bankName || '',
      accountNumber: data.accountNumber || '',
      accountHolderName: data.accountHolderName || '',
      amount: data.amount || '',
      confidence: Math.min(Math.max(data.confidence || 0, 0), 100),
      extractedFields: {
        bankName: !!data.bankName,
        accountNumber: !!data.accountNumber,
        accountHolderName: !!data.accountHolderName,
        amount: !!data.amount,
      }
    };

    // Log validation results
    console.log('✅ OpenAI: Validation complete');
    console.log('📊 OpenAI: Extracted fields:', validatedData.extractedFields);
    console.log('📊 OpenAI: Confidence:', validatedData.confidence);

    return validatedData;
  }

  private tryFixJsonResponse(response: string): string | null {
    console.log('🔧 OpenAI: Attempting to fix JSON response...');
    
    // Remove markdown code blocks
    let cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    
    // Try to find JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    
    // Basic validation
    try {
      JSON.parse(cleaned);
      console.log('✅ OpenAI: JSON fix successful');
      return cleaned;
    } catch (error) {
      console.log('❌ OpenAI: JSON fix failed');
      return null;
    }
  }

  formatExtractedAmount(amount: string): string {
    if (!amount) return '';
    return amount.replace(/[^\d.]/g, '');
  }

  isExtractionValid(data: ExtractedBankData): boolean {
    return data.extractedFields.bankName && data.extractedFields.accountNumber;
  }
}

export default OpenAIService; 