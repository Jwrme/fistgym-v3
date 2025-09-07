// API Configuration
const config = {
    API_BASE_URL: process.env.NODE_ENV === 'production' 
      ? '' // Use relative URLs in production (same domain)
      : 'http://localhost:3001', // Use localhost in development
    
    // WebSocket URL
    WS_URL: process.env.NODE_ENV === 'production'
      ? `wss://${window.location.host}` // Use current domain with wss in production
      : 'ws://localhost:3001' // Use localhost in development
  };
  
  export default config;
  