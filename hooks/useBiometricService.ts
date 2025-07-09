import { useCallback } from 'react';
import { BiometricService, BiometricResult } from '@/services';

export const useBiometricService = () => {
  const biometricService = BiometricService.getInstance();

  const checkAvailability = useCallback(async () => {
    return await biometricService.isBiometricAvailable();
  }, [biometricService]);

  const getBiometricType = useCallback(async () => {
    return await biometricService.getBiometricType();
  }, [biometricService]);

  const authenticate = useCallback(async (reason?: string): Promise<BiometricResult> => {
    return await biometricService.authenticate(reason);
  }, [biometricService]);

  const isLoginEnabled = useCallback(async () => {
    return await biometricService.isBiometricLoginEnabled();
  }, [biometricService]);

  const setLoginEnabled = useCallback(async (enabled: boolean) => {
    return await biometricService.setBiometricLoginEnabled(enabled);
  }, [biometricService]);

  const hasStoredAuth = useCallback(async () => {
    return await biometricService.hasStoredAuth();
  }, [biometricService]);

  const storeAuthToken = useCallback(async (token: string) => {
    return await biometricService.storeAuthToken(token);
  }, [biometricService]);

  const getAuthToken = useCallback(async () => {
    return await biometricService.getAuthToken();
  }, [biometricService]);

  const clearAuth = useCallback(async () => {
    return await biometricService.clearAuth();
  }, [biometricService]);

  return {
    checkAvailability,
    getBiometricType,
    authenticate,
    isLoginEnabled,
    setLoginEnabled,
    hasStoredAuth,
    storeAuthToken,
    getAuthToken,
    clearAuth,
  };
};

export default useBiometricService; 