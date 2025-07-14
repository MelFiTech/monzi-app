import React, { createContext, useContext, useState, useEffect } from 'react';
import Toast from '@/components/common/Toast';
import ToastService from '@/services/ToastService';

interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export default function ToastProvider({ children }: ToastProviderProps) {
  const [toastState, setToastState] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (!message || message.trim() === '') return;
    setToastState({
      visible: true,
      message,
      type,
    });
  };

  const hideToast = () => {
    setToastState(prev => ({ ...prev, visible: false }));
  };

  // Register the toast handler with the global service
  useEffect(() => {
    ToastService.setToastHandler(showToast);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        visible={toastState.visible}
        message={toastState.message}
        type={toastState.type}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  );
} 