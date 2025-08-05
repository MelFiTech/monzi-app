import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useKYCStatus } from './useKYCService';
import WalletService, { 
  WalletDetails, 
  WalletBalance, 
  Transaction, 
  TransactionHistoryParams, 
  SetPinRequest,
  SetPinResponse,
  PinStatusResponse,
  TransferRequest,
  TransferResponse,
  WalletRecoveryResponse,
  WalletError 
} from '../services/WalletService';

// Query Keys
export const walletKeys = {
  all: ['wallet'] as const,
  details: () => [...walletKeys.all, 'details'] as const,
  balance: () => [...walletKeys.all, 'balance'] as const,
  transactions: (params?: TransactionHistoryParams) => 
    [...walletKeys.all, 'transactions', params] as const,
  pinStatus: () => [...walletKeys.all, 'pinStatus'] as const,
};

/**
 * Hook to determine if user should have wallet access
 * Optimized with useMemo to prevent unnecessary re-computations
 */
const useWalletAccess = () => {
  const { isAuthenticated, authToken } = useAuth();
  const { data: kycStatus, isLoading: kycLoading } = useKYCStatus();
  
  const walletAccessInfo = useMemo(() => {
  const hasWalletAccess = isAuthenticated && 
                         (kycStatus?.kycStatus === 'VERIFIED' || kycStatus?.kycStatus === 'APPROVED') && 
                         kycStatus?.isVerified === true;
    
    console.log('🔍 [WalletAccess] Status Check:', {
      isAuthenticated,
      hasAuthToken: !!authToken,
      kycStatus: kycStatus?.kycStatus,
      isVerified: kycStatus?.isVerified,
      kycLoading,
      hasWalletAccess,
      timestamp: new Date().toISOString()
    });
  
    return { 
      hasWalletAccess, 
    isAuthenticated,
      kycStatus,
      kycLoading
    };
  }, [isAuthenticated, authToken, kycStatus?.kycStatus, kycStatus?.isVerified, kycLoading]);
  
  return walletAccessInfo;
};

/**
 * Hook to get wallet details with smart long-term caching
 */
export function useWalletDetails(): UseQueryResult<WalletDetails, WalletError> {
  const walletService = WalletService.getInstance();
  const { hasWalletAccess, isAuthenticated, kycStatus } = useWalletAccess();

  return useQuery({
    queryKey: walletKeys.details(),
    queryFn: async () => {
      console.log('🏦 [Wallet Cache] Fetching wallet details from API...');
      const details = await walletService.getWalletDetails();
      console.log('💾 [Wallet Cache] Fresh wallet details from API:', {
        accountNumber: details.accountNumber,
        bankName: details.bankName,
        accountName: details.accountName,
        cached: false
      });
      return details;
    },
    // 🚀 FIXED: Only enable for users with proper wallet access (KYC verified)
    enabled: hasWalletAccess, // Reverted from testing override
    retry: 2,
    retryDelay: 1000,
    
    // 🚀 SMART LONG-TERM CACHING - Wallet details rarely change
    staleTime: 2 * 60 * 60 * 1000, // 2 hours - account details rarely change
    gcTime: 24 * 60 * 60 * 1000, // 24 hours cache time
    
    // Optimized refetch behavior
    refetchOnWindowFocus: false, // Don't refetch on focus - use cache
    refetchOnMount: 'stale', // Only refetch on mount if cache is stale
    refetchOnReconnect: true, // Refetch on reconnect (safety)
    refetchInterval: false, // No automatic refetching
    refetchIntervalInBackground: false,
    
    // Network mode - only when online
    networkMode: 'online',
  });
}

/**
 * Hook to get wallet balance with optimized caching
 */
export function useWalletBalance(): UseQueryResult<WalletBalance, WalletError> {
  const walletService = WalletService.getInstance();
  const { hasWalletAccess, isAuthenticated } = useWalletAccess();

  return useQuery({
    queryKey: walletKeys.balance(),
    queryFn: () => walletService.getWalletBalance(),
    // 🚀 FIXED: Only enable for users with proper wallet access (KYC verified)
    enabled: hasWalletAccess, // Reverted from testing override
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes (balance only changes during transactions)
    gcTime: 30 * 60 * 1000, // 30 minutes cache time (longer cache for better UX)
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Refetch on reconnect
    refetchInterval: false, // No automatic refetching (smart invalidation instead)
    refetchIntervalInBackground: false,
    // Use network-first strategy only when data is truly stale
    networkMode: 'online',
  });
}

