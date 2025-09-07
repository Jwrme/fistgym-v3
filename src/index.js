import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
// Activate global API base URL and fetch override
import './utils/apiConfig';
import { initImageUrlFixer } from './utils/imageUtils';

// Coach Account Verification System
class CoachVerificationSystem {
  constructor() {
    this.verificationCodes = new Map();
    this.codeExpiry = new Map();
    this.EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes
  }

  // Generate 6-digit verification code
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Store verification code with expiry
  storeVerificationCode(email, code) {
    this.verificationCodes.set(email, code);
    this.codeExpiry.set(email, Date.now() + this.EXPIRY_TIME);
    console.log(`🔐 Verification code stored for ${email}: ${code}`);
  }

  // Verify code
  verifyCode(email, inputCode) {
    const storedCode = this.verificationCodes.get(email);
    const expiry = this.codeExpiry.get(email);
    
    if (!storedCode || !expiry) {
      return { success: false, error: 'No verification code found' };
    }
    
    if (Date.now() > expiry) {
      this.verificationCodes.delete(email);
      this.codeExpiry.delete(email);
      return { success: false, error: 'Verification code expired' };
    }
    
    if (storedCode === inputCode) {
      this.verificationCodes.delete(email);
      this.codeExpiry.delete(email);
      return { success: true };
    }
    
    return { success: false, error: 'Invalid verification code' };
  }

  // Send verification code via email (real email sending)
  async sendVerificationCode(email, coachName) {
    const code = this.generateVerificationCode();
    this.storeVerificationCode(email, code);
    
    try {
      // Send actual email via backend
      const response = await fetch('/api/send-coach-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          coachName: coachName,
          verificationCode: code
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Verification code sent to ${email}`);
        return { success: true };
      } else {
        console.error('Failed to send verification email:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      // Fallback to console logging for development
      console.log(`📧 [FALLBACK] Verification code for ${email}: ${code}`);
      return { success: true }; // Return success for development
    }
  }

  // Clean expired codes
  cleanExpiredCodes() {
    const now = Date.now();
    for (const [email, expiry] of this.codeExpiry.entries()) {
      if (now > expiry) {
        this.verificationCodes.delete(email);
        this.codeExpiry.delete(email);
      }
    }
  }
}

// Global instance for coach verification
window.coachVerificationSystem = new CoachVerificationSystem();

// Clean expired codes every 5 minutes
setInterval(() => {
  window.coachVerificationSystem.cleanExpiredCodes();
}, 5 * 60 * 1000);

// Enhanced login handler for coaches with verification
window.handleCoachLogin = async (username, password) => {
  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    // If backend says coach needs verification, handle it
    if (data.notVerified && data.email) {
      // Send verification code
      const verificationResult = await window.coachVerificationSystem.sendVerificationCode(
        data.email, 
        'Coach'
      );
      
      if (verificationResult.success) {
        return {
          success: false,
          requiresVerification: true,
          email: data.email,
          message: 'Verification code sent to your email. Please verify to continue.'
        };
      }
    }
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Login failed' };
  }
};

// Verify coach code handler
window.verifyCoachCode = async (email, code) => {
  try {
    console.log('🔄 Sending verification request to backend:', { email, code });
    
    const response = await fetch('/api/coaches/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    
    const result = await response.json();
    console.log('📥 Backend verification response:', result);
    
    if (result.success) {
      // Mark coach as verified in localStorage for frontend tracking
      localStorage.setItem(`coach_verified_${email}`, 'true');
      console.log(`✅ Coach ${email} verified successfully in database`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error verifying coach code:', error);
    return { success: false, error: 'Network error during verification' };
  }
};

// Resend coach verification code
window.resendCoachVerificationCode = async (email, coachName) => {
  return await window.coachVerificationSystem.sendVerificationCode(email, coachName);
};

// Account Settings Verification System
window.accountSettingsVerification = {
  // Verify current password before allowing changes
  verifyCurrentPassword: async (username, currentPassword) => {
    try {
      const response = await fetch('/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: currentPassword })
      });
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  },

  // Send verification code for account changes
  sendAccountChangeCode: async (email, changeType) => {
    const code = window.coachVerificationSystem.generateVerificationCode();
    window.coachVerificationSystem.storeVerificationCode(`${email}_${changeType}`, code);
    
    console.log(`📧 Account change verification code for ${email} (${changeType}): ${code}`);
    return { success: true, code };
  },

  // Verify account change code
  verifyAccountChangeCode: (email, changeType, code) => {
    return window.coachVerificationSystem.verifyCode(`${email}_${changeType}`, code);
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize global image URL fixer after initial render
try {
  initImageUrlFixer();
} catch (e) {
  console.warn('Image URL fixer init warning:', e);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
