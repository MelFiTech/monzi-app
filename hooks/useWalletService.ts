import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import WalletService, { 
  WalletDetails, 
  WalletBalance, 
  Transaction, 
  TransactionHistoryParams, 
  SetPinRequest, 
  SetPinResponse,
  WalletError 
} from '../services/WalletService';

// Query Keys
export const walletKeys = {
  all: ['wallet'] as const,
  details: () => [...walletKeys.all, 'details'] as const,
  balance: () => [...walletKeys.all, 'balance'] as const,
  transactions: (params?: TransactionHistoryParams) => 
    [...walletKeys.all, 'transactions', params] as const,
};

/**
 * Hook to get wallet details
 */
export function useWalletDetails(): UseQueryResult<WalletDetails, WalletError> {
  const walletService = WalletService.getInstance();

  return useQuery({
    queryKey: walletKeys.details(),
    queryFn: () => walletService.getWalletDetails(),
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

/**
 * Hook to get wallet balance
 */
export function useWalletBalance(): UseQueryResult<WalletBalance, WalletError> {
  const walletService = WalletService.getInstance();

  return useQuery({
    queryKey: walletKeys.balance(),
    queryFn: () => walletService.getWalletBalance(),
    retry: 2,
    retryDelay: 1000,
    staleTime: 30 * 1000, // 30 seconds (balance changes frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: false,
  });
}

/**
 * Hook to get transaction history with pagination
 */
export function useTransactionHistory(
  params: TransactionHistoryParams = { limit: 20, offset: 0 }
): UseQueryResult<Transaction[], WalletError> {
  const walletService = WalletService.getInstance();

  return useQuery({
    queryKey: walletKeys.transactions(params),
    queryFn: () => walletService.getTransactionHistory(params),
    retry: 2,
    retryDelay: 1000,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
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
 * Hook to refresh wallet data manually
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

  return {
    refreshWalletData,
    refreshBalance,
    refreshTransactions,
  };
}

/**
 * Hook for infinite query for transaction history (pagination)
 */
export function useInfiniteTransactionHistory(limit: number = 20) {
  const walletService = WalletService.getInstance();

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

  const prefetchWalletDetails = () => {
    queryClient.prefetchQuery({
      queryKey: walletKeys.details(),
      queryFn: () => walletService.getWalletDetails(),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchWalletBalance = () => {
    queryClient.prefetchQuery({
      queryKey: walletKeys.balance(),
      queryFn: () => walletService.getWalletBalance(),
      staleTime: 30 * 1000,
    });
  };

  const prefetchTransactions = (params: TransactionHistoryParams = {}) => {
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
 * Combined hook for wallet overview data
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