# React Query Implementation Guide

This project uses **TanStack Query v5** (formerly React Query) for all API interactions and data management. This guide outlines how React Query is implemented and how to use it consistently throughout the codebase.

## 📋 Table of Contents
- [Overview](#overview)
- [Setup and Configuration](#setup-and-configuration)
- [Query Structure](#query-structure)
- [Available Hooks](#available-hooks)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

React Query is used for:
- **API calls** (Account Resolution, Image Processing)
- **Caching** (Bank data, extracted information)
- **Background refetching**
- **Optimistic updates**
- **Error handling and retries**
- **Loading states management**

### Benefits
✅ Automatic caching and background updates  
✅ Optimistic updates for better UX  
✅ Built-in loading and error states  
✅ Automatic retries with exponential backoff  
✅ Stale-while-revalidate pattern  
✅ Request deduplication  

## ⚙️ Setup and Configuration

### Query Client Configuration
```typescript
// providers/QueryProvider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### Provider Setup
The `QueryProvider` wraps the entire app in `app/_layout.tsx`:

```typescript
<AuthProvider>
  <QueryProvider>
    <CustomThemeProvider>
      {/* App content */}
    </CustomThemeProvider>
  </QueryProvider>
</AuthProvider>
```

## 🏗️ Query Structure

All hooks are organized by service and follow consistent patterns:

```
hooks/
├── useAccountService.ts    # Bank account resolution
├── useChatService.ts       # Authentication & chat
├── useGeminiService.ts     # Image processing
└── index.ts               # Re-exports
```

### Query Key Patterns
```typescript
// Account Service
['accounts']                                    // All account data
['accounts', 'banks']                          // Banks list
['accounts', 'resolutions']                    // All resolutions
['accounts', 'resolutions', accountNum, bank]  // Specific resolution

// Image Processing
['gemini']                                     // All Gemini data
['gemini', 'imageProcessing']                  // Image processing
['gemini', 'imageProcessing', 'bankData', uri] // Specific extraction

// Authentication
['chat']                                       // All chat data
['chat', 'auth']                              // Auth related
['chat', 'auth', 'otp', otpCode]             // OTP verification
```

## 🎣 Available Hooks

### Account Service Hooks

#### Query Hooks
```typescript
// Get list of supported banks
const { data: banks, isLoading, error } = useBanks();

// Resolve account details
const { data: accountData, isLoading } = useAccountResolution(
  accountNumber, 
  bankName, 
  enabled // Boolean to control when query runs
);

// Check service health
const { data: isHealthy } = useAccountServiceHealth();
```

#### Mutation Hooks
```typescript
// Manual account resolution
const resolveAccountMutation = useResolveAccountMutation();

const handleResolve = async () => {
  try {
    const result = await resolveAccountMutation.mutateAsync({
      accountNumber: "1234567890",
      bankName: "GTBank"
    });
    console.log('Resolved:', result);
  } catch (error) {
    console.error('Resolution failed:', error);
  }
};
```

#### Utility Hooks
```typescript
// Prefetch account data
const prefetchAccount = usePrefetchAccountResolution();
prefetchAccount("1234567890", "GTBank");

// Cache utilities
const { getCachedResolution, hasResolutionCache } = useAccountData();

// Invalidation helpers
const { invalidateAll, invalidateBanks } = useInvalidateAccountQueries();
```

### Image Processing Hooks

#### Query Hooks
```typescript
// Get cached extraction result
const { data: extractedData } = useBankDataExtraction(imageUri, enabled);

// Recent processing history
const { data: recentExtractions } = useRecentExtractions();

// Processing statistics
const { data: stats } = useImageProcessingStats();
```

#### Mutation Hooks
```typescript
// Process single image
const extractMutation = useExtractBankDataMutation();

const processImage = async (imageUri: string) => {
  try {
    const result = await extractMutation.mutateAsync(imageUri);
    console.log('Extracted:', result);
  } catch (error) {
    console.error('Processing failed:', error);
  }
};

// Process multiple images
const batchMutation = useBatchImageProcessing();
const results = await batchMutation.mutateAsync([uri1, uri2, uri3]);
```

#### Validation Hooks
```typescript
const { 
  validateExtraction,
  formatAmount,
  hasMinimumData,
  getConfidenceDescription 
} = useDataValidation();

const isValid = validateExtraction(extractedData);
const formattedAmount = formatAmount("5000");
const confidence = getConfidenceDescription(85); // "High"
```

### Authentication Hooks

#### Query Hooks
```typescript
// Get auth flow steps
const { data: authFlow } = useAuthFlow();

// Verify OTP
const { data: otpResult } = useOTPVerification(otpCode, enabled);
```

#### Mutation Hooks
```typescript
// User registration
const registerMutation = useUserRegistrationMutation();

const register = async (userData: UserData) => {
  try {
    const result = await registerMutation.mutateAsync(userData);
    if (result.success) {
      console.log('User registered:', result.user);
    }
  } catch (error) {
    console.error('Registration failed:', error);
  }
};

// OTP verification
const otpMutation = useOTPVerificationMutation();
const verifyResult = await otpMutation.mutateAsync("123456");

// Typing delay simulation
const typingMutation = useTypingDelay();
await typingMutation.mutateAsync(); // Simulates typing delay
```

## 💡 Usage Examples

### Complete Camera Screen Implementation

```typescript
// app/(tabs)/index.tsx
export default function CameraScreen() {
  const [extractedData, setExtractedData] = useState<ExtractedBankData | null>(null);
  
  // React Query hooks
  const extractMutation = useExtractBankDataMutation();
  const { validateExtraction, formatAmount } = useDataValidation();

  const processImage = async (imageUri: string) => {
    try {
      setIsProcessing(true);
      
      // Use React Query mutation
      const extractedBankData = await extractMutation.mutateAsync(imageUri);
      
      // Check cache
      if (extractedBankData.accountNumber && extractedBankData.bankName) {
        const cachedData = await CacheService.getCachedData(
          extractedBankData.accountNumber, 
          extractedBankData.bankName
        );
        
        if (cachedData) {
          setExtractedData(cachedData);
          setShowBankModal(true);
          return;
        }
      }
      
      // Validate and cache
      if (validateExtraction(extractedBankData)) {
        await CacheService.cacheData(extractedBankData);
        setExtractedData(extractedBankData);
        setShowBankModal(true);
      }
    } catch (error) {
      console.error('Processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View>
      {/* Camera UI */}
      {extractedData && (
        <BankTransferModal
          visible={showBankModal}
          amount={extractedData.amount || '0'}
          nairaAmount={`₦${formatAmount(extractedData.amount || '0')}`}
          extractedData={extractedData}
          onClose={() => setShowBankModal(false)}
        />
      )}
    </View>
  );
}
```

### Account Resolution with Caching

```typescript
function TransferScreen() {
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  
  // Auto-resolve account when both fields are filled
  const { data: accountData, isLoading, error } = useAccountResolution(
    accountNumber,
    bankName,
    accountNumber.length === 10 && bankName.length > 0 // Enable condition
  );
  
  // Manual resolution fallback
  const resolveMutation = useResolveAccountMutation();
  
  const handleManualResolve = async () => {
    try {
      const result = await resolveMutation.mutateAsync({
        accountNumber,
        bankName
      });
      console.log('Manually resolved:', result);
    } catch (error) {
      console.error('Manual resolution failed:', error);
    }
  };

  return (
    <View>
      <TextInput 
        value={accountNumber}
        onChangeText={setAccountNumber}
        placeholder="Account Number"
        maxLength={10}
      />
      <TextInput 
        value={bankName}
        onChangeText={setBankName}
        placeholder="Bank Name"
      />
      
      {isLoading && <Text>Resolving account...</Text>}
      {error && <Text>Error: {error.message}</Text>}
      {accountData && (
        <Text>Account: {accountData.account_name}</Text>
      )}
      
      <Button 
        title="Manual Resolve" 
        onPress={handleManualResolve}
        disabled={resolveMutation.isPending}
      />
    </View>
  );
}
```

### Banks List with Caching

```typescript
function BankSelector() {
  const { data: banks, isLoading, error, refetch } = useBanks();
  
  if (isLoading) return <Text>Loading banks...</Text>;
  if (error) return <Text>Error loading banks: {error.message}</Text>;
  
  return (
    <View>
      <Button title="Refresh Banks" onPress={() => refetch()} />
      {banks?.map((bank) => (
        <TouchableOpacity key={bank.id}>
          <Text>{bank.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

## 🎯 Best Practices

### 1. Query Enabling
Always use the `enabled` option to control when queries run:

```typescript
// ✅ Good: Only run when data is available
const { data } = useAccountResolution(accountNumber, bankName, 
  accountNumber.length === 10 && bankName.length > 0
);

// ❌ Bad: Runs immediately even without data
const { data } = useAccountResolution(accountNumber, bankName);
```

### 2. Error Handling
Handle errors at the component level:

```typescript
const { data, error, isError } = useBanks();

if (isError) {
  return <ErrorComponent error={error} onRetry={() => refetch()} />;
}
```

### 3. Loading States
Use built-in loading states:

```typescript
const { data, isLoading, isFetching } = useAccountResolution(
  accountNumber, 
  bankName, 
  enabled
);

// isLoading: First time loading
// isFetching: Any loading (including background refetch)
```

### 4. Optimistic Updates
Use optimistic updates for better UX:

```typescript
const mutation = useMutation({
  mutationFn: updateProfile,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['profile'] });
    
    // Snapshot previous value
    const previousData = queryClient.getQueryData(['profile']);
    
    // Optimistically update
    queryClient.setQueryData(['profile'], newData);
    
    return { previousData };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['profile'], context?.previousData);
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  },
});
```

### 5. Cache Management
Use proper cache timing:

```typescript
// Long-lived data (banks list)
useQuery({
  queryKey: ['banks'],
  queryFn: getBanks,
  staleTime: 24 * 60 * 60 * 1000, // 24 hours
  gcTime: 48 * 60 * 60 * 1000, // 48 hours
});

// Short-lived data (account resolution)
useQuery({
  queryKey: ['account', accountNumber, bankName],
  queryFn: () => resolveAccount(accountNumber, bankName),
  staleTime: 30 * 60 * 1000, // 30 minutes
  gcTime: 60 * 60 * 1000, // 1 hour
});

// Real-time data (never cache)
useQuery({
  queryKey: ['balance'],
  queryFn: getBalance,
  staleTime: 0, // Always stale
  gcTime: 0, // No cache
});
```

### 6. Prefetching
Prefetch predictable data:

```typescript
// When user types account number, prefetch bank validation
const prefetchAccount = usePrefetchAccountResolution();

const handleAccountNumberChange = (value: string) => {
  setAccountNumber(value);
  
  if (value.length === 10 && selectedBank) {
    prefetchAccount(value, selectedBank);
  }
};
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Stale Closures
**Problem**: State not updating in query callbacks

```typescript
// ❌ Problem: Stale closure
const [count, setCount] = useState(0);
const mutation = useMutation({
  onSuccess: () => {
    console.log(count); // Always logs 0
  }
});

// ✅ Solution: Use functional updates
const mutation = useMutation({
  onSuccess: () => {
    setCount(prev => prev + 1);
  }
});
```

#### 2. Memory Leaks
**Problem**: Queries not cleaning up

```typescript
// ✅ Use proper cleanup
useEffect(() => {
  return () => {
    queryClient.cancelQueries({ queryKey: ['myQuery'] });
  };
}, []);
```

#### 3. Cache Invalidation
**Problem**: Stale data after mutations

```typescript
// ✅ Invalidate related queries
const mutation = useMutation({
  mutationFn: updateUser,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  }
});
```

### Debugging Tips

1. **React Query Devtools** (Development only):
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Add to your app in development
{__DEV__ && <ReactQueryDevtools initialIsOpen={false} />}
```

2. **Query Cache Inspection**:
```typescript
// Get all cached data
const cache = queryClient.getQueryCache();
console.log('Cache size:', cache.getAll().length);

// Get specific query state
const queryState = queryClient.getQueryState(['accounts', 'banks']);
console.log('Query state:', queryState);
```

3. **Network Logging**:
```typescript
const queryClient = new QueryClient({
  logger: {
    log: console.log,
    warn: console.warn,
    error: console.error,
  },
});
```

## 📚 Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
- [Query Key Management](https://tkdodo.eu/blog/effective-react-query-keys)

---

**Remember**: Always use React Query hooks for API interactions. Direct service calls should only be used for non-cacheable operations like file I/O or immediate processing tasks. 