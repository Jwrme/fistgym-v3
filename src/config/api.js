// API Configuration - Support both custom domain and Render subdomain
const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // Check if we're accessing via custom domain
    if (typeof window !== 'undefined' && window.location.hostname === 'api.fist-gym.com') {
      return 'https://api.fist-gym.com';
    }
    // Check if we're accessing via main frontend domain
    if (typeof window !== 'undefined' && window.location.hostname === 'fist-gym.com') {
      return 'https://fistgym-v2.onrender.com';
    }
    // Fallback to Render subdomain
    return 'https://fistgym-v2.onrender.com';
  }
  return 'http://localhost:3001';
};

const API_BASE_URL = getApiBaseUrl();

export { API_BASE_URL };


