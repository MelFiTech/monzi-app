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

  const storePin = useCallback(async (pin: string): Promise<boolean> => {
    return await biometricService.storePin(pin);
  }, [biometricService]);

  const getStoredPin = useCallback(async (): Promise<string | null> => {
    return await biometricService.getStoredPin();
  }, [biometricService]);

  const isBiometricEnabled = useCallback(async (): Promise<boolean> => {
    return await biometricService.isBiometricEnabled();
  }, [biometricService]);

  const clearBiometricData = useCallback(async (): Promise<boolean> => {
    return await biometricService.clearBiometricData();
  }, [biometricService]);

  return {
    checkAvailability,
    getBiometricType,
    authenticate,
    storePin,
    getStoredPin,
    isBiometricEnabled,
    clearBiometricData,
  };
};

export default useBiometricService; 