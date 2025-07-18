import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ScanUsage {
  currentMonth: string; // Format: "YYYY-MM"
  freeScansUsed: number;
  paidScansUsed: number;
  lastScanDate?: string;
}

export interface ScanLimit {
  freeScansPerMonth: number;
  paidScanPrice: number; // in NGN
  warningThreshold: number; // Show warning when free scans <= this number
}

class ScanTrackingService {
  private static instance: ScanTrackingService;
  private readonly STORAGE_KEY = 'scan_usage_data';
  private readonly DEFAULT_LIMITS: ScanLimit = {
    freeScansPerMonth: 20,
    paidScanPrice: 2.5,
    warningThreshold: 3
  };

  public static getInstance(): ScanTrackingService {
    if (!ScanTrackingService.instance) {
      ScanTrackingService.instance = new ScanTrackingService();
    }
    return ScanTrackingService.instance;
  }

  /**
   * Get current month in YYYY-MM format
   */
  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Get scan usage for current month
   */
  async getCurrentUsage(): Promise<ScanUsage> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return this.createNewMonthUsage();
      }

      const usage: ScanUsage = JSON.parse(stored);
      const currentMonth = this.getCurrentMonth();

      // If it's a new month, reset the usage
      if (usage.currentMonth !== currentMonth) {
        const newUsage = this.createNewMonthUsage();
        await this.saveUsage(newUsage);
        return newUsage;
      }

      return usage;
    } catch (error) {
      console.error('Error getting scan usage:', error);
      return this.createNewMonthUsage();
    }
  }

  /**
   * Create new month usage with reset counters
   */
  private createNewMonthUsage(): ScanUsage {
    return {
      currentMonth: this.getCurrentMonth(),
      freeScansUsed: 0,
      paidScansUsed: 0,
      lastScanDate: new Date().toISOString()
    };
  }

  /**
   * Save usage data to storage
   */
  private async saveUsage(usage: ScanUsage): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(usage));
    } catch (error) {
      console.error('Error saving scan usage:', error);
    }
  }

  /**
   * Record a scan (increment usage)
   */
  async recordScan(): Promise<ScanUsage> {
    const usage = await this.getCurrentUsage();
    const limits = this.DEFAULT_LIMITS;

    // Determine if this should be a free or paid scan
    if (usage.freeScansUsed < limits.freeScansPerMonth) {
      usage.freeScansUsed++;
    } else {
      usage.paidScansUsed++;
    }

    usage.lastScanDate = new Date().toISOString();
    await this.saveUsage(usage);

    console.log(`📊 Scan recorded: Free scans used: ${usage.freeScansUsed}/${limits.freeScansPerMonth}, Paid scans: ${usage.paidScansUsed}`);
    return usage;
  }

  /**
   * Get remaining free scans
   */
  async getRemainingFreeScans(): Promise<number> {
    const usage = await this.getCurrentUsage();
    const limits = this.DEFAULT_LIMITS;
    return Math.max(0, limits.freeScansPerMonth - usage.freeScansUsed);
  }

  /**
   * Get scan status message for UI
   */
  async getScanStatusMessage(): Promise<string> {
    const remainingFree = await this.getRemainingFreeScans();
    const limits = this.DEFAULT_LIMITS;

    if (remainingFree > limits.warningThreshold) {
      return `${remainingFree} free scans left this month`;
    } else if (remainingFree > 0) {
      return `${remainingFree} free scans then NGN ${limits.paidScanPrice}/scan`;
    } else {
      return `NGN ${limits.paidScanPrice}/scan`;
    }
  }

  /**
   * Check if user has free scans remaining
   */
  async hasFreeScansRemaining(): Promise<boolean> {
    const remaining = await this.getRemainingFreeScans();
    return remaining > 0;
  }

  /**
   * Get scan limits configuration
   */
  getScanLimits(): ScanLimit {
    return { ...this.DEFAULT_LIMITS };
  }

  /**
   * Reset usage for testing (development only)
   */
  async resetUsage(): Promise<void> {
    const newUsage = this.createNewMonthUsage();
    await this.saveUsage(newUsage);
    console.log('🔄 Scan usage reset for testing');
  }

  /**
   * Get detailed usage statistics
   */
  async getUsageStats(): Promise<{
    currentMonth: string;
    freeScansUsed: number;
    paidScansUsed: number;
    remainingFreeScans: number;
    totalScansThisMonth: number;
    estimatedCost: number;
    lastScanDate?: string;
  }> {
    const usage = await this.getCurrentUsage();
    const limits = this.DEFAULT_LIMITS;
    const remainingFree = await this.getRemainingFreeScans();

    return {
      currentMonth: usage.currentMonth,
      freeScansUsed: usage.freeScansUsed,
      paidScansUsed: usage.paidScansUsed,
      remainingFreeScans: remainingFree,
      totalScansThisMonth: usage.freeScansUsed + usage.paidScansUsed,
      estimatedCost: usage.paidScansUsed * limits.paidScanPrice,
      lastScanDate: usage.lastScanDate
    };
  }
}

export default ScanTrackingService; 