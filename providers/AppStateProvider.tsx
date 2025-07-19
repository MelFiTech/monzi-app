import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState } from 'react-native';

interface AppStateContextType {
  isAppInBackground: boolean;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [isAppInBackground, setIsAppInBackground] = useState(false);

  useEffect(() => {
    // Check initial app state
    const currentAppState = AppState.currentState;
    console.log('📱 AppStateProvider: Initial AppState:', currentAppState);
    if (currentAppState === 'background') {
      setIsAppInBackground(true);
    }

    // Listen for app state changes
    const handleAppStateChange = (nextAppState: string) => {
      console.log('📱 AppStateProvider: AppState changed to:', nextAppState);
      
      if (nextAppState === 'background') {
        console.log('📱 AppStateProvider: App going to background - setting global state');
        setIsAppInBackground(true);
      } else if (nextAppState === 'active') {
        console.log('📱 AppStateProvider: App coming to foreground - clearing global state');
        setIsAppInBackground(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  return (
    <AppStateContext.Provider value={{ isAppInBackground }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
} 