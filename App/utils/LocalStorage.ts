import AsyncStorage from '@react-native-async-storage/async-storage';

interface StoredData<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // in milliseconds
}

export class LocalStorage {
  private static readonly EXPIRATION_DAYS = 10;
  private static readonly EXPIRATION_MS = this.EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

  /**
   * Store data with expiration (optimized for speed)
   */
  static async setItem<T>(key: string, data: T): Promise<void> {
    try {
      const storedData: StoredData<T> = {
        data,
        timestamp: Date.now(),
        expiresIn: this.EXPIRATION_MS,
      };
      
      // Use stringify with replacer for better performance
      const jsonData = JSON.stringify(storedData);
      await AsyncStorage.setItem(key, jsonData);
    } catch (error) {
      console.error(`❌ Error storing data for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get data with expiration check (optimized for speed)
   */
  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonData = await AsyncStorage.getItem(key);
      if (!jsonData) return null;

      const storedData: StoredData<T> = JSON.parse(jsonData);
      const now = Date.now();
      const isExpired = (now - storedData.timestamp) > storedData.expiresIn;

      if (isExpired) {
        // Remove expired data asynchronously
        this.removeItem(key).catch(() => {});
        return null;
      }

      return storedData.data;
    } catch (error) {
      console.error(`❌ Error retrieving data for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove specific item
   */
  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`🗑️ Data removed for key: ${key}`);
    } catch (error) {
      console.error(`❌ Error removing data for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear all teacher-related data
   */
  static async clearTeacherData(): Promise<void> {
    try {
      const keys = [
        'teacher_classes',
        'teacher_students',
        'teacher_classes_with_students',
        'teacher_dashboard_data'
      ];
      
      await AsyncStorage.multiRemove(keys);
      console.log('🧹 All teacher data cleared from local storage');
    } catch (error) {
      console.error('❌ Error clearing teacher data:', error);
      throw error;
    }
  }

  /**
   * Get remaining time until expiration
   */
  static async getRemainingTime(key: string): Promise<number | null> {
    try {
      const jsonData = await AsyncStorage.getItem(key);
      if (!jsonData) return null;

      const storedData: StoredData<any> = JSON.parse(jsonData);
      const now = Date.now();
      const elapsed = now - storedData.timestamp;
      const remaining = storedData.expiresIn - elapsed;
      
      return Math.max(0, remaining);
    } catch (error) {
      console.error(`❌ Error getting remaining time for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Check if data exists and is not expired
   */
  static async hasValidData(key: string): Promise<boolean> {
    try {
      const data = await this.getItem(key);
      return data !== null;
    } catch (error) {
      console.error(`❌ Error checking data validity for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get storage info for debugging
   */
  static async getStorageInfo(): Promise<{
    keys: string[];
    totalSize: number;
    teacherDataKeys: string[];
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const teacherDataKeys = keys.filter(key => 
        key.startsWith('teacher_') || 
        key.includes('classes') || 
        key.includes('students')
      );
      
      let totalSize = 0;
      for (const key of teacherDataKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += data.length;
        }
      }

      return {
        keys: teacherDataKeys,
        totalSize,
        teacherDataKeys
      };
    } catch (error) {
      console.error('❌ Error getting storage info:', error);
      return { keys: [], totalSize: 0, teacherDataKeys: [] };
    }
  }
}

// Storage keys constants
export const STORAGE_KEYS = {
  TEACHER_CLASSES: 'teacher_classes',
  TEACHER_STUDENTS: 'teacher_students', 
  TEACHER_CLASSES_WITH_STUDENTS: 'teacher_classes_with_students',
  TEACHER_DASHBOARD: 'teacher_dashboard_data',
  TEACHER_PROFILE: 'teacher_profile'
} as const;
