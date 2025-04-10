import API from '../api/axios';

/**
 * Formats image URLs by ensuring they have the correct base URL
 * and fixes any incorrect S3 region formats (eu-north-1b → eu-north-1)
 * 
 * @function formatImageUrl
 * @param {string|null} url - The image URL to format
 * @returns {string|null} The formatted URL or null if no URL provided
 */
export const formatImageUrl = (url) => {
  if (!url) return null;
  
  // Handle already fully-qualified URLs
  if (url.startsWith('http')) {
    // Fix incorrect region format in existing URLs
    if (url.includes('eu-north-1b')) {
      return url.replace('eu-north-1b', 'eu-north-1');
    }
    return url;
  }
  
  // Handle relative URLs by adding the API base URL
  return `${API.defaults.baseURL}${url}`;
};

/**
 * Converts a string to a consistent color based on its content
 * Useful for generating avatar background colors
 * 
 * @function stringToColor
 * @param {string} string - Input string to convert to color
 * @returns {string} Hex color code
 */
export const stringToColor = (string) => {
  if (!string) return '#757575';
  
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  
  return color;
};

/**
 * Formats a file size in bytes to a human-readable string
 * 
 * @function formatFileSize
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size (e.g., "2.5 MB")
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Determines if an attachment URL is an image based on extension or content type
 * 
 * @function isImageFile
 * @param {string} url - The URL to check
 * @returns {boolean} True if URL appears to be an image
 */
export const isImageFile = (url) => {
  if (!url) return false;
  
  // Check for common image extensions
  const imageExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
    '.tiff', '.tif', '.avif', '.heic', '.heif', '.jfif', '.pjpeg', '.pjp'
  ];
  
  const urlLower = url.toLowerCase();
  return imageExtensions.some(ext => urlLower.endsWith(ext) || urlLower.includes(`${ext}?`)) || 
         ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].some(type => urlLower.includes(type));
}; 