/**
 * Hook to get transaction history with pagination
 */
export function useTransactionHistory(
  params: TransactionHistoryParams = { limit: 20, offset: 0 }
): UseQueryResult<Transaction[], WalletError> {
  const walletService = WalletService.getInstance();
  const { hasWalletAccess } = useWalletAccess();

  return useQuery({
    queryKey: walletKeys.transactions(params),
    queryFn: () => walletService.getTransactionHistory(params),
    enabled: hasWalletAccess, // Only fetch if user has wallet access
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes (transactions don't change after created)
    gcTime: 15 * 60 * 1000, // 15 minutes cache time
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Refetch on reconnect
    refetchInterval: false, // No automatic refetching
  });
}

/**
 * Hook to get individual transaction details
 */
export function useTransactionDetail(transactionId: string): UseQueryResult<Transaction, WalletError> {
  const walletService = WalletService.getInstance();
  const { hasWalletAccess } = useWalletAccess();

  return useQuery({
    queryKey: [...walletKeys.all, 'transaction', transactionId],
    queryFn: () => walletService.getTransactionDetail(transactionId),
    enabled: hasWalletAccess && !!transactionId, // Only fetch if user has wallet access and transactionId is provided
    retry: 2,
    retryDelay: 1000,
    staleTime: 10 * 60 * 1000, // 10 minutes (transaction details rarely change)
    gcTime: 30 * 60 * 1000, // 30 minutes cache time
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Refetch on reconnect
    refetchInterval: false, // No automatic refetching
  });
}

/**
 * Hook to set/update wallet PIN
 */
export function useSetWalletPin(): UseMutationResult<SetPinResponse, WalletError, SetPinRequest> {
  const queryClient = useQueryClient();
  const walletService = WalletService.getInstance();

  return useMutation({
    mutationFn: (data: SetPinRequest) => walletService.setWalletPin(data),
    onSuccess: () => {
      console.log('✅ PIN set successfully, invalidating queries');
      
      // Invalidate wallet-related queries after successful PIN update
      queryClient.invalidateQueries({ queryKey: walletKeys.details() });
      
      // Invalidate PIN status cache to reflect the new PIN
      queryClient.invalidateQueries({ queryKey: walletKeys.pinStatus() });
    },
    onError: (error: WalletError) => {
      console.error('❌ Set wallet PIN error:', error);
    },
  });
}

/**
 * Hook to execute bank transfer
 */
export function useTransferFunds(): UseMutationResult<TransferResponse, WalletError, TransferRequest> {
  const queryClient = useQueryClient();
  const walletService = WalletService.getInstance();

  return useMutation({
    mutationFn: (data: TransferRequest) => walletService.transferFunds(data),
    onSuccess: (response) => {
      console.log('✅ Transfer successful, invalidating queries');
      
      // Update balance optimistically with the new balance from response
      queryClient.setQueryData(walletKeys.balance(), (oldData: WalletBalance | undefined) => {
        if (oldData) {
          return {
            ...oldData,
            balance: response.newBalance,
            formattedBalance: WalletService.formatCurrency(response.newBalance),
          };
        }
        return oldData;
      });

      // Invalidate transactions to show the new transfer
      queryClient.invalidateQueries({ queryKey: walletKeys.transactions() });
    },
    onError: (error: WalletError) => {
      console.error('❌ Transfer mutation error:', {
        message: error.message,
        statusCode: error.statusCode,
        error: error.error,
        details: error.details
      });
      
      // Handle specific error types
      if (error.message?.includes('timeout') || error.message?.includes('Network request failed')) {
        console.error('🌐 Network timeout or connectivity issue during transfer');
      } else if (error.message?.includes('PIN') || error.message?.includes('pin')) {
        console.error('🔑 PIN validation error during transfer');
      } else if (error.message?.includes('balance') || error.message?.includes('insufficient')) {
        console.error('💰 Insufficient balance error during transfer');
      } else if (error.message?.includes('authentication') || error.message?.includes('token') || error.statusCode === 401) {
        console.error('🔐 Authentication error during transfer - token may be expired');
      } else {
        console.error('❓ Unknown transfer error type');
      }
    },
    retry: false, // Don't retry failed transfers
    retryDelay: 0, // No delay for retries
  });
}

/**
 * Hook to trigger wallet recovery/activation
 */
export function useWalletRecovery(): UseMutationResult<WalletRecoveryResponse, WalletError, void> {
  const queryClient = useQueryClient();
  const walletService = WalletService.getInstance();

  return useMutation({
    mutationFn: () => walletService.retryWalletActivation(),
    onSuccess: (response) => {
      console.log('✅ Wallet recovery successful, invalidating queries');
      
      // Invalidate all wallet queries to refresh with new wallet data
      queryClient.invalidateQueries({ queryKey: walletKeys.all });
    },
    onError: (error: WalletError) => {
      console.error('❌ Wallet recovery error:', error);
    },
    retry: false, // Don't retry failed recovery attempts
  });
}

/**
 * Hook to refresh wallet data manually (smart invalidation)
 */
export function useRefreshWallet() {
  const queryClient = useQueryClient();

  const refreshWalletData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: walletKeys.details() }),
      queryClient.invalidateQueries({ queryKey: walletKeys.balance() }),
      queryClient.invalidateQueries({ queryKey: walletKeys.transactions() }),
    ]);
  };

  const refreshBalance = async () => {
    await queryClient.invalidateQueries({ queryKey: walletKeys.balance() });
  };

  const refreshTransactions = async () => {
    await queryClient.invalidateQueries({ queryKey: walletKeys.transactions() });
  };

  // Smart invalidation - only invalidate when transaction occurs
  const invalidateAfterTransaction = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: walletKeys.balance() }),
      queryClient.invalidateQueries({ queryKey: walletKeys.transactions() }),
    ]);
  };

  return {
    refreshWalletData,
    refreshBalance,
    refreshTransactions,
    invalidateAfterTransaction,
  };
}

