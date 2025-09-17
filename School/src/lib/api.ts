// Centralized API client for School app
// Single source of truth for base URL and authenticated requests

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
}

const DEFAULT_BASE_URL = "http://localhost:8000/api";
export const API_BASE_URL: string = (import.meta as any).env?.VITE_API_URL || DEFAULT_BASE_URL;

function getToken(): string | null {
  try {
    return localStorage.getItem("schoolToken") || localStorage.getItem("token");
  } catch {
    return null;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: "include" });

  const text = await response.text();
  let json: ApiResponse<T> | null = null;
  try { json = text ? (JSON.parse(text) as ApiResponse<T>) : null; } catch {}

  if (!response.ok) {
    const msg = (json && (json.message || JSON.stringify(json))) || response.statusText || `HTTP ${response.status}`;
    throw new Error(msg);
  }
  if (!json) throw new Error("Empty or invalid JSON response");
  return json;
}

// Example endpoints (extend as needed)
export const SchoolAPI = {
  login(credentials: { username: string; password: string }) {
    return apiRequest<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },
  getStudents(params?: Record<string, string>) {
    const query = params ? `?${new URLSearchParams(params).toString()}` : "";
    return apiRequest(`/students${query}`);
  },
  // Embeddings endpoints
  async upsertImageEmbeddingMultipart(payload: { sourceId: string; file: File; metadata?: any }) {
    const token = getToken();
    const form = new FormData();
    form.append('sourceId', payload.sourceId);
    if (payload.metadata) form.append('metadata', JSON.stringify(payload.metadata));
    form.append('image', payload.file);

    const res = await fetch(`${API_BASE_URL}/embeddings/image`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      } as any,
      body: form,
      credentials: 'include'
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message || 'Failed to upload image');
    return json as ApiResponse<{ id: string; dims: number }>;
  },
  async compareImageMultipart(file: File, options?: { threshold?: number }) {
    const token = getToken();
    const form = new FormData();
    if (options?.threshold !== undefined) form.append('threshold', String(options.threshold));
    form.append('image', file);
    const res = await fetch(`${API_BASE_URL}/embeddings/compare`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      } as any,
      body: form,
      credentials: 'include'
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message || 'Failed to compare image');
    return json as ApiResponse<{ matched: boolean; bestMatch: any; threshold: number }>;
  },
  async compareStored(sourceIdA: string, sourceIdB: string, options?: { threshold?: number }) {
    return apiRequest<{ matched: boolean; cosine: number; normDistance: number; threshold: number }>(`/embeddings/compare-stored`, {
      method: 'POST',
      body: JSON.stringify({ sourceIdA, sourceIdB, threshold: options?.threshold ?? 0.9, sourceType: 'image' })
    });
  }
};

export default SchoolAPI;


