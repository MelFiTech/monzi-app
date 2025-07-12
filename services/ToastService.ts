class ToastService {
  private showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  
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
}

export default new ToastService(); 