# Auth Integration Implementation Guide

## Overview

This guide documents the complete authentication flow integration with React Query, biometric authentication, and smart device detection. The system handles both new and existing users with automatic authentication capabilities.

## 🏗️ Architecture

### Core Services

1. **AuthService** (`services/AuthService.ts`)
   - Handles all API calls to authentication endpoints
   - Validates input data (email, phone numbers, passcodes)
   - Formats Nigerian phone numbers automatically
   - Provides comprehensive error handling

2. **AuthStorageService** (`services/AuthStorageService.ts`)
   - Manages secure storage of authentication tokens
   - Tracks device information and user history
   - Handles biometric preferences
   - Provides device first-time detection

3. **BiometricService** (`services/BiometricService.ts`)
   - Handles biometric authentication (Face ID/Touch ID/Fingerprint)
   - Cross-platform support for iOS and Android
   - Integrated with auth storage for seamless experience

### React Query Hooks

**AuthService Hooks** (`hooks/useAuthService.ts`)
- `useLogin()` - User login with email + 6-digit passcode
- `useRegister()` - User registration with all required fields
- `useVerifyOtp()` - SMS OTP verification
- `useResendOtp()` - Resend SMS OTP
- `useProfile()` - Get user profile
- `useAuthStatus()` - Get authentication status
- `useLogout()` - Logout functionality
- `useBiometricAuth()` - Biometric authentication
- `useAuth()` - Combined hook with all auth operations

## 📱 API Endpoints

### Registration
```typescript
POST /auth/register
{
  email: string;           // Valid email address
  phone: string;           // +234XXXXXXXXXX format
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string;     // YYYY-MM-DD format
  passcode: string;        // 6-digit numeric
}
```

### Login
```typescript
POST /auth/login
{
  email: string;           // Valid email address
  passcode: string;        // 6-digit numeric
}
```

### OTP Verification
```typescript
POST /auth/verify-otp
{
  phone: string;           // +234XXXXXXXXXX format
  otpCode: string;         // 6-digit SMS OTP
}
```

### Resend OTP
```typescript
POST /auth/resend-otp
{
  phone: string;           // +234XXXXXXXXXX format
}
```

### Get Profile
```typescript
GET /auth/profile
Authorization: Bearer {accessToken}
```

## 🔐 Authentication Flow

### New User Flow
1. **Registration Screen** → Enter all required details
2. **API Call** → `POST /auth/register`
3. **OTP Verification** → Enter SMS OTP code
4. **API Call** → `POST /auth/verify-otp`
5. **Auto-setup** → Store tokens, enable biometric if available
6. **Navigate** → Main app

### Existing User Flow
1. **Splash Screen** → Auto-check for existing auth
2. **Biometric Prompt** → Face ID/Touch ID if enabled
3. **Success** → Navigate directly to main app
4. **Failure/Cancel** → Show "Login with Passcode" button
5. **Manual Login** → Email + passcode entry

### Device Detection Logic
```typescript
// Smart device detection
const authStatus = await authStorageService.getAuthStatus();

if (authStatus.isFirstTimeDevice) {
  // Show onboarding or registration
} else if (authStatus.hasExistingUser && authStatus.isAuthenticated) {
  // Attempt biometric auth
} else {
  // Show login screen
}
```

## 🚀 Implementation Steps

### 1. Environment Setup
Add to your `.env` file:
```bash
EXPO_PUBLIC_API_URL=https://5a498535736b.ngrok-free.app
```

### 2. Required Dependencies
All dependencies are already installed:
- `@react-native-async-storage/async-storage`
- `expo-local-authentication`
- `expo-secure-store`
- `@tanstack/react-query`

### 3. Auth Provider Integration
The app is already wrapped with:
- `QueryProvider` for React Query
- `AuthProvider` for authentication context
- `ThemeProvider` for consistent theming

### 4. Screen Integration
All auth screens are fully integrated:
- **Splash Screen** → Smart auto-authentication
- **Register Screen** → Complete form with validation
- **Login Screen** → Email + passcode entry
- **OTP Verification** → SMS code verification

## 🔧 Configuration

### Phone Number Formatting
The system automatically handles Nigerian phone number formats:
- Input: `08012345678` → API: `+2348012345678`
- Input: `2348012345678` → API: `+2348012345678`
- Input: `+2348012345678` → API: `+2348012345678`

### Date Formatting
- Display: `DD/MM/YYYY` (e.g., `15/03/1990`)
- API: `YYYY-MM-DD` (e.g., `1990-03-15`)

### Validation Rules
- **Email**: Standard email format validation
- **Phone**: Nigerian numbers (10-11 digits)
- **Passcode**: Exactly 6 numeric digits
- **Gender**: MALE, FEMALE, or OTHER (enum)
- **Date of Birth**: Valid date, user must be adult

## 📊 Storage Architecture

### Secure Storage (Keychain/Keystore)
- Access tokens
- Refresh tokens
- Biometric preferences
- Device ID

### Regular Storage (AsyncStorage)
- User profiles (for quick access)
- Device information
- User email history
- App preferences

## 🎯 Smart Features

### Automatic Biometric Setup
- Enabled automatically after successful login/registration
- Only if device has biometric hardware
- User can disable in settings later

### Device Memory
- Tracks all users who have logged in on the device
- Remembers last logged-in user
- Provides smart fallbacks and suggestions

### Session Management
- Automatic token refresh
- Secure token storage
- Session expiry handling with 5-minute buffer

## 🧪 Testing Considerations

### Mock Data for Development
The AuthService validates all inputs but you can test with:
- Email: `test@example.com`
- Phone: `08012345678`
- Passcode: `123456`
- OTP: `123456`

### Error Scenarios
- Invalid email format
- Wrong phone number format
- Expired OTP codes
- Network connectivity issues
- Biometric hardware unavailable

## 🔒 Security Features

### Data Protection
- Sensitive data stored in device keychain/keystore
- Automatic token expiry and refresh
- Biometric authentication for enhanced security

### Input Validation
- Client-side validation for better UX
- Server-side validation for security
- Proper error handling and user feedback

### Network Security
- HTTPS for all API communications
- Proper error handling without exposing sensitive data
- Token-based authentication with refresh mechanism

## 📱 User Experience

### Loading States
- All buttons show loading states during API calls
- Proper disabled states during operations
- Loading indicators for long operations

### Error Handling
- User-friendly error messages
- Automatic retry mechanisms where appropriate
- Graceful fallbacks for failures

### Accessibility
- Proper focus management
- Auto-advance through forms
- Keyboard handling and return key actions

## 🎨 UI Integration

### Consistent Styling
- All screens use the app's theme system
- Consistent button states and colors
- Proper spacing and typography

### Responsive Design
- Keyboard avoidance handling
- Safe area considerations
- Cross-platform compatibility

This implementation provides a complete, production-ready authentication system with modern UX patterns and robust security features. 