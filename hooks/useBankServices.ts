import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BankListService, BankResolutionService, type AccountResolutionResponse } from '@/services';

// Query Keys
export const bankQueryKeys = {
  all: ['banks'] as const,
  banks: () => [...bankQueryKeys.all, 'list'] as const,
  resolutions: () => [...bankQueryKeys.all, 'resolutions'] as const,
  resolution: (accountNumber: string, bankName: string) =>
    [...bankQueryKeys.resolutions(), accountNumber, bankName] as const,
};

// Get Banks List Hook
export function useBankList() {
  return useQuery({
    queryKey: bankQueryKeys.banks(),
    queryFn: BankListService.getBanks,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (banks don't change often)
    gcTime: 48 * 60 * 60 * 1000, // 48 hours cache
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

// Account Resolution Hook
export function useBankAccountResolution(accountNumber: string, bankName: string, enabled = false) {
  return useQuery({
    queryKey: bankQueryKeys.resolution(accountNumber, bankName),
    queryFn: () => BankResolutionService.resolveAccount(accountNumber, bankName),
    enabled: enabled && !!accountNumber && !!bankName && 
             BankResolutionService.isValidAccountNumber(accountNumber) &&
             BankResolutionService.isValidBankName(bankName),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour cache
    retry: (failureCount, error: any) => {
      // Don't retry for validation errors
      if (error?.message?.includes('validation') || error?.message?.includes('invalid')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// Account Resolution Mutation Hook (for manual triggers)
export function useResolveBankAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountNumber, bankName }: { accountNumber: string; bankName: string }) =>
      BankResolutionService.resolveAccount(accountNumber, bankName),
    onSuccess: (data, variables) => {
      // Cache the successful resolution
      queryClient.setQueryData(
        bankQueryKeys.resolution(variables.accountNumber, variables.bankName),
        data
      );
    },
    retry: 1,
    retryDelay: 2000,
  });
}

// Super Resolve Mutation Hook (for account-only resolution)
export function useSuperResolveBankAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountNumber }: { accountNumber: string }) =>
      BankResolutionService.superResolveAccount(accountNumber),
    onSuccess: (data, variables) => {
      // Cache the successful super resolution
      queryClient.setQueryData(
        bankQueryKeys.resolution(variables.accountNumber, data.bank_name),
        data
      );
    },
    retry: 1,
    retryDelay: 2000,
  });
}

// Prefetch Account Resolution Hook
export function usePrefetchBankAccountResolution() {
  const queryClient = useQueryClient();

  return (accountNumber: string, bankName: string) => {
    if (!BankResolutionService.isValidAccountNumber(accountNumber) || !BankResolutionService.isValidBankName(bankName)) {
      return;
    }

    queryClient.prefetchQuery({
      queryKey: bankQueryKeys.resolution(accountNumber, bankName),
      queryFn: () => BankResolutionService.resolveAccount(accountNumber, bankName),
      staleTime: 30 * 60 * 1000,
    });
  };
}

// Service Health Check Hook
export function useBankServiceHealth() {
  return useQuery({
    queryKey: [...bankQueryKeys.all, 'health'],
    queryFn: BankListService.testConnectivity,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
    retry: false, // Don't retry health checks
  });
}

// Invalidate bank queries helper
export function useInvalidateBankQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: bankQueryKeys.all }),
    invalidateBanks: () => queryClient.invalidateQueries({ queryKey: bankQueryKeys.banks() }),
    invalidateResolutions: () => queryClient.invalidateQueries({ queryKey: bankQueryKeys.resolutions() }),
    invalidateResolution: (accountNumber: string, bankName: string) =>
      queryClient.invalidateQueries({ 
        queryKey: bankQueryKeys.resolution(accountNumber, bankName) 
      }),
    clearBanksCache: () => queryClient.removeQueries({ queryKey: bankQueryKeys.banks() }),
    clearAllCache: () => queryClient.clear(),
  };
}

// Bank data utilities
export function useBankData() {
  const queryClient = useQueryClient();

  return {
    // Get cached resolution data without triggering a request
    getCachedResolution: (accountNumber: string, bankName: string): AccountResolutionResponse | undefined =>
      queryClient.getQueryData(bankQueryKeys.resolution(accountNumber, bankName)),
    
    // Check if resolution data is cached
    hasResolutionCache: (accountNumber: string, bankName: string): boolean =>
      queryClient.getQueryState(bankQueryKeys.resolution(accountNumber, bankName))?.status === 'success',
    
    // Get all cached banks
    getCachedBanks: () => queryClient.getQueryData(bankQueryKeys.banks()),
  };
} 