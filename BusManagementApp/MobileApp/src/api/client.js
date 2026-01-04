import axios from 'axios';
import { Platform } from 'react-native';

// Get base URL based on platform
// For Android emulator: use 10.0.2.2 (maps to host's localhost)
// For iOS simulator: use localhost
// For physical devices: you'll need to use your computer's IP address
// 
// To configure for physical devices:
// 1. Find your computer's IP: ipconfig (Windows) or ifconfig (Mac/Linux)
// 2. Update the ANDROID_PHYSICAL_DEVICE_IP constant below
// 3. Or set API_URL environment variable
const getBaseURL = () => {
  // Check for environment variable first
  if (process.env.API_URL) {
    return process.env.API_URL;
  }

  // Platform-specific defaults
  if (Platform.OS === 'android') {
    // For Android emulator: 10.0.2.2 maps to host machine's localhost
    // For physical devices: replace with your computer's IP address
    // 
    // To find your IP address:
    // - Windows: ipconfig (look for IPv4 Address under your active adapter)
    // - Mac/Linux: ifconfig or ip addr
    // 
    // Set this to your computer's IP (without http://) for physical devices
    // Example: '192.168.1.100' or '192.168.18.238'
    const ANDROID_PHYSICAL_DEVICE_IP = '192.168.1.10' // Change to your IP for physical devices, e.g. '192.168.18.238'
    
    if (ANDROID_PHYSICAL_DEVICE_IP) {
      return `http://${ANDROID_PHYSICAL_DEVICE_IP}:5000`;
    }
    // Default to emulator address (10.0.2.2 maps to host's localhost)
    return 'http://10.0.2.2:5000';
  } else if (Platform.OS === 'ios') {
    // iOS simulator can use localhost
    return 'http://localhost:5000';
  }
  
  // Fallback
  return 'http://localhost:5000';
};

const API_BASE_URL = getBaseURL();

// Log the base URL being used (helpful for debugging)
console.log(`[API] Base URL configured: ${API_BASE_URL} (Platform: ${Platform.OS})`);

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for logging
client.interceptors.request.use(
  (config) => {
    const fullUrl = `${config.baseURL}${config.url}`;
    console.log(`[API] ${config.method?.toUpperCase()} ${fullUrl}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
client.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('[API] Response error:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request made but no response received
      console.error('[API] No response received. Status:', error.request.status);
      console.error('[API] Request URL:', error.config?.baseURL + error.config?.url);
      
      const baseURL = error.config?.baseURL || '';
      let troubleshootingTips = [];
      
      if (Platform.OS === 'android') {
        if (baseURL.includes('10.0.2.2')) {
          troubleshootingTips = [
            '1. Make sure the server is running: cd server && npm start',
            '2. Verify server is listening on 0.0.0.0:5000 (not just localhost)',
            '3. Check Android emulator is running and Metro bundler is started',
            '4. Try: adb reverse tcp:5000 tcp:5000 (alternative method)'
          ];
        } else if (baseURL.match(/192\.168\.\d+\.\d+/)) {
          troubleshootingTips = [
            '1. Make sure the server is running on port 5000',
            '2. Verify your computer IP matches the configured IP',
            '3. Check both device and computer are on the same WiFi network',
            '4. Disable firewall or allow port 5000',
            '5. Try ping from device to verify network connectivity',
            `6. Current IP in config: ${baseURL}`
          ];
        }
      } else {
        troubleshootingTips = [
          '1. The server is running on port 5000',
          '2. For physical devices, use your computer\'s IP address instead of localhost',
          '3. Your device and computer are on the same network'
        ];
      }
      
      if (troubleshootingTips.length > 0) {
        console.error('[API] Troubleshooting:');
        troubleshootingTips.forEach(tip => console.error(`  ${tip}`));
      }
      
      // Provide more helpful error message
      if (error.request.status === 0) {
        const deviceType = Platform.OS === 'android' && baseURL.includes('10.0.2.2') 
          ? 'emulator' 
          : Platform.OS === 'android' 
            ? 'physical device' 
            : 'device';
        error.message = `Cannot connect to server at ${baseURL}. Make sure the server is running and accessible from your ${deviceType}.`;
      } else {
        error.message = 'Network error. Please check your connection.';
      }
    } else {
      // Error setting up request
      console.error('[API] Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

export function setAuthToken(token) {
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common.Authorization;
  }
}

// Test server connectivity
export async function testConnection() {
  try {
    const response = await client.get('/');
    console.log('[API] Connection test successful:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('[API] Connection test failed:', error.message);
    return { success: false, error: error.message };
  }
}

export default client;

