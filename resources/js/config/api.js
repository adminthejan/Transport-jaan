/**
 * API Configuration
 * Base URL for all API requests
 */
// Always end with a single slash: callers build URLs as `${API_BASE_URL}vendors/...`, which breaks
// ("http://host:8000vendors/...") when the env value has no trailing slash.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/').replace(/\/*$/, '/');

/**
 * Helper function to construct full API URL
 * @param {string} endpoint - The API endpoint (e.g., '/vendors/warehouse/api/units')
 * @returns {string} - The full API URL
 */
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}${cleanEndpoint}`;
};
