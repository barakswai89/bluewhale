// FILE: client/src/services/api.ts
import axios, { AxiosInstance } from 'axios';

// ✅ FIX: Use the env variable instead of a hardcoded URL.
// Previously the URL was hardcoded, meaning .env.production was ignored entirely.
// Now it reads VITE_API_URL from the appropriate .env file at build time.
// Make sure Netlify has VITE_API_URL set in its environment variables dashboard.
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://bluewhale-production-afb0.up.railway.app/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // ✅ NOTE: withCredentials: true is correct for JWT cookie flows, but since
  // this app uses Authorization headers (not cookies), it is safe to leave or remove.
  // Leaving it in case cookie-based auth is added later.
  withCredentials: false,
  // ✅ FIX: Add a timeout to handle Railway cold starts gracefully.
  // Railway free tier containers sleep after inactivity. A 15s timeout gives
  // the container time to wake up before the request fails silently.
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
