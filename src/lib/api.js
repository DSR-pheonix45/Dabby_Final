// Central base URL for the FastAPI backend.
// Configured via VITE_API_BASE_URL; falls back to local dev.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
