import SmartPromptService from './SmartPromptService';

const GEMINI_API_KEY = 'AIzaSyCkLU3DcoltRSUWjFRaYiS_b0KFvz8q9V8';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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
      console.error('Gemini: Error converting image to base64:', error);
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
      console.log('🧠 Gemini: Starting CONTEXT-AWARE bank data extraction...');
      console.log('📝 Gemini: Using CloudVision as reference context');
      
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
        contents: [
          {
            parts: [
              { text: contextPrompt },
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
          temperature: 0.1, // Low temperature for accuracy
          topK: 16,
          topP: 0.9,
          maxOutputTokens: 1024,
        }
      };

      console.log('📡 Gemini: Making context-aware request...');

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!responseText) {
        throw new Error('No response from Gemini API');
      }

      // Don't log full response to avoid truncation - log length instead
      console.log('🤖 Gemini context-aware response received:', `${responseText.length} characters`);

      const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      
      // Log the cleaned response for debugging
      console.log('🧹 Gemini cleaned response:', cleanedResponse.substring(0, 200) + (cleanedResponse.length > 200 ? '...' : ''));
      
      let extractedData;
      try {
        extractedData = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('❌ Gemini: JSON parsing failed:', parseError);
        console.error('🔍 Gemini: Failed to parse response:', cleanedResponse);
        
        // Try to fix common JSON issues
        const fixedResponse = this.tryFixJsonResponse(cleanedResponse);
        if (fixedResponse) {
          try {
            extractedData = JSON.parse(fixedResponse);
            console.log('✅ Gemini: Successfully fixed and parsed JSON');
          } catch (secondParseError) {
            throw new Error('Invalid JSON response from Gemini');
          }
        } else {
          throw new Error('Invalid JSON response from Gemini');
        }
      }

      console.log('📊 Gemini: Parsed data:', extractedData);

      return this.validateExtractedDataWithContext(extractedData, cloudVisionContext);
    } catch (error) {
      console.error('❌ Gemini: Context-aware extraction failed:', error);
      throw error;
    }
  }

  async extractBankData(imageUri: string): Promise<ExtractedBankData> {
    try {
      console.log('🔍 Gemini: Starting FRESH enhanced bank data extraction...');
      console.log('🔄 Gemini: Processing new image data - NO CACHE USED');
      
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
      
      let extractedData;
      try {
        extractedData = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('❌ JSON parsing failed for response:', cleanedResponse);
        throw new Error('Invalid JSON response from Gemini');
      }

      console.log('📊 Parsed extracted data:', extractedData);

      return this.validateExtractedData(extractedData);
    } catch (error) {
      console.error('❌ Gemini extraction error:', error);
      throw error;
    }
  }

  private validateExtractedDataWithContext(data: any, cloudVisionContext: ExtractedBankData): ExtractedBankData {
    console.log('🔍 Gemini: Validating with CloudVision context...');
    
    // Start with CloudVision data as base
    let result = { ...cloudVisionContext };
    
    // Gemini extracted data
    const geminiAccountNumber = data.accountNumber?.replace(/\D/g, '') || '';
    const isValidGeminiAccountNumber = geminiAccountNumber.length === 10;
    
    // Account Number: Only change if Gemini found a valid one and CloudVision didn't
    if (isValidGeminiAccountNumber && (!cloudVisionContext.accountNumber || cloudVisionContext.accountNumber !== geminiAccountNumber)) {
      console.log('🔄 Gemini: Updating account number from CloudVision context');
      result.accountNumber = geminiAccountNumber;
      result.extractedFields.accountNumber = true;
    }
    
    // Bank Name: Trust Gemini's AI - it knows banks better than our limited list
    // Only use Gemini's bank name if it's different and seems more complete/accurate
    const geminiBankName = data.bankName?.trim() || '';
    if (geminiBankName && 
        geminiBankName !== cloudVisionContext.bankName && 
        data.confidence > 85 &&
        geminiBankName.length > cloudVisionContext.bankName.length) {
      console.log('🔄 Gemini: Using AI-extracted bank name:', geminiBankName);
      result.bankName = geminiBankName;
      result.extractedFields.bankName = Boolean(geminiBankName);
    }
    
    // Account Holder Name: Fill in if missing from CloudVision
    const geminiAccountHolder = data.accountHolderName?.replace(/^(MR|MRS|DR|PROF|MS)\.?\s+/i, '').trim() || '';
    if (geminiAccountHolder && !cloudVisionContext.accountHolderName) {
      console.log('🔄 Gemini: Adding missing account holder name');
      result.accountHolderName = geminiAccountHolder;
      result.extractedFields.accountHolderName = true;
    }
    
    // Amount: Use Gemini if CloudVision missed it
    const geminiAmount = data.amount?.replace(/[^\d.]/g, '') || '';
    if (geminiAmount && !cloudVisionContext.amount) {
      console.log('🔄 Gemini: Adding missing amount');
      result.amount = geminiAmount;
      result.extractedFields.amount = true;
    }
    
    // Weighted confidence: 60% CloudVision, 40% Gemini
    const weightedConfidence = Math.round((cloudVisionContext.confidence * 0.6) + ((data.confidence || 50) * 0.4));
    result.confidence = Math.min(weightedConfidence, 95);
    
    console.log('✅ Gemini: Context-aware validation complete:', result);
    return result;
  }

  private validateExtractedData(data: any): ExtractedBankData {
    console.log('🔍 Gemini: Starting validation...');

    const accountNumber = data.accountNumber?.replace(/\D/g, '') || '';
    const isValidAccountNumber = accountNumber.length === 10;

    const amount = data.amount?.replace(/[^\d.]/g, '') || '';

    // Trust Gemini's AI for bank name - don't apply any corrections
    const bankName = data.bankName?.trim() || '';

    const accountHolderName = data.accountHolderName?.replace(/^(MR|MRS|DR|PROF|MS)\.?\s+/i, '').trim() || '';

    return {
      bankName: bankName, // Use exactly what Gemini extracted
      accountNumber: isValidAccountNumber ? accountNumber : '',
      accountHolderName: accountHolderName,
      amount: amount,
      confidence: Math.min(data.confidence || 50, 95),
      extractedFields: {
        bankName: Boolean(bankName),
        accountNumber: isValidAccountNumber,
        accountHolderName: Boolean(accountHolderName),
        amount: Boolean(amount),
      }
    };
  }

  private tryFixJsonResponse(response: string): string | null {
    try {
      // Common JSON fixes
      let fixed = response;
      
      // Remove any trailing text after the last }
      const lastBraceIndex = fixed.lastIndexOf('}');
      if (lastBraceIndex > -1) {
        fixed = fixed.substring(0, lastBraceIndex + 1);
      }
      
      // Try to close any unclosed quotes or braces
      const openBraces = (fixed.match(/\{/g) || []).length;
      const closeBraces = (fixed.match(/\}/g) || []).length;
      
      if (openBraces > closeBraces) {
        fixed += '}'.repeat(openBraces - closeBraces);
      }
      
      // Try to close unclosed strings
      const quotes = (fixed.match(/"/g) || []).length;
      if (quotes % 2 !== 0) {
        fixed += '"';
      }
      
      // Test if the fix worked
      JSON.parse(fixed);
      return fixed;
    } catch (error) {
      return null;
    }
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

export default GeminiService;