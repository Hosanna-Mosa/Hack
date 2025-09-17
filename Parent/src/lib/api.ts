// Centralized API client for Parent portal
// Uses fetch, reads base URL from Vite env, and attaches parent token

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
}

const DEFAULT_BASE_URL = "http://localhost:8000/api";
export const API_BASE_URL: string = (import.meta as any).env?.VITE_API_URL || DEFAULT_BASE_URL;

function getParentToken(): string | null {
  try {
    return localStorage.getItem("parentToken");
  } catch {
    return null;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = getParentToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  const text = await response.text();
  let json: ApiResponse<T> | null = null;
  try {
    json = text ? (JSON.parse(text) as ApiResponse<T>) : null;
  } catch {
    // fallthrough
  }

  if (!response.ok) {
    const msg = (json && (json.message || JSON.stringify(json))) || response.statusText || `HTTP ${response.status}`;
    throw new Error(msg);
  }

  if (!json) {
    throw new Error("Empty or invalid JSON response");
  }

  return json;
}

export const ParentAPI = {
  login(credentials: { mobile: string; password: string }) {
    return request<{ parent: any; token: string }>("/parents/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  changePassword(payload: { newPassword: string; confirmPassword: string }) {
    return request("/parents/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getProfile() {
    return request("/parents/profile");
  },

  getStudentAttendance(studentId: string) {
    return request(`/parents/students/${studentId}/attendance`);
  },
};

export default ParentAPI;


