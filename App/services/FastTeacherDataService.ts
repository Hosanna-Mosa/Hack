import { TeacherAPI, ClassesAPI } from '../lib/api';
import { LocalStorage, STORAGE_KEYS } from '../utils/LocalStorage';

// Fast, optimized teacher data service with memoization
class FastTeacherDataService {
  private cache = new Map<string, any>();
  private loadingPromises = new Map<string, Promise<any>>();

  /**
   * Fast get teacher classes with aggressive caching
   */
  async getTeacherClasses(forceRefresh: boolean = false): Promise<any[]> {
    const cacheKey = 'teacher_classes';
    
    // Return cached data immediately if available
    if (!forceRefresh && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    // Check local storage first
    if (!forceRefresh) {
      const cachedData = await LocalStorage.getItem<any[]>(STORAGE_KEYS.TEACHER_CLASSES);
      if (cachedData) {
        this.cache.set(cacheKey, cachedData);
        return cachedData;
      }
    }

    // Fetch from API
    const promise = this.fetchTeacherClasses();
    this.loadingPromises.set(cacheKey, promise);
    
    try {
      const result = await promise;
      this.cache.set(cacheKey, result);
      return result;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  private async fetchTeacherClasses(): Promise<any[]> {
    const response = await TeacherAPI.getAssignedClasses();
    if (response.success && response.data) {
      const classes = Array.isArray(response.data) ? response.data : [response.data];
      await LocalStorage.setItem(STORAGE_KEYS.TEACHER_CLASSES, classes);
      return classes;
    }
    throw new Error(response.message || 'Failed to fetch teacher classes');
  }

  /**
   * Fast get teacher students with parallel fetching
   */
  async getTeacherStudents(forceRefresh: boolean = false): Promise<any[]> {
    const cacheKey = 'teacher_students';
    
    if (!forceRefresh && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    if (!forceRefresh) {
      const cachedData = await LocalStorage.getItem<any[]>(STORAGE_KEYS.TEACHER_STUDENTS);
      if (cachedData) {
        this.cache.set(cacheKey, cachedData);
        return cachedData;
      }
    }

    const promise = this.fetchTeacherStudents();
    this.loadingPromises.set(cacheKey, promise);
    
    try {
      const result = await promise;
      this.cache.set(cacheKey, result);
      return result;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  private async fetchTeacherStudents(): Promise<any[]> {
    const classes = await this.getTeacherClasses();
    const classIds = classes.map(cls => cls.id);
    
    if (classIds.length === 0) return [];

    // Fetch all students in parallel
    const studentPromises = classIds.map(classId => 
      ClassesAPI.getStudentsByClass(classId).catch(() => ({ success: false, data: [] }))
    );
    
    const responses = await Promise.all(studentPromises);
    const allStudents: any[] = [];
    
    responses.forEach(response => {
      if (response.success && response.data) {
        const students = Array.isArray(response.data) ? response.data : [response.data];
        allStudents.push(...students);
      }
    });

    // Fast deduplication using Map
    const studentMap = new Map();
    allStudents.forEach(student => {
      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, student);
      }
    });
    const uniqueStudents = Array.from(studentMap.values());

    await LocalStorage.setItem(STORAGE_KEYS.TEACHER_STUDENTS, uniqueStudents);
    return uniqueStudents;
  }

  /**
   * Ultra-fast preload with parallel execution
   */
  async preloadTeacherData(): Promise<any> {
    // Use Promise.allSettled for maximum speed - don't fail if one fails
    const [classes, students] = await Promise.allSettled([
      this.getTeacherClasses(true),
      this.getTeacherStudents(true)
    ]);

    return {
      classes: classes.status === 'fulfilled' ? classes.value : [],
      students: students.status === 'fulfilled' ? students.value : [],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { [key: string]: boolean } {
    return {
      classes: this.cache.has('teacher_classes'),
      students: this.cache.has('teacher_students')
    };
  }
}

export const fastTeacherDataService = new FastTeacherDataService();
export default fastTeacherDataService;
