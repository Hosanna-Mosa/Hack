// Type definitions for the app

export interface User {
  _id: string;
  username: string;
  role: "admin" | "teacher" | "parent";
  profile: {
    name: string;
    contact: {
      email: string;
      phone?: string;
    };
  };
  schoolId?: string;
}

export interface Student {
  _id: string;
  name: string;
  studentId: string;
  classId: string;
  schoolId: string;
  parentIds: string[];
  profile: {
    name: string;
    contact: {
      email?: string;
      phone?: string;
    };
    dateOfBirth?: string;
    address?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Class {
  _id: string;
  name: string;
  schoolId: string;
  teacherId: string;
  studentIds: string[];
  schedule: {
    days: string[];
    startTime: string;
    endTime: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  _id: string;
  studentId: string;
  classId: string;
  date: string;
  status: "present" | "absent" | "late";
  notes?: string;
  markedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface School {
  _id: string;
  name: string;
  address: string;
  contactInfo: {
    email: string[];
    phone: string[];
  };
  settings: {
    attendanceMarkingWindow: number;
    lateThreshold: number;
  };
  adminIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Teacher {
  _id: string;
  userId: string;
  schoolId: string;
  classes: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Parent {
  _id: string;
  userId: string;
  studentIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  user?: User;
}

// Form types
export interface LoginForm {
  phoneNumber: string;
  password: string;
}

export interface RegisterForm {
  username: string;
  password: string;
  confirmPassword: string;
  role: "admin" | "teacher" | "parent";
  name: string;
  email: string;
  phone?: string;
  schoolName?: string;
  schoolEmail?: string;
}

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  Attendance: undefined;
  Students: undefined;
  Profile: undefined;
};

// State types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AttendanceState {
  records: AttendanceRecord[];
  isLoading: boolean;
  error: string | null;
  selectedDate: string;
  selectedClass: string | null;
}


