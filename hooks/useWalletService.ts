import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from './useAuthService';
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
  const { isAuthenticated } = useAuth();
  const { data: kycStatus } = useKYCStatus();
  
  const walletAccessInfo = useMemo(() => {
  const hasWalletAccess = isAuthenticated && 
                         (kycStatus?.kycStatus === 'VERIFIED' || kycStatus?.kycStatus === 'APPROVED') && 
                         kycStatus?.isVerified === true;
  
    return { 
      hasWalletAccess, 
    isAuthenticated,
      kycStatus 
    };
  }, [isAuthenticated, kycStatus?.kycStatus, kycStatus?.isVerified]);
  
  return walletAccessInfo;
};

/**
 * Hook to get wallet details
 */
export function useWalletDetails(): UseQueryResult<WalletDetails, WalletError> {
  const walletService = WalletService.getInstance();
  const { hasWalletAccess, isAuthenticated } = useWalletAccess();

  return useQuery({
    queryKey: walletKeys.details(),
    queryFn: () => walletService.getWalletDetails(),
    // ⚠️ TEMPORARY: Enable for any authenticated user to test endpoints
    // TODO: Revert to `hasWalletAccess` after testing wallet endpoints
    enabled: isAuthenticated, // Changed from hasWalletAccess to isAuthenticated for testing
    retry: 2,
    retryDelay: 1000,
    staleTime: 30 * 60 * 1000, // 30 minutes (bank details rarely change)
    gcTime: 2 * 60 * 60 * 1000, // 2 hours cache time
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Refetch on reconnect
    refetchInterval: false, // No automatic refetching
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
    // ⚠️ TEMPORARY: Enable for any authenticated user to test endpoints
    // TODO: Revert to `hasWalletAccess` after testing wallet endpoints
    enabled: isAuthenticated, // Changed from hasWalletAccess to isAuthenticated for testing
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
 * Hook to set/update wallet PIN
 */
export function useSetWalletPin(): UseMutationResult<SetPinResponse, WalletError, SetPinRequest> {
  const queryClient = useQueryClient();
  const walletService = WalletService.getInstance();

  return useMutation({
    mutationFn: (data: SetPinRequest) => walletService.setWalletPin(data),
    onSuccess: () => {
      // Invalidate wallet-related queries after successful PIN update
      queryClient.invalidateQueries({ queryKey: walletKeys.details() });
    },
    onError: (error: WalletError) => {
      console.error('Set wallet PIN error:', error);
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
      console.error('Transfer error:', error);
    },
    retry: false, // Don't retry failed transfers
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
 * Hook for optimistic balance updates
 */
export function useOptimisticBalance() {
  const queryClient = useQueryClient();

  const updateBalanceOptimistically = (newBalance: number) => {
    queryClient.setQueryData(walletKeys.balance(), (oldData: WalletBalance | undefined) => {
      if (oldData) {
        return {
          ...oldData,
          balance: newBalance,
          formattedBalance: WalletService.formatCurrency(newBalance),
        };
      }
      return oldData;
    });
  };

  const revertOptimisticUpdate = () => {
    queryClient.invalidateQueries({ queryKey: walletKeys.balance() });
  };

  return {
    updateBalanceOptimistically,
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
  const { hasWalletAccess, isAuthenticated, kycStatus } = useWalletAccess();
  
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
    statusMessage: getWalletStatusMessage(),
  };
} 

/**
 * Hook to check PIN status
 */
export function usePinStatus(): UseQueryResult<PinStatusResponse, WalletError> {
  const walletService = WalletService.getInstance();
  const { hasWalletAccess } = useWalletAccess();

  return useQuery({
    queryKey: walletKeys.pinStatus(),
    queryFn: () => walletService.checkPinStatus(),
    enabled: hasWalletAccess, // Only check if user has wallet access
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes - PIN status doesn't change often
    gcTime: 30 * 60 * 1000, // 30 minutes cache time
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: false,
    networkMode: 'online',
  });
} 