/**
 * Hook for optimistic balance updates (works with WebSocket real-time updates)
 */
export function useOptimisticBalance() {
  const queryClient = useQueryClient();

  const updateBalanceOptimistically = (newBalance: number) => {
    console.log('💰 [Wallet Cache] Optimistic balance update:', newBalance);
    queryClient.setQueryData(walletKeys.balance(), (oldData: WalletBalance | undefined) => {
      if (oldData) {
        const updatedData = {
          ...oldData,
          balance: newBalance,
          formattedBalance: WalletService.formatCurrency(newBalance),
        };
        console.log('💾 [Wallet Cache] Balance cache updated optimistically:', {
          from: oldData.balance,
          to: updatedData.balance
        });
        return updatedData;
      }
      return oldData;
    });
  };

  // Update balance from WebSocket notification (real-time)
  const updateBalanceFromWebSocket = (balanceData: any) => {
    console.log('🔌 [Wallet Cache] WebSocket balance update:', balanceData);
    queryClient.setQueryData(walletKeys.balance(), (oldData: WalletBalance | undefined) => {
      if (oldData) {
        const updatedData = {
          ...oldData,
          balance: balanceData.newBalance,
          formattedBalance: WalletService.formatCurrency(balanceData.newBalance),
        };
        console.log('💾 [Wallet Cache] Balance cache updated from WebSocket:', {
          from: balanceData.oldBalance,
          to: balanceData.newBalance,
          change: balanceData.change
        });
        return updatedData;
      }
      return oldData;
    });
  };

  const revertOptimisticUpdate = () => {
    console.log('🔄 [Wallet Cache] Reverting optimistic balance update');
    queryClient.invalidateQueries({ queryKey: walletKeys.balance() });
  };

  return {
    updateBalanceOptimistically,
    updateBalanceFromWebSocket,
    revertOptimisticUpdate,
  };
}

/**
 * Hook for infinite query for transaction history (pagination)
 */
