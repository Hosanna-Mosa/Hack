import { useState, useEffect, useCallback } from 'react';
import { teacherDataService, ClassData, StudentData, ClassWithStudents } from '../services/TeacherDataService';
import { useAuth } from '../contexts/AuthContext';

interface UseTeacherDataReturn {
  // Data
  classes: ClassData[];
  students: StudentData[];
  classesWithStudents: ClassWithStudents[];
  
  // Loading states
  isLoadingClasses: boolean;
  isLoadingStudents: boolean;
  isLoadingClassesWithStudents: boolean;
  
  // Error states
  classesError: string | null;
  studentsError: string | null;
  classesWithStudentsError: string | null;
  
  // Actions
  refreshClasses: () => Promise<void>;
  refreshStudents: () => Promise<void>;
  refreshClassesWithStudents: () => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // Cache info
  hasValidCache: {
    classes: boolean;
    students: boolean;
    classesWithStudents: boolean;
  };
  
  // Storage info
  storageInfo: any;
}

export const useTeacherData = (): UseTeacherDataReturn => {
  const { state } = useAuth();
  const { user, isAuthenticated } = state;
  
  // Data state
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [classesWithStudents, setClassesWithStudents] = useState<ClassWithStudents[]>([]);
  
  // Loading states
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingClassesWithStudents, setIsLoadingClassesWithStudents] = useState(false);
  
  // Error states
  const [classesError, setClassesError] = useState<string | null>(null);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [classesWithStudentsError, setClassesWithStudentsError] = useState<string | null>(null);
  
  // Cache info
  const [hasValidCache, setHasValidCache] = useState({
    classes: false,
    students: false,
    classesWithStudents: false,
  });
  
  const [storageInfo, setStorageInfo] = useState<any>(null);

  // Check if user is a teacher
  const isTeacher = isAuthenticated && user?.role === 'teacher';

  // Load classes
  const loadClasses = useCallback(async (forceRefresh: boolean = false) => {
    if (!isTeacher) return;
    
    setIsLoadingClasses(true);
    setClassesError(null);
    
    try {
      const data = await teacherDataService.getTeacherClasses(forceRefresh);
      setClasses(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load classes';
      setClassesError(errorMessage);
      console.error('❌ Error loading classes:', error);
    } finally {
      setIsLoadingClasses(false);
    }
  }, [isTeacher]);

  // Load students
  const loadStudents = useCallback(async (forceRefresh: boolean = false) => {
    if (!isTeacher) return;
    
    setIsLoadingStudents(true);
    setStudentsError(null);
    
    try {
      const data = await teacherDataService.getTeacherStudents(forceRefresh);
      setStudents(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load students';
      setStudentsError(errorMessage);
      console.error('❌ Error loading students:', error);
    } finally {
      setIsLoadingStudents(false);
    }
  }, [isTeacher]);

  // Load classes with students
  const loadClassesWithStudents = useCallback(async (forceRefresh: boolean = false) => {
    if (!isTeacher) return;
    
    setIsLoadingClassesWithStudents(true);
    setClassesWithStudentsError(null);
    
    try {
      const data = await teacherDataService.getClassesWithStudents(forceRefresh);
      setClassesWithStudents(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load classes with students';
      setClassesWithStudentsError(errorMessage);
      console.error('❌ Error loading classes with students:', error);
    } finally {
      setIsLoadingClassesWithStudents(false);
    }
  }, [isTeacher]);

  // Refresh functions
  const refreshClasses = useCallback(() => loadClasses(true), [loadClasses]);
  const refreshStudents = useCallback(() => loadStudents(true), [loadStudents]);
  const refreshClassesWithStudents = useCallback(() => loadClassesWithStudents(true), [loadClassesWithStudents]);
  
  const refreshAll = useCallback(async () => {
    if (!isTeacher) return;
    
    await Promise.all([
      loadClasses(true),
      loadStudents(true),
      loadClassesWithStudents(true)
    ]);
  }, [isTeacher, loadClasses, loadStudents, loadClassesWithStudents]);

  // Load cache validity info
  const loadCacheInfo = useCallback(async () => {
    if (!isTeacher) return;
    
    try {
      const cacheValidity = await teacherDataService.hasValidData();
      setHasValidCache(cacheValidity);
      
      const storage = await teacherDataService.getStorageInfo();
      setStorageInfo(storage);
    } catch (error) {
      console.error('❌ Error loading cache info:', error);
    }
  }, [isTeacher]);

  // Initial data load (optimized for speed)
  useEffect(() => {
    if (isTeacher) {
      // Load all data in parallel for maximum speed
      Promise.all([
        loadClasses(),
        loadStudents(),
        loadClassesWithStudents(),
        loadCacheInfo()
      ]).catch(error => {
        console.error('❌ Error loading teacher data:', error);
      });
    } else {
      // Clear data if not a teacher
      setClasses([]);
      setStudents([]);
      setClassesWithStudents([]);
      setClassesError(null);
      setStudentsError(null);
      setClassesWithStudentsError(null);
    }
  }, [isTeacher, loadClasses, loadStudents, loadClassesWithStudents, loadCacheInfo]);

  return {
    // Data
    classes,
    students,
    classesWithStudents,
    
    // Loading states
    isLoadingClasses,
    isLoadingStudents,
    isLoadingClassesWithStudents,
    
    // Error states
    classesError,
    studentsError,
    classesWithStudentsError,
    
    // Actions
    refreshClasses,
    refreshStudents,
    refreshClassesWithStudents,
    refreshAll,
    
    // Cache info
    hasValidCache,
    
    // Storage info
    storageInfo,
  };
};

export default useTeacherData;
