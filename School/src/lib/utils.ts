import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Simple JSON fetch wrapper for backend API
export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const baseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const { token, headers, ...rest } = options;
  let bearer = token;
  if (!bearer) {
    try { bearer = localStorage.getItem('token') || undefined; } catch {}
  }
  const response = await fetch(`${baseUrl}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...(headers || {})
    },
    ...rest,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data as any)?.message || `Request failed with ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}