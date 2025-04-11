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
        window.location.href = '/login';
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
  // For consistent logging
  console.log('Processing avatar URL:', url, 'for user:', username);
  
  // If no URL provided, use ui-avatars with first letter of username
  if (!url || url === 'null' || url === 'undefined') {
    return `https://ui-avatars.com/api/?name=${username ? username[0].toUpperCase() : 'U'}&background=random&color=fff`;
  }
  
  // Check if it's already a full URL
  if (url.startsWith('http')) {
    // Handle known problematic paths that result in 404s
    if (url.includes('/media/default/') || 
        (url.includes('/media/profile_pics/') && url.includes('404')) ||
        url.includes('undefined') ||
        url.includes('null')) {
      return `https://ui-avatars.com/api/?name=${username ? username[0].toUpperCase() : 'U'}&background=random&color=fff`;
    }
    return url;
  }
  
  // Handle relative URLs with problematic paths
  if (url.includes('/media/default/') || 
      url.includes('undefined') ||
      url.includes('null') ||
      (url.includes('/media/profile_pics/') && url.includes('404'))) {
    return `https://ui-avatars.com/api/?name=${username ? username[0].toUpperCase() : 'U'}&background=random&color=fff`;
  }
  
  // For relative URLs, make them absolute with API base URL
  return `${API.defaults.baseURL}${url.startsWith('/') ? url : '/' + url}`;
};

/**
 * Utility function to format image URLs consistently across the application
 * 
 * @param {string|null} url - The image URL to format
 * @returns {string|null} Properly formatted URL or null if URL is missing
 */
export const formatImageUrl = (url) => {
  // For consistent logging
  console.log('Processing image URL:', url);
  
  // If no URL provided, return null
  if (!url || url === 'null' || url === 'undefined') {
    return null;
  }
  
  // Check if it's already a full URL
  if (url.startsWith('http')) {
    return url;
  }
  
  // For relative URLs, make them absolute with API base URL
  return `${API.defaults.baseURL}${url.startsWith('/') ? url : '/' + url}`;
};

export default API;