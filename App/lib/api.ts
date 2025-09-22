// API Configuration and Services
import AsyncStorage from "@react-native-async-storage/async-storage";

// Base API configuration
const API_BASE_URL = __DEV__
  ? "http://10.179.89.143:8000/api"
  : "https://hack-backend-08d7.onrender.com/api";

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  user?: User;
}

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

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface TeacherLoginCredentials {
  phoneNumber: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  role: "admin" | "teacher" | "parent";
  profile: {
    name: string;
    contact: {
      email: string;
      phone?: string;
    };
  };
  school?: {
    name: string;
    email: string;
    address?: string;
    contactInfo?: any;
  };
}

// Token management
export const TokenManager = {
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem("auth_token");
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem("auth_token", token);
    } catch (error) {
      console.error("Error setting token:", error);
    }
  },

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem("auth_token");
    } catch (error) {
      console.error("Error removing token:", error);
    }
  },
};

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await TokenManager.getToken();

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Check if response is ok
    if (!response.ok) {
      // Try to parse error response
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If we can't parse the error response, use the status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    // Check if response has content
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Server returned non-JSON response");
    }

    // Get response text first to check if it's empty
    const responseText = await response.text();
    if (!responseText.trim()) {
      throw new Error("Server returned empty response");
    }

    // Parse JSON
    let data: ApiResponse<T>;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Response text:", responseText);
      throw new Error("Invalid JSON response from server");
    }

    return data;
  } catch (error) {
    console.error("API request failed:", error);

    // Handle specific error types
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        "Network error: Unable to connect to server. Please check if the backend is running on http://localhost:8000"
      );
    }

    // Handle network request failed specifically
    if (error instanceof TypeError && error.message.includes("Network request failed")) {
      throw new Error(
        "Backend server is not running. Please start the backend server with 'npm start' in the Backend directory."
      );
    }

    throw error;
  }
}

// Auth API services
export const AuthAPI = {
  // Login user
  async login(credentials: LoginCredentials): Promise<ApiResponse> {
    const response = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (response.success && response.token) {
      await TokenManager.setToken(response.token);
    }

    return response;
  },

  // Register user
  async register(userData: RegisterData): Promise<ApiResponse> {
    const response = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    if (response.success && response.token) {
      await TokenManager.setToken(response.token);
    }

    return response;
  },

  // Get current user
  async getCurrentUser(): Promise<ApiResponse> {
    return apiRequest("/auth/me");
  },

  // Logout user
  async logout(): Promise<void> {
    await TokenManager.removeToken();
  },
};

// Attendance API services
export const AttendanceAPI = {
  // Get attendance records
  async getAttendanceRecords(params?: {
    studentId?: string;
    classId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
    }

    const endpoint = `/attendance${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    return apiRequest(endpoint);
  },

  // Get attendance statistics (reports)
  async getStats(params?: {
    classId?: string;
    startDate?: string;
    endDate?: string;
    period?: "daily" | "weekly" | "monthly";
  }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, String(value));
      });
    }

    const endpoint = `/attendance/stats${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    return apiRequest(endpoint);
  },

  // Mark attendance
  async markAttendance(data: {
    studentId: string;
    classId: string;
    status: "present" | "absent" | "late";
    date: string;
    notes?: string;
  }): Promise<ApiResponse> {
    return apiRequest("/attendance", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Batch mark attendance
  async markAttendanceBatch(records: Array<{
    studentId: string;
    classId: string;
    status: "present" | "absent" | "late" | "excused";
    date: string;
    method: "face" | "rfid" | "id" | "manual";
    notes?: string;
  }>): Promise<ApiResponse<{ inserted: number; partial?: boolean }>> {
    return apiRequest("/attendance/batch", {
      method: "POST",
      body: JSON.stringify({ records }),
    });
  },

  // Update attendance
  async updateAttendance(
    attendanceId: string,
    data: {
      status?: "present" | "absent" | "late";
      notes?: string;
    }
  ): Promise<ApiResponse> {
    return apiRequest(`/attendance/${attendanceId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};

// Students API services
export const StudentsAPI = {
  // Get students
  async getStudents(params?: {
    classId?: string;
    schoolId?: string;
  }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
    }

    const endpoint = `/students${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    return apiRequest(endpoint);
  },

  // Get student by ID
  async getStudent(studentId: string): Promise<ApiResponse> {
    return apiRequest(`/students/${studentId}`);
  },
};

// Classes API services
export const ClassesAPI = {
  // Get classes
  async getClasses(schoolId?: string): Promise<ApiResponse> {
    const endpoint = schoolId ? `/classes?schoolId=${schoolId}` : "/classes";
    return apiRequest(endpoint);
  },

  // Get class by ID
  async getClass(classId: string): Promise<ApiResponse> {
    return apiRequest(`/classes/${classId}`);
  },

  // Get students by class ID
  async getStudentsByClass(classId: string): Promise<ApiResponse> {
    return apiRequest(`/classes/${classId}/students`);
  },
};

// Teacher API services
export const TeacherAPI = {
  // Teacher login with phone number
  async login(credentials: TeacherLoginCredentials): Promise<ApiResponse> {
    const response = await apiRequest("/teachers/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (response.success && response.token) {
      await TokenManager.setToken(response.token);
    }

    return response;
  },

  // Get teacher profile
  async getProfile(): Promise<ApiResponse> {
    return apiRequest("/teachers/profile");
  },

  // Update teacher profile
  async updateProfile(profileData: any): Promise<ApiResponse> {
    return apiRequest("/teachers/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  },

  // Get assigned classes
  async getAssignedClasses(): Promise<ApiResponse> {
    return apiRequest("/teachers/classes");
  },

  // Get classes with attendance status
  async getClassesWithAttendanceStatus(): Promise<ApiResponse> {
    return apiRequest("/teachers/classes/attendance-status");
  },

  // Get teacher dashboard
  async getDashboard(): Promise<ApiResponse> {
    return apiRequest("/teachers/dashboard");
  },

  // Change password
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse> {
    return apiRequest("/teachers/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // Change password from default (for first-time login)
  async changePasswordFromDefault(newPassword: string): Promise<ApiResponse> {
    return apiRequest("/teachers/change-password-from-default", {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    });
  },
};

// Health check
export const HealthAPI = {
  async checkHealth(): Promise<ApiResponse> {
    return apiRequest("/health");
  },
};

// Embeddings/Face API services
export const EmbeddingsAPI = {
  // Compare a captured face image against stored embeddings
  async compareFace(options: {
    imageBase64: string; // data URL or raw base64
    threshold?: number;
    sourceType?: string; // e.g., 'student-face'
    sourceId?: string; // restrict comparison to this id
  }): Promise<ApiResponse<{ matched: boolean; bestMatch?: any; threshold: number }>> {
    return apiRequest("/embeddings/compare", {
      method: "POST",
      body: JSON.stringify(options),
    });
  },

  // Enroll a face image and create embedding
  async enrollFace(options: {
    imageBase64: string;
    sourceId: string;
    sourceType?: string;
    metadata?: any;
  }): Promise<ApiResponse<{ id: string; dims: number }>> {
    return apiRequest("/embeddings/image", {
      method: "POST",
      body: JSON.stringify(options),
    });
  },
};

// Export all APIs
export const API = {
  auth: AuthAPI,
  teacher: TeacherAPI,
  attendance: AttendanceAPI,
  students: StudentsAPI,
  classes: ClassesAPI,
  health: HealthAPI,
  embeddings: EmbeddingsAPI,
  tokenManager: TokenManager,
};

export default API;