export function useInfiniteTransactionHistory(limit: number = 20) {
  const walletService = WalletService.getInstance();
  const { hasWalletAccess } = useWalletAccess();

  return useQuery({
    queryKey: [...walletKeys.all, 'transactions-infinite', limit],
    queryFn: async ({ pageParam = 0 }) => {
      const transactions = await walletService.getTransactionHistory({
        limit,
        offset: pageParam * limit,
      });
      
      return {
        transactions,
        nextPage: transactions.length === limit ? pageParam + 1 : undefined,
        hasMore: transactions.length === limit,
      };
    },
    enabled: hasWalletAccess, // Only fetch if user has wallet access
    retry: 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to prefetch wallet data
 */
export function usePrefetchWalletData() {
  const queryClient = useQueryClient();
  const walletService = WalletService.getInstance();
  const { hasWalletAccess } = useWalletAccess();

  const prefetchWalletDetails = () => {
    if (!hasWalletAccess) return;
    
    queryClient.prefetchQuery({
      queryKey: walletKeys.details(),
      queryFn: () => walletService.getWalletDetails(),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchWalletBalance = () => {
    if (!hasWalletAccess) return;
    
    queryClient.prefetchQuery({
      queryKey: walletKeys.balance(),
      queryFn: () => walletService.getWalletBalance(),
      staleTime: 5 * 60 * 1000, // Increased stale time for prefetch
    });
  };

  const prefetchTransactions = (params: TransactionHistoryParams = {}) => {
    if (!hasWalletAccess) return;
    
    queryClient.prefetchQuery({
      queryKey: walletKeys.transactions(params),
      queryFn: () => walletService.getTransactionHistory(params),
      staleTime: 2 * 60 * 1000,
    });
  };

  return {
    prefetchWalletDetails,
    prefetchWalletBalance,
    prefetchTransactions,
  };
}

/**
 * Combined hook for wallet overview data with smart caching
 */
export function useWalletOverview() {
  const walletDetails = useWalletDetails();
  const walletBalance = useWalletBalance();
  const recentTransactions = useTransactionHistory({ limit: 5, offset: 0 });

  return {
    walletDetails,
    walletBalance,
    recentTransactions,
    isLoading: walletDetails.isPending || walletBalance.isPending || recentTransactions.isPending,
    isError: walletDetails.isError || walletBalance.isError || recentTransactions.isError,
    error: walletDetails.error || walletBalance.error || recentTransactions.error,
  };
}

/**
 * Hook to check wallet access status for UI components
 */
export function useWalletAccessStatus() {
  const { hasWalletAccess, isAuthenticated, kycStatus, kycLoading } = useWalletAccess();
  
  const getWalletStatusMessage = () => {
    if (!isAuthenticated) {
      return 'Please log in to access wallet features';
    }
    
    if (!kycStatus) {
      return 'Loading verification status...';
    }
    
    switch (kycStatus.kycStatus) {
      case 'PENDING':
        return 'Complete identity verification to access wallet';
      case 'IN_PROGRESS':
        return 'Identity verification in progress...';
      case 'UNDER_REVIEW':
        return 'Verification under review...';
      case 'REJECTED':
        return 'Verification failed. Please contact support';
      case 'VERIFIED':
        return hasWalletAccess ? 'Wallet access granted' : 'Setting up wallet...';
      default:
        return 'Unknown verification status';
    }
  };
  
  return {
    hasWalletAccess,
    isAuthenticated,
    kycStatus,
    kycLoading,
    statusMessage: getWalletStatusMessage(),
  };
} 

/**
 * Hook to check PIN status
 */
export function usePinStatus(): UseQueryResult<PinStatusResponse, WalletError> {
  const walletService = WalletService.getInstance();
  const { hasWalletAccess } = useWalletAccess();

  console.log('🔍 [usePinStatus] Hook called:', {
    hasWalletAccess,
    timestamp: new Date().toISOString()
  });

  return useQuery({
    queryKey: walletKeys.pinStatus(),
    queryFn: () => walletService.checkPinStatus(),
    enabled: hasWalletAccess, // Only check if user has wallet access
    retry: 2,
    retryDelay: 1000,
    staleTime: 0, // Always fetch fresh data - no caching
    gcTime: 0, // No cache time - always fresh
    refetchOnWindowFocus: true, // Refetch on focus
    refetchOnReconnect: true,
    refetchInterval: false,
    networkMode: 'online',
  });
} /**
 * Hoo
k for comprehensive cache management across the app
 */
export function useCacheManager() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Clear all caches on logout
  const clearAllCaches = () => {
    console.log('🗑️ [Cache Manager] Clearing all caches on logout');
    queryClient.clear(); // Nuclear option - fresh start
  };

  // Clear specific cache groups
  const clearKYCCache = () => {
    console.log('🗑️ [Cache Manager] Clearing KYC cache');
    queryClient.removeQueries({ queryKey: ['kyc'] });
  };

  const clearWalletCache = () => {
    console.log('🗑️ [Cache Manager] Clearing wallet cache');
    queryClient.removeQueries({ queryKey: walletKeys.all });
  };

  // Smart cache invalidation after specific actions
  const invalidateAfterKYCComplete = () => {
    console.log('🔄 [Cache Manager] KYC completed - invalidating wallet queries');
    // When KYC completes, user might now have wallet access
    queryClient.invalidateQueries({ queryKey: walletKeys.all });
  };

  const invalidateAfterWalletCreation = () => {
    console.log('🔄 [Cache Manager] Wallet created - refreshing wallet data');
    queryClient.invalidateQueries({ queryKey: walletKeys.all });
  };

  // Prefetch data for smooth transitions
  const prefetchForKYCComplete = () => {
    console.log('🚀 [Cache Manager] Prefetching wallet data for KYC completion');
    const walletService = WalletService.getInstance();
    
    // Prefetch wallet details for when user completes KYC
    queryClient.prefetchQuery({
      queryKey: walletKeys.details(),
      queryFn: () => walletService.getWalletDetails(),
      staleTime: 5 * 60 * 1000,
    });

    queryClient.prefetchQuery({
      queryKey: walletKeys.balance(),
      queryFn: () => walletService.getWalletBalance(),
      staleTime: 5 * 60 * 1000,
    });
  };

  // Get cache statistics for debugging
  const getCacheStats = () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const stats = {
      totalQueries: queries.length,
      kycQueries: queries.filter(q => q.queryKey[0] === 'kyc').length,
      walletQueries: queries.filter(q => q.queryKey[0] === 'wallet').length,
      staleQueries: queries.filter(q => q.isStale()).length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
    };

    console.log('📊 [Cache Manager] Cache Statistics:', stats);
    return stats;
  };

  return {
    clearAllCaches,
    clearKYCCache,
    clearWalletCache,
    invalidateAfterKYCComplete,
    invalidateAfterWalletCreation,
    prefetchForKYCComplete,
    getCacheStats,
  };
}

/**
 * Hook to integrate WebSocket balance updates with React Query cache
 */
export function useWebSocketCacheIntegration() {
  const queryClient = useQueryClient(); // Add missing queryClient
  const { updateBalanceFromWebSocket } = useOptimisticBalance();
  const { invalidateAfterTransaction } = useRefreshWallet();

  // Handle WebSocket balance update
  const handleBalanceUpdate = (balanceData: any) => {
    console.log('🔌 [WebSocket Cache] Processing balance update:', balanceData);
    
    // Update balance cache immediately
    updateBalanceFromWebSocket(balanceData);
    
    // Invalidate ALL transaction queries (both wallet and transaction service)
    console.log('🔄 [WebSocket Cache] Invalidating wallet transaction queries...');
    invalidateAfterTransaction();
    
    // 🚀 FIXED: Use standardized query key for transaction invalidation
    console.log('🔄 [WebSocket Cache] Invalidating transaction service queries...');
    queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
  };

  // Handle WebSocket transaction notification
  const handleTransactionNotification = (transactionData: any) => {
    console.log('🔌 [WebSocket Cache] Processing transaction notification:', transactionData);
    
    // Invalidate ALL transaction queries (both wallet and transaction service)
    console.log('🔄 [WebSocket Cache] Invalidating wallet transaction queries...');
    invalidateAfterTransaction();
    
    // 🚀 FIXED: Use standardized query key for transaction invalidation
    console.log('🔄 [WebSocket Cache] Invalidating transaction service queries...');
    queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
  };

  return {
    handleBalanceUpdate,
    handleTransactionNotification,
  };
}

/**
 * Hook to calculate transaction fee
 */
export function useCalculateFee(amount: number, transactionType: string, provider?: string) {
  const walletService = WalletService.getInstance();
  return useQuery({
    queryKey: ['calculate-fee', amount, transactionType, provider],
    queryFn: () => walletService.calculateFee({ amount, transactionType, provider }),
    enabled: !!amount && !!transactionType,
    retry: 1,
    retryDelay: 1000,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

/**
 * Hook for tagging transactions as business or personal
 */
export function useTagTransaction() {
  const walletService = WalletService.getInstance();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, isBusiness }: { transactionId: string; isBusiness: boolean }) =>
      walletService.tagTransaction(transactionId, isBusiness),
    onSuccess: (data, variables) => {
      console.log('✅ Transaction tagged successfully:', {
        transactionId: variables.transactionId,
        isBusiness: variables.isBusiness,
        response: data
      });
      
      // Invalidate transaction history to refresh the list
      queryClient.invalidateQueries({ queryKey: walletKeys.transactions() });
      
      // Also invalidate specific transaction detail if it exists
      queryClient.invalidateQueries({ 
        queryKey: [...walletKeys.all, 'transaction', variables.transactionId] 
      });
    },
    onError: (error, variables) => {
      console.error('❌ Transaction tagging failed:', {
        transactionId: variables.transactionId,
        isBusiness: variables.isBusiness,
        error
      });
    },
  });
}