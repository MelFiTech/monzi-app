import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AccountService, type AccountResolutionResponse } from '@/services';

// Query Keys
export const accountQueryKeys = {
  all: ['accounts'] as const,
  banks: () => [...accountQueryKeys.all, 'banks'] as const,
  resolutions: () => [...accountQueryKeys.all, 'resolutions'] as const,
  resolution: (accountNumber: string, bankName: string) =>
    [...accountQueryKeys.resolutions(), accountNumber, bankName] as const,
};

// Get Banks List Hook
export function useBanks() {
  return useQuery({
    queryKey: accountQueryKeys.banks(),
    queryFn: AccountService.getBanks,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (banks don't change often)
    gcTime: 48 * 60 * 60 * 1000, // 48 hours cache
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

// Account Resolution Hook
export function useAccountResolution(accountNumber: string, bankName: string, enabled = false) {
  return useQuery({
    queryKey: accountQueryKeys.resolution(accountNumber, bankName),
    queryFn: () => AccountService.resolveAccount(accountNumber, bankName),
    enabled: enabled && !!accountNumber && !!bankName && 
             AccountService.isValidAccountNumber(accountNumber) &&
             AccountService.isValidBankName(bankName),
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
export function useResolveAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountNumber, bankName }: { accountNumber: string; bankName: string }) =>
      AccountService.resolveAccount(accountNumber, bankName),
    onSuccess: (data, variables) => {
      // Cache the successful resolution
      queryClient.setQueryData(
        accountQueryKeys.resolution(variables.accountNumber, variables.bankName),
        data
      );
    },
    retry: 1,
    retryDelay: 2000,
  });
}

// Super Resolve Mutation Hook (for account-only resolution)
export function useSuperResolveAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountNumber }: { accountNumber: string }) =>
      AccountService.superResolveAccount(accountNumber),
    onSuccess: (data, variables) => {
      // Cache the successful super resolution
      queryClient.setQueryData(
        accountQueryKeys.resolution(variables.accountNumber, data.bank_name),
        data
      );
    },
    retry: 1,
    retryDelay: 2000,
  });
}

// Prefetch Account Resolution Hook
export function usePrefetchAccountResolution() {
  const queryClient = useQueryClient();

  return (accountNumber: string, bankName: string) => {
    if (!AccountService.isValidAccountNumber(accountNumber) || !AccountService.isValidBankName(bankName)) {
      return;
    }

    queryClient.prefetchQuery({
      queryKey: accountQueryKeys.resolution(accountNumber, bankName),
      queryFn: () => AccountService.resolveAccount(accountNumber, bankName),
      staleTime: 30 * 60 * 1000,
    });
  };
}

// Service Health Check Hook
export function useAccountServiceHealth() {
  return useQuery({
    queryKey: [...accountQueryKeys.all, 'health'],
    queryFn: AccountService.isServiceAvailable,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
    retry: false, // Don't retry health checks
  });
}

// Invalidate account queries helper
export function useInvalidateAccountQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: accountQueryKeys.all }),
    invalidateBanks: () => queryClient.invalidateQueries({ queryKey: accountQueryKeys.banks() }),
    invalidateResolutions: () => queryClient.invalidateQueries({ queryKey: accountQueryKeys.resolutions() }),
    invalidateResolution: (accountNumber: string, bankName: string) =>
      queryClient.invalidateQueries({ 
        queryKey: accountQueryKeys.resolution(accountNumber, bankName) 
      }),
  };
}

// Account data utilities
export function useAccountData() {
  const queryClient = useQueryClient();

  return {
    // Get cached resolution data without triggering a request
    getCachedResolution: (accountNumber: string, bankName: string): AccountResolutionResponse | undefined =>
      queryClient.getQueryData(accountQueryKeys.resolution(accountNumber, bankName)),
    
    // Check if resolution data is cached
    hasResolutionCache: (accountNumber: string, bankName: string): boolean =>
      queryClient.getQueryState(accountQueryKeys.resolution(accountNumber, bankName))?.status === 'success',
    
    // Get all cached banks
    getCachedBanks: () => queryClient.getQueryData(accountQueryKeys.banks()),
  };
} 