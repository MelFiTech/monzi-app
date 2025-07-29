import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import AccountService from '../../services/AccountService';
import { SMEPlugBanksService, PushNotificationService } from '../../services';
import { useBankList } from '../../hooks/useBankServices';
import { useAuth } from '../../providers/AuthProvider';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export default function NetworkDiagnosticTool() {
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [manualBanksResult, setManualBanksResult] = useState<any>(null);
  const [isLoadingManualBanks, setIsLoadingManualBanks] = useState(false);
  const [smePlugResult, setSmePlugResult] = useState<any>(null);
  const [isLoadingSMEPlug, setIsLoadingSMEPlug] = useState(false);
  const [pushResult, setPushResult] = useState<any>(null);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [backendBanksResult, setBackendBanksResult] = useState<string>('');

  // React Query hook for banks
  const { data: banksData, isLoading: isQueryLoading, error: queryError, refetch } = useBankList();
  
  // Auth context for push notifications
  const {
    authToken, 
    expoPushToken, 
    isPushRegistered, 
    pushError,
    permissionStatus,
    hasPermissions,
    canRequestPermissions,
    requestPermissions,
    registerForPushNotifications 
  } = useAuth();

  const runNetworkDiagnostic = async () => {
    setIsRunningDiagnostic(true);
    try {
      const result = await AccountService.testNetworkConnectivity();
      setDiagnosticResult(result);
      console.log('🔍 Network diagnostic result:', result);
    } catch (error) {
      console.error('❌ Diagnostic failed:', error);
      setDiagnosticResult({ error: 'Diagnostic failed', details: error });
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  const testManualBanksFetch = async () => {
    setIsLoadingManualBanks(true);
    try {
      const banks = await AccountService.getBanks();
      setManualBanksResult({ success: true, count: banks.length, banks: banks.slice(0, 3) });
      console.log('✅ Manual banks fetch successful:', banks.length, 'banks');
    } catch (error) {
      console.error('❌ Manual banks fetch failed:', error);
      setManualBanksResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsLoadingManualBanks(false);
    }
  };

  const testBackendBanksDirect = async () => {
    setBackendBanksResult('Testing...');
    try {
      console.log('🧪 Testing backend banks directly...');
      const response = await fetch('https://655f12858ff3.ngrok-free.app/accounts/banks', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'MonziApp/1.0.0',
        },
      });
      
      console.log('📨 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);
      
      setBackendBanksResult(`Success: ${data.banks?.length || 0} banks found`);
    } catch (error) {
      console.error('❌ Backend banks test failed:', error);
      setBackendBanksResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testBasicConnectivity = async () => {
    setBackendBanksResult('Testing basic connectivity...');
    try {
      console.log('🧪 Testing basic connectivity...');
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📨 Basic connectivity response status:', response.status);
      const data = await response.json();
      console.log('📦 Basic connectivity response data:', data);
      
      setBackendBanksResult(`Basic connectivity: Success (${response.status})`);
    } catch (error) {
      console.error('❌ Basic connectivity test failed:', error);
      setBackendBanksResult(`Basic connectivity: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testPushNotifications = async () => {
    setIsTestingPush(true);
    try {
      // Gather comprehensive push notification info
      const pushInfo: any = {
        // Environment info
        isDevice: Device.isDevice,
        platform: Platform.OS,
        appOwnership: Constants.appOwnership,
        executionEnvironment: Constants.executionEnvironment,
        
        // Device info
        deviceName: Device.deviceName,
        modelId: Device.modelId,
        brand: Device.brand,
        manufacturer: Device.manufacturer,
        
        // App info
        appVersion: Constants.expoConfig?.version,
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
        
        // Current state
        authToken: !!authToken,
        expoPushToken: expoPushToken ? expoPushToken.substring(0, 30) + '...' : null,
        isPushRegistered,
        permissionStatus,
        hasPermissions,
        canRequestPermissions,
        pushError,
      };

      // Test permissions if needed
      if (!hasPermissions && canRequestPermissions) {
        console.log('📱 Requesting push permissions...');
        const granted = await requestPermissions();
        pushInfo.permissionGranted = granted;
      }

      // Test token generation if we don't have one
      if (!expoPushToken && hasPermissions) {
        console.log('📱 Getting push token...');
        const token = await PushNotificationService.registerForPushNotifications();
        pushInfo.tokenGenerated = !!token;
        pushInfo.newToken = token ? token.substring(0, 30) + '...' : null;
      }

      // Test backend registration
      if (authToken && (expoPushToken || pushInfo.newToken)) {
        console.log('📱 Testing backend registration...');
        const registered = await registerForPushNotifications();
        pushInfo.backendRegistered = registered;
      }

      // Test notification sending if registered
      if (authToken && isPushRegistered) {
        console.log('📱 Sending test notification...');
        const testSent = await PushNotificationService.sendTestNotification(authToken, 'test');
        pushInfo.testNotificationSent = testSent;
      }

      setPushResult({ success: true, info: pushInfo });
      console.log('✅ Push notification test completed:', pushInfo);
    } catch (error) {
      console.error('❌ Push notification test failed:', error);
      setPushResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        info: {
          isDevice: Device.isDevice,
          platform: Platform.OS,
          authToken: !!authToken,
          permissionStatus,
        }
      });
    } finally {
      setIsTestingPush(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Network & Push Notification Diagnostic Tool</Text>
      
      {/* Network Connectivity Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Network Connectivity Test</Text>
        <TouchableOpacity
          style={styles.button} 
          onPress={runNetworkDiagnostic}
          disabled={isRunningDiagnostic}
        >
          {isRunningDiagnostic ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Test Network</Text>
          )}
        </TouchableOpacity>

        {diagnosticResult && (
          <View style={styles.result}>
            <Text style={styles.resultTitle}>Network Test Result:</Text>
            <Text style={[styles.resultText, { color: diagnosticResult.isReachable ? '#4CAF50' : '#F44336' }]}>
              Status: {diagnosticResult.isReachable ? 'Reachable ✅' : 'Unreachable ❌'}
            </Text>
            <Text style={styles.resultText}>Latency: {diagnosticResult.latency}ms</Text>
            {diagnosticResult.error && (
              <Text style={[styles.resultText, { color: '#F44336' }]}>Error: {diagnosticResult.error}</Text>
            )}
            <Text style={styles.resultText}>Base URL: {diagnosticResult.details?.baseUrl}</Text>
          </View>
        )}
      </View>

      {/* Backend Banks Direct Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backend Banks Test</Text>
        <TouchableOpacity onPress={testBackendBanksDirect} style={styles.button}>
          <Text style={styles.buttonText}>Test Backend Banks</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={testBasicConnectivity} style={styles.button}>
          <Text style={styles.buttonText}>Test Basic Connectivity</Text>
        </TouchableOpacity>
        <Text style={styles.resultText}>{backendBanksResult}</Text>
      </View>

      {/* Push Notifications Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Push Notifications (Full Test)</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#9C27B0' }]} 
          onPress={testPushNotifications}
          disabled={isTestingPush}
        >
          {isTestingPush ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Test Push Notifications</Text>
          )}
        </TouchableOpacity>
        
        {/* Current Push Status */}
        <View style={styles.result}>
          <Text style={styles.resultTitle}>Current Push Status:</Text>
          <Text style={styles.resultText}>Auth Token: {authToken ? 'Available ✅' : 'Missing ❌'}</Text>
          <Text style={styles.resultText}>Permission: {permissionStatus}</Text>
          <Text style={styles.resultText}>Has Token: {expoPushToken ? 'Yes ✅' : 'No ❌'}</Text>
          <Text style={styles.resultText}>Registered: {isPushRegistered ? 'Yes ✅' : 'No ❌'}</Text>
          <Text style={styles.resultText}>Platform: {Platform.OS}</Text>
          <Text style={styles.resultText}>Is Device: {Device.isDevice ? 'Yes ✅' : 'No ❌'}</Text>
          {pushError && (
            <Text style={[styles.resultText, { color: '#F44336' }]}>Error: {pushError}</Text>
          )}
      </View>

        {pushResult && (
          <View style={styles.result}>
            <Text style={styles.resultTitle}>Push Test Result:</Text>
            <Text style={[styles.resultText, { color: pushResult.success ? '#4CAF50' : '#F44336' }]}>
              Status: {pushResult.success ? 'Success ✅' : 'Failed ❌'}
            </Text>
            {pushResult.success ? (
              <>
                <Text style={styles.resultText}>App Ownership: {pushResult.info.appOwnership}</Text>
                <Text style={styles.resultText}>Execution Env: {pushResult.info.executionEnvironment}</Text>
                <Text style={styles.resultText}>Device: {pushResult.info.deviceName}</Text>
                {pushResult.info.tokenGenerated !== undefined && (
                  <Text style={styles.resultText}>Token Generated: {pushResult.info.tokenGenerated ? 'Yes ✅' : 'No ❌'}</Text>
                )}
                {pushResult.info.backendRegistered !== undefined && (
                  <Text style={styles.resultText}>Backend Registered: {pushResult.info.backendRegistered ? 'Yes ✅' : 'No ❌'}</Text>
                )}
                {pushResult.info.testNotificationSent !== undefined && (
                  <Text style={styles.resultText}>Test Sent: {pushResult.info.testNotificationSent ? 'Yes ✅' : 'No ❌'}</Text>
                )}
              </>
            ) : (
              <Text style={[styles.resultText, { color: '#F44336' }]}>Error: {pushResult.error}</Text>
            )}
          </View>
        )}
      </View>

      {/* React Query Banks Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. React Query Banks (Current Implementation)</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => refetch()}
          disabled={isQueryLoading}
        >
          {isQueryLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Refetch Banks</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.result}>
          <Text style={styles.resultTitle}>React Query Result:</Text>
          {isQueryLoading && <Text style={styles.resultText}>Loading...</Text>}
          {queryError && (
            <Text style={[styles.resultText, { color: '#F44336' }]}>
              Error: {queryError instanceof Error ? queryError.message : 'Unknown error'}
            </Text>
          )}
          {banksData && (
            <Text style={[styles.resultText, { color: '#4CAF50' }]}>
              Success: {banksData.length} banks loaded ✅
            </Text>
          )}
        </View>
        </View>

      {/* Hybrid Banks Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Hybrid Banks Fetch (SME Plug + Backend)</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={testManualBanksFetch}
          disabled={isLoadingManualBanks}
        >
          {isLoadingManualBanks ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Test Hybrid Fetch</Text>
          )}
        </TouchableOpacity>
        
        {manualBanksResult && (
          <View style={styles.result}>
            <Text style={styles.resultTitle}>Hybrid Fetch Result:</Text>
            <Text style={[styles.resultText, { color: manualBanksResult.success ? '#4CAF50' : '#F44336' }]}>
              Status: {manualBanksResult.success ? 'Success ✅' : 'Failed ❌'}
        </Text>
            {manualBanksResult.success ? (
              <>
                <Text style={styles.resultText}>Banks Count: {manualBanksResult.count}</Text>
                <Text style={styles.resultText}>Sample Banks:</Text>
                {manualBanksResult.banks.map((bank: any, index: number) => (
                  <Text key={index} style={styles.bankText}>• {bank.name}</Text>
                ))}
              </>
            ) : (
              <Text style={[styles.resultText, { color: '#F44336' }]}>Error: {manualBanksResult.error}</Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#111',
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5C842',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#F5C842',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  result: {
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
  },
  bankText: {
    fontSize: 12,
    color: '#aaa',
    marginLeft: 10,
    marginBottom: 2,
  },
}); 