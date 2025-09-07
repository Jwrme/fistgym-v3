// Global API Configuration - Support both custom domain and Render subdomain
const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // Check if we're accessing via custom domain
    if (window.location.hostname === 'api.fist-gym.com') {
      return 'https://api.fist-gym.com';
    }
    // Check if we're accessing via main frontend domain
    if (window.location.hostname === 'fist-gym.com') {
      return 'https://fistgym-v3.onrender.com';
    }
    // Fallback to Render subdomain
    return 'https://fistgym-v3.onrender.com';
  }
  return 'http://localhost:3001';
};

const API_BASE_URL = getApiBaseUrl();

// Helper function to build API URLs
export const buildApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// For backward compatibility, export the base URL
export { API_BASE_URL };

// Override fetch to automatically use the correct base URL
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  if (typeof url === 'string') {
    // Replace any hardcoded localhost base
    if (url.includes('http://localhost:3001')) {
      url = url.replace('http://localhost:3001', API_BASE_URL);
    }
    // Replace any hardcoded Render URLs with current domain
    if (url.includes('https://fistgym-v2.onrender.com')) {
      url = url.replace('https://fistgym-v2.onrender.com', API_BASE_URL);
    }
    if (url.includes('https://fistgym-v3.onrender.com')) {
      url = url.replace('https://fistgym-v3.onrender.com', API_BASE_URL);
    }
    if (url.includes('https://api.fist-gym.com')) {
      url = url.replace('https://api.fist-gym.com', API_BASE_URL);
    }
    // If URL starts with known backend routes, prepend the base URL
    const shouldPrepend = (
      url.startsWith('/api') ||
      url.startsWith('/login') ||
      url.startsWith('/verify-password') ||
      url.startsWith('/register') ||
      url.startsWith('/logout')
    );
    if (shouldPrepend) {
      url = `${API_BASE_URL}${url}`;
    }
  }
  return originalFetch.call(this, url, options);
};

export default API_BASE_URL;
