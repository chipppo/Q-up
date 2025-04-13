/**
 * API Configuration Module
 * 
 * This file sets up our Axios client for talking to the backend API.
 * It handles all the authentication stuff like:
 * - Adding tokens to requests
 * - Refreshing tokens when they expire
 * - Redirecting to login when refresh fails
 * - Queuing requests when refreshing
 */

import axios from 'axios';

/**
 * Main Axios instance configured with our API's base URL
 */
const API = axios.create({
  baseURL: '/api',
});

// Refreshing state
let isRefreshing = false;
let failedQueue = [];

/**
 * Processes the queue of failed requests after token refresh
 * 
 * When a token refresh happens, we queue up any requests that failed.
 * This function processes that queue either by:
 * - Resolving them with the new token if refresh was successful
 * - Rejecting them all if refresh failed
 * 
 * @param {Error|null} error - Error from token refresh attempt, or null if successful
 * @param {string|null} token - New access token, or null if refresh failed
 */
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Request interceptor
 * 
 * Adds the JWT auth token to all outgoing requests.
 * This is what makes the backend know who we are.
 */
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log detailed debugging information for file uploads
    if (config.data instanceof FormData && config.data.has('image')) {
      console.log('Uploading file with FormData', { 
        url: config.url,
        method: config.method,
        contentType: config.headers['Content-Type'],
      });
      
      // Check size of the file
      try {
        const file = config.data.get('image');
        if (file instanceof File) {
          console.log('File details:', {
            name: file.name,
            type: file.type,
            size: file.size,
          });
        }
      } catch (err) {
        console.error('Error getting file from FormData:', err);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor
 * 
 * Handles token expiration by:
 * 1. Catching 401 Unauthorized errors
 * 2. Using the refresh token to get a new access token
 * 3. Retrying the original request with the new token
 * 4. If refresh fails, logging the user out
 */
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is not 401 or the request was for refreshing token, just reject
    if (!error.response || error.response.status !== 401 || originalRequest.url === '/token/refresh/') {
      return Promise.reject(error);
    }

    if (!isRefreshing) {
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refresh');

      try {
        const response = await axios.post('/api/token/refresh/', {
          refresh: refreshToken
        });

        const { access } = response.data;
        localStorage.setItem('access', access);

        // Update the Authorization header on the original request
        originalRequest.headers.Authorization = `Bearer ${access}`;
        
        // Process all the requests that were waiting 
        processQueue(null, access);
        
        return API(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear tokens and redirect to login
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('username');
        
        // Only redirect to login if we're not already on a login page
        // This prevents unnecessary page reloads when login fails
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Add the failed request to queue
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    }).then(token => {
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return API(originalRequest);
    }).catch(err => {
      return Promise.reject(err);
    });
  }
);

/**
 * Utility function to format avatar URLs consistently across the application
 * 
 * @param {string|null} url - The avatar URL to format
 * @param {string} username - The username to use as fallback for generating avatar
 * @returns {string} Properly formatted avatar URL
 */
export const formatAvatarUrl = (url, username = 'U') => {
  // First letter of username, defaulting to 'U' if unavailable
  const firstLetter = username && username.length > 0 ? username[0].toUpperCase() : 'U';
  
  // Create a consistent hash from username for stable color generation
  const hash = username?.split('')?.reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0) || 0;
  
  // Generate a consistent color based on username hash
  const hue = Math.abs(hash) % 360;
  
  // Default avatar using UI Avatars service with username-based color
  const defaultAvatar = `https://ui-avatars.com/api/?name=${firstLetter}&background=hsl(${hue},70%,60%)&color=fff&size=256`;
  
  // Check for null, undefined, empty string and default avatar patterns
  if (!url || url === "" || url === "null" || url === "undefined") {
    return defaultAvatar;
  }
  
  // Check if it's an external URL
  if (url.startsWith('http')) {
    // Handle common error patterns in URLs
    if (url.includes('/media/default/') || 
        url.includes('/media/profile_pics/404') || 
        url.includes('404') || 
        url.includes('placeholder') ||
        url.includes('undefined') ||
        url.includes('null')) {
      return defaultAvatar;
    }
    
    // Fix incorrect region format in existing URLs
    if (url.includes('eu-north-1b')) {
      url = url.replace('eu-north-1b', 'eu-north-1');
    }
    
    return url;
  }
  
  // Check for default paths in relative URLs
  if (url.includes('/media/default/') || 
      url.includes('/media/profile_pics/404') || 
      url.includes('undefined') ||
      url.includes('null')) {
    return defaultAvatar;
  }
  
  // Add API base URL for relative paths
  return `${API.defaults.baseURL}${url}`;
};

export default API;