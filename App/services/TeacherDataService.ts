import { TeacherAPI, ClassesAPI } from '../lib/api';
import { LocalStorage, STORAGE_KEYS } from '../utils/LocalStorage';

export interface ClassData {
  id: string;
  name: string;
  grade: string;
  section: string;
  subject?: string;
  studentCount: number;
  studentIds: string[];
  teacherIds: string[];
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentData {
  id: string;
  name: string;
  rollNumber: string;
  classId: string;
  schoolId: string;
  parentId?: string;
  profile: {
    name: string;
    contact: {
      phone?: string;
      email?: string;
    };
    dateOfBirth?: string;
    address?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassWithStudents extends ClassData {
  students: StudentData[];
}

export interface TeacherDataCache {
  classes: ClassData[];
  students: StudentData[];
  classesWithStudents: ClassWithStudents[];
  lastUpdated: string;
  expiresAt: string;
}

class TeacherDataService {
  /**
   * Fetch and cache teacher's assigned classes
   */
  async getTeacherClasses(forceRefresh: boolean = false): Promise<ClassData[]> {
    try {
      // Check if we have valid cached data
      if (!forceRefresh) {
        const cachedData = await LocalStorage.getItem<ClassData[]>(STORAGE_KEYS.TEACHER_CLASSES);
        if (cachedData) {
          console.log('📦 Using cached teacher classes data');
          return cachedData;
        }
      }

      console.log('🌐 Fetching teacher classes from API...');
      const response = await TeacherAPI.getAssignedClasses();
      
      if (response.success && response.data) {
        const classes = Array.isArray(response.data) ? response.data : [response.data];
        
        // Cache the data
        await LocalStorage.setItem(STORAGE_KEYS.TEACHER_CLASSES, classes);
        console.log(`✅ Cached ${classes.length} teacher classes`);
        
        return classes;
      } else {
        throw new Error(response.message || 'Failed to fetch teacher classes');
      }
    } catch (error) {
      console.error('❌ Error fetching teacher classes:', error);
      
      // Try to return cached data even if expired
      const cachedData = await LocalStorage.getItem<ClassData[]>(STORAGE_KEYS.TEACHER_CLASSES);
      if (cachedData) {
        console.log('⚠️ Using expired cached data for teacher classes');
        return cachedData;
      }
      
      throw error;
    }
  }

  /**
   * Fetch and cache students for teacher's classes (optimized for speed)
   */
  async getTeacherStudents(forceRefresh: boolean = false): Promise<StudentData[]> {
    try {
      // Check if we have valid cached data
      if (!forceRefresh) {
        const cachedData = await LocalStorage.getItem<StudentData[]>(STORAGE_KEYS.TEACHER_STUDENTS);
        if (cachedData) return cachedData;
      }
      
      // First get the classes to know which students to fetch
      const classes = await this.getTeacherClasses(forceRefresh);
      const classIds = classes.map(cls => cls.id);
      
      if (classIds.length === 0) return [];

      // Fetch students for all classes in parallel for maximum speed
      const studentPromises = classIds.map(classId => 
        ClassesAPI.getStudentsByClass(classId).catch(() => ({ success: false, data: [] }))
      );
      
      const responses = await Promise.all(studentPromises);
      const allStudents: StudentData[] = [];
      
      responses.forEach(response => {
        if (response.success && response.data) {
          const students = Array.isArray(response.data) ? response.data : [response.data];
          allStudents.push(...students);
        }
      });

      // Remove duplicates based on student ID (optimized)
      const studentMap = new Map<string, StudentData>();
      allStudents.forEach(student => {
        if (!studentMap.has(student.id)) {
          studentMap.set(student.id, student);
        }
      });
      const uniqueStudents = Array.from(studentMap.values());

      // Cache the data
      await LocalStorage.setItem(STORAGE_KEYS.TEACHER_STUDENTS, uniqueStudents);
      
      return uniqueStudents;
    } catch (error) {
      console.error('❌ Error fetching teacher students:', error);
      
      // Try to return cached data even if expired
      const cachedData = await LocalStorage.getItem<StudentData[]>(STORAGE_KEYS.TEACHER_STUDENTS);
      if (cachedData) return cachedData;
      
      throw error;
    }
  }

  /**
   * Fetch and cache classes with their students
   */
  async getClassesWithStudents(forceRefresh: boolean = false): Promise<ClassWithStudents[]> {
    try {
      // Check if we have valid cached data
      if (!forceRefresh) {
        const cachedData = await LocalStorage.getItem<ClassWithStudents[]>(STORAGE_KEYS.TEACHER_CLASSES_WITH_STUDENTS);
        if (cachedData) {
          console.log('📦 Using cached classes with students data');
          return cachedData;
        }
      }

      console.log('🌐 Fetching classes with students from API...');
      
      const classes = await this.getTeacherClasses(forceRefresh);
      const students = await this.getTeacherStudents(forceRefresh);
      
      // Group students by class
      const studentsByClass = students.reduce((acc, student) => {
        if (!acc[student.classId]) {
          acc[student.classId] = [];
        }
        acc[student.classId].push(student);
        return acc;
      }, {} as Record<string, StudentData[]>);

      // Combine classes with their students
      const classesWithStudents: ClassWithStudents[] = classes.map(cls => ({
        ...cls,
        students: studentsByClass[cls.id] || []
      }));

      // Cache the data
      await LocalStorage.setItem(STORAGE_KEYS.TEACHER_CLASSES_WITH_STUDENTS, classesWithStudents);
      console.log(`✅ Cached ${classesWithStudents.length} classes with students`);
      
      return classesWithStudents;
    } catch (error) {
      console.error('❌ Error fetching classes with students:', error);
      
      // Try to return cached data even if expired
      const cachedData = await LocalStorage.getItem<ClassWithStudents[]>(STORAGE_KEYS.TEACHER_CLASSES_WITH_STUDENTS);
      if (cachedData) {
        console.log('⚠️ Using expired cached data for classes with students');
        return cachedData;
      }
      
      throw error;
    }
  }

  /**
   * Get teacher dashboard data with caching
   */
  async getTeacherDashboard(forceRefresh: boolean = false): Promise<any> {
    try {
      // Check if we have valid cached data
      if (!forceRefresh) {
        const cachedData = await LocalStorage.getItem<any>(STORAGE_KEYS.TEACHER_DASHBOARD);
        if (cachedData) {
          console.log('📦 Using cached teacher dashboard data');
          return cachedData;
        }
      }

      console.log('🌐 Fetching teacher dashboard from API...');
      const response = await TeacherAPI.getDashboard();
      
      if (response.success && response.data) {
        const dashboardData = response.data;
        
        // Cache the data
        await LocalStorage.setItem(STORAGE_KEYS.TEACHER_DASHBOARD, dashboardData);
        console.log('✅ Cached teacher dashboard data');
        
        return dashboardData;
      } else {
        throw new Error(response.message || 'Failed to fetch teacher dashboard');
      }
    } catch (error) {
      console.error('❌ Error fetching teacher dashboard:', error);
      
      // Try to return cached data even if expired
      const cachedData = await LocalStorage.getItem<any>(STORAGE_KEYS.TEACHER_DASHBOARD);
      if (cachedData) {
        console.log('⚠️ Using expired cached data for teacher dashboard');
        return cachedData;
      }
      
      throw error;
    }
  }

  /**
   * Preload all teacher data after login (optimized for speed)
   */
  async preloadTeacherData(): Promise<TeacherDataCache> {
    try {
      // Use Promise.all for maximum speed - fetch all data in parallel
      const [classes, students, classesWithStudents, dashboard] = await Promise.all([
        this.getTeacherClasses(true),
        this.getTeacherStudents(true),
        this.getClassesWithStudents(true),
        this.getTeacherDashboard(true)
      ]);

      const result: TeacherDataCache = {
        classes,
        students,
        classesWithStudents,
        lastUpdated: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      return result;
    } catch (error) {
      console.error('❌ Error preloading teacher data:', error);
      throw error;
    }
  }

  /**
   * Clear all cached teacher data
   */
  async clearTeacherData(): Promise<void> {
    try {
      await LocalStorage.clearTeacherData();
      console.log('🧹 Teacher data cleared from cache');
    } catch (error) {
      console.error('❌ Error clearing teacher data:', error);
      throw error;
    }
  }

  /**
   * Get storage info for debugging
   */
  async getStorageInfo(): Promise<any> {
    return await LocalStorage.getStorageInfo();
  }

  /**
   * Check if data is cached and valid
   */
  async hasValidData(): Promise<{
    classes: boolean;
    students: boolean;
    classesWithStudents: boolean;
    dashboard: boolean;
  }> {
    const [classes, students, classesWithStudents, dashboard] = await Promise.all([
      LocalStorage.hasValidData(STORAGE_KEYS.TEACHER_CLASSES),
      LocalStorage.hasValidData(STORAGE_KEYS.TEACHER_STUDENTS),
      LocalStorage.hasValidData(STORAGE_KEYS.TEACHER_CLASSES_WITH_STUDENTS),
      LocalStorage.hasValidData(STORAGE_KEYS.TEACHER_DASHBOARD)
    ]);

    return { classes, students, classesWithStudents, dashboard };
  }
}

export const teacherDataService = new TeacherDataService();
export default teacherDataService;
