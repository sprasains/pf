import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // Handle specific error cases
      switch (error.response.status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 403:
          // Forbidden - show access denied message
          console.error('Access denied');
          break;
        case 429:
          // Rate limit exceeded
          console.error('Rate limit exceeded');
          break;
        default:
          // Handle other errors
          console.error('API Error:', error.response.data);
      }
    } else if (error.request) {
      // Network error
      console.error('Network Error:', error.request);
    } else {
      // Other errors
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
); 