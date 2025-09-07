import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEnvelopeOpenText, FaCheckCircle, FaExclamationCircle, FaLock, FaEye, FaEyeSlash, FaClock, FaRedo } from 'react-icons/fa';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: email, 2: code, 3: new password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // Timer in seconds
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const navigate = useNavigate();

  // Timer countdown effect
  useEffect(() => {
    let interval = null;
    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setCanResend(true);
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeLeft]);

  // Format time display (mm:ss)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1: Request code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/forgot-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');
      setSuccess('Verification code sent! Please check your email.');
      setTimeLeft(180); // 3 minutes = 180 seconds
      setCanResend(false);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    setError('');
    setSuccess('');
    setResendLoading(true);
    try {
      const res = await fetch('http://localhost:3001/forgot-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend code');
      setSuccess('New verification code sent! Please check your email.');
      setTimeLeft(180); // Reset timer to 3 minutes
      setCanResend(false);
      setCode(''); // Clear previous code input
    } catch (err) {
      setError(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/forgot-password-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      setSuccess('Code verified! You can now set a new password.');
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/forgot-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setSuccess('Password reset successful! You can now log in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <section className="hero" style={{
        background: "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/images/cage22.png') center/cover no-repeat"
      }}>
        <h1>FORGOT PASSWORD</h1>
        <p>Enter your email to recover your account.</p>
      </section>
      <main className="login-main">
        <section className="login-section">
          {step === 1 && (
            <form className="login-form" onSubmit={handleRequestCode}>
              <h2>Forgot Password</h2>
              <input type="email" placeholder="Enter your email" required value={email} onChange={e => setEmail(e.target.value)} />
              {error && <div style={{ color: 'red', marginBottom: 8 }}><FaExclamationCircle /> {error}</div>}
              {success && <div style={{ color: 'green', marginBottom: 8 }}><FaCheckCircle /> {success}</div>}
              <button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send Code'}</button>
            </form>
          )}
          {step === 2 && (
            <form className="login-form" onSubmit={handleVerifyCode}>
              <h2>Enter Verification Code</h2>
              <input type="text" placeholder="Enter code from email" required value={code} onChange={e => setCode(e.target.value)} />
              
              {/* Timer and Resend Section */}
              <div style={{ marginBottom: 12, textAlign: 'center' }}>
                {timeLeft > 0 ? (
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>
                    <FaClock style={{ marginRight: 5 }} />
                    Code expires in: <strong style={{ color: '#1ee43b' }}>{formatTime(timeLeft)}</strong>
                  </div>
                ) : (
                  <div style={{ color: '#ff6b6b', fontSize: 14, marginBottom: 8 }}>
                    <FaExclamationCircle style={{ marginRight: 5 }} />
                    Verification code has expired
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={!canResend || resendLoading}
                  style={{
                    background: canResend ? '#1ee43b' : '#ccc',
                    color: canResend ? 'white' : '#666',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: canResend ? 'pointer' : 'not-allowed',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    gap: '5px'
                  }}
                >
                  <FaRedo />
                  {resendLoading ? 'Sending...' : 'Resend Code'}
                </button>
                
                <div style={{ 
                  fontSize: 11, 
                  color: '#888', 
                  marginTop: 8, 
                  fontStyle: 'italic',
                  textAlign: 'center'
                }}>
                  Please also check spam folder at your email
                </div>
              </div>

              {error && <div style={{ color: 'red', marginBottom: 8 }}><FaExclamationCircle /> {error}</div>}
              {success && <div style={{ color: 'green', marginBottom: 8 }}><FaCheckCircle /> {success}</div>}
              <button type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Verify Code'}</button>
            </form>
          )}
          {step === 3 && (
            <form className="login-form" onSubmit={handleResetPassword}>
              <h2>Set New Password</h2>
              <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box', marginBottom: 12 }}>
                <FaLock style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b' }} />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="New Password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ width: '100%', paddingLeft: 36, paddingRight: 36, boxSizing: 'border-box' }}
                />
                <span
                  onClick={() => setShowNewPassword(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888', fontSize: 18 }}
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <FaEyeSlash color="#181818" /> : <FaEye color="#181818" />}
                </span>
              </div>
              <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box', marginBottom: 12 }}>
                <FaLock style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b' }} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm New Password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', paddingLeft: 36, paddingRight: 36, boxSizing: 'border-box' }}
                />
                <span
                  onClick={() => setShowConfirmPassword(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888', fontSize: 18 }}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <FaEyeSlash color="#181818" /> : <FaEye color="#181818" />}
                </span>
              </div>
              {error && <div style={{ color: 'red', marginBottom: 8 }}><FaExclamationCircle /> {error}</div>}
              {success && <div style={{ color: 'green', marginBottom: 8 }}><FaCheckCircle /> {success}</div>}
              <button type="submit" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
};

export default ForgotPassword; 