import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// NOTE: Network helpers moved to `lib/api.ts`. Import { apiRequest, API_BASE_URL } from "@/lib/api" instead.