export interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  showInput?: boolean;
  inputType?: 'text' | 'email' | 'password' | 'phone' | 'otp';
  inputPlaceholder?: string;
  completed?: boolean;
}

export interface UserData {
  email: string;
  otp: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface AuthFlowStep {
  question: string;
  inputType: 'text' | 'email' | 'password' | 'phone' | 'otp';
  placeholder: string;
  field: keyof UserData;
}

export class ChatService {
  private static instance: ChatService;
  
  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  private constructor() {}

  public getAuthFlow(): AuthFlowStep[] {
    return [
      {
        question: "Hi there! 👋 Welcome to Snap & Go!\n\nI'll help you set up your account. Let's start with your email address.",
        inputType: 'email',
        placeholder: 'Enter your email',
        field: 'email',
      },
      {
        question: "Perfect! I've sent a verification code to your email. Please enter the 6-digit code to continue.",
        inputType: 'otp',
        placeholder: 'Enter 6-digit code',
        field: 'otp',
      },
      {
        question: "Great! Your email is verified. Now, what's your first name?",
        inputType: 'text',
        placeholder: 'Enter your first name',
        field: 'firstName',
      },
      {
        question: "Nice to meet you! What's your last name?",
        inputType: 'text',
        placeholder: 'Enter your last name',
        field: 'lastName',
      },
      {
        question: "What's your phone number? This helps us keep your account secure.",
        inputType: 'phone',
        placeholder: 'Enter your phone number',
        field: 'phone',
      },
      {
        question: "Almost done! Create a secure password for your account.",
        inputType: 'password',
        placeholder: 'Create password',
        field: 'password',
      },
      {
        question: "Just to be safe, please confirm your password.",
        inputType: 'password',
        placeholder: 'Confirm password',
        field: 'confirmPassword',
      },
    ];
  }

  public validateInput(input: string, field: keyof UserData, userData: UserData): { isValid: boolean; errorMessage?: string } {
    switch (field) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input)) {
          return {
            isValid: false,
            errorMessage: "Hmm, that doesn't look like a valid email address. Could you try again?"
          };
        }
        break;
        
      case 'otp':
        if (input.length !== 6 || !/^\d{6}$/.test(input)) {
          return {
            isValid: false,
            errorMessage: "Please enter a valid 6-digit verification code."
          };
        }
        // Note: In a real app, you would verify the OTP with your backend
        break;
        
      case 'firstName':
      case 'lastName':
        if (input.trim().length < 2) {
          return {
            isValid: false,
            errorMessage: "Please enter at least 2 characters."
          };
        }
        break;
        
      case 'phone':
        const phoneRegex = /^\+?[\d\s-()]{10,}$/;
        if (!phoneRegex.test(input) || input.replace(/\D/g, '').length < 10) {
          return {
            isValid: false,
            errorMessage: "Please enter a valid phone number with at least 10 digits."
          };
        }
        break;
        
      case 'password':
        if (input.length < 6) {
          return {
            isValid: false,
            errorMessage: "Your password should be at least 6 characters long. Please try again."
          };
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(input)) {
          return {
            isValid: false,
            errorMessage: "Your password should contain at least one uppercase letter, one lowercase letter, and one number."
          };
        }
        break;
        
      case 'confirmPassword':
        if (input !== userData.password) {
          return {
            isValid: false,
            errorMessage: "The passwords don't match. Please enter the same password again."
          };
        }
        break;
    }
    
    return { isValid: true };
  }

  public createMessage(
    text: string, 
    isBot: boolean, 
    showInput: boolean = false,
    inputType?: AuthFlowStep['inputType'],
    placeholder?: string
  ): Message {
    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      isBot,
      timestamp: new Date(),
      showInput,
      inputType,
      inputPlaceholder: placeholder,
    };
  }

  public getSuccessMessage(): string {
    return "Awesome! 🎉 Your account has been created successfully!\n\nYou can now start using Snap & Go to send money with just a photo!";
  }

  public async simulateTypingDelay(): Promise<void> {
    // Random delay between 1-2 seconds to simulate human-like typing
    const delay = Math.random() * 1000 + 1000;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  public async simulateOTPVerification(otp: string): Promise<{ success: boolean; message?: string }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // For demo purposes, accept any 6-digit code
    // In production, this would make an actual API call
    if (otp.length === 6 && /^\d{6}$/.test(otp)) {
      return { success: true };
    }
    
    return { 
      success: false, 
      message: "Invalid verification code. Please try again." 
    };
  }

  public async registerUser(userData: UserData): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In production, this would make an actual API call to register the user
      const user = {
        id: Date.now().toString(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        createdAt: new Date(),
      };
      
      return { success: true, user };
    } catch (error) {
      return { 
        success: false, 
        error: "Failed to create account. Please try again later." 
      };
    }
  }

  public formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    // Format international numbers
    if (cleaned.length > 10) {
      return `+${cleaned.slice(0, -10)} (${cleaned.slice(-10, -7)}) ${cleaned.slice(-7, -4)}-${cleaned.slice(-4)}`;
    }
    
    return phone;
  }

  public sanitizeInput(input: string, inputType: AuthFlowStep['inputType']): string {
    switch (inputType) {
      case 'email':
        return input.toLowerCase().trim();
      case 'phone':
        return input.replace(/[^\d+\-\s()]/g, '');
      case 'otp':
        return input.replace(/\D/g, '').slice(0, 6);
      case 'text':
        return input.trim().replace(/\s+/g, ' ');
      default:
        return input.trim();
    }
  }
}

export default ChatService.getInstance(); 