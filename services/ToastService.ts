class ToastService {
  private showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  private backendUnavailableToastShown = false;
  
  setToastHandler(handler: (message: string, type?: 'success' | 'error' | 'info') => void) {
    this.showToast = handler;
  }
  
  show(message: string, type: 'success' | 'error' | 'info' = 'success') {
    if (this.showToast) {
      this.showToast(message, type);
    } else {
      console.log(`🍞 Toast: ${message} (${type})`);
    }
  }

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error');
  }

  info(message: string) {
    this.show(message, 'info');
  }

  // Backend unavailability specific methods
  showBackendUnavailable(message?: string) {
    if (!this.backendUnavailableToastShown) {
      const defaultMessage = 'Check network connection';
      this.info(message || defaultMessage);
      this.backendUnavailableToastShown = true;
    }
  }

  resetBackendUnavailableFlag() {
    this.backendUnavailableToastShown = false;
  }

  // Check if backend unavailable toast was already shown
  hasShownBackendUnavailable(): boolean {
    return this.backendUnavailableToastShown;
  }
}

export default new ToastService(); 