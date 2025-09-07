import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { FaEnvelopeOpenText, FaCheckCircle, FaExclamationCircle, FaExclamationTriangle, FaEye, FaEyeSlash } from 'react-icons/fa';

const CoachSettings = ({ user = {}, onUpdate }) => {
  // Separate state for each section
  const [nameForm, setNameForm] = useState({
    firstname: user.firstname || '',
    lastname: user.lastname || '',
  });
  const [usernameForm, setUsernameForm] = useState({
    username: user.username || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  });

  // Modal and verification state (shared)
  const [showModal, setShowModal] = useState(false);
  const [verifCode, setVerifCode] = useState('');
  const [timer, setTimer] = useState(180);
  const [resendDisabled, setResendDisabled] = useState(true);
  const [verifMsg, setVerifMsg] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Track which section is being updated
  const [pendingSection, setPendingSection] = useState(null);
  
  // Password visibility toggles
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setShowModal(false);
    setPendingSection(null);
    setVerifCode('');
    setTimer(180);
    setResendDisabled(true);
    setVerifMsg('');
    setError('');
    setSuccess('');
    setIsVerifying(false);
  }, []);

  useEffect(() => {
    let interval;
    if (showModal && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setResendDisabled(false);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showModal, timer]);

  const handleNameChange = (e) => {
    setNameForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUsernameChange = (e) => {
    setUsernameForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePasswordChange = (e) => {
    setPasswordForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    // Clear any existing errors when user starts typing password
    if (error && error.toLowerCase().includes('current password')) {
      setError('');
    }
  };

  const handleSectionSubmit = async (section) => {
    setError('');
    setSuccess('');
    if (section === 'password') {
      if (!passwordForm.password) {
        setError('Please enter a new password.');
        return;
      }
      if (passwordForm.password !== passwordForm.confirmPassword) {
        setError('Passwords do not match!');
        return;
      }
      if (passwordForm.password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
    }
    setPendingSection(section);
    try {
      const res = await fetch('http://localhost:3001/api/coaches/send-update-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');
      setShowModal(true);
      setTimer(180);
      setResendDisabled(true);
      setVerifMsg('');
      setVerifCode('');
      setError(''); // Clear any existing errors when opening modal
    } catch (err) {
      setError(err.message);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    setError('');
    setVerifMsg(''); // Clear any existing verification messages
    try {
      const res = await fetch('http://localhost:3001/api/coaches/verify-update-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, code: verifCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      
      // Now update the profile in the database, depending on section
      let updateBody = { email: user.email };
      if (pendingSection === 'name') {
        if (nameForm.firstname !== user.firstname) updateBody.firstname = nameForm.firstname;
        if (nameForm.lastname !== user.lastname) updateBody.lastname = nameForm.lastname;
      } else if (pendingSection === 'username') {
        if (usernameForm.username !== user.username) updateBody.username = usernameForm.username;
      } else if (pendingSection === 'password') {
        if (passwordForm.password) {
          updateBody.password = passwordForm.password;
        }
      }

      const updateRes = await fetch(`http://localhost:3001/api/coaches/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody)
      });
      const updateData = await updateRes.json();
      if (!updateRes.ok) throw new Error(updateData.error || 'Profile update failed');
      
      setShowModal(false);
      setSuccess('Profile updated!');
      setIsVerifying(false);
      setPendingSection(null);
      
      // Update parent/global user state
      if (onUpdate) {
        if (pendingSection === 'name') onUpdate({ ...user, ...nameForm });
        if (pendingSection === 'username') onUpdate({ ...user, ...usernameForm });
        if (pendingSection === 'password') onUpdate({ ...user });
      }
      
      // Clear password fields after update
      if (pendingSection === 'password') setPasswordForm({ password: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message);
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setVerifMsg('');
    setResendDisabled(true);
    setTimer(180);
    try {
      const res = await fetch('http://localhost:3001/api/coaches/send-update-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend code');
      setVerifMsg('Verification code resent! Please check your email.');
    } catch (err) {
      setError(err.message);
    }
  };

  // Styles
  const boxStyle = {
    flex: 1,
    padding: '32px',
    background: '#111',
    borderRadius: '12px',
    border: '2px solid #1ee43b',
    minWidth: '280px',
  };

  const sectionTitleStyle = {
    color: '#1ee43b',
    marginBottom: '16px',
    fontSize: '1.5rem',
    fontWeight: 'bold',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    color: '#fff',
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    marginBottom: '16px',
    border: '2px solid #1ee43b',
    borderRadius: '6px',
    background: '#222',
    color: '#fff',
    fontSize: '1rem',
  };

  const buttonStyle = {
    width: '100%',
    padding: '12px',
    background: '#2ecc40',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  };

  return (
    <div style={{ padding: '40px 20px' }}>
      <h2 style={{ color: '#1ee43b', marginBottom: '32px', textAlign: 'center', fontSize: '2rem' }}>Account Settings</h2>
      
      <div className="settings-row" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'stretch', gap: 0 }}>
        {/* Name Section */}
        <div className="settings-box settings-fadein" style={boxStyle}>
          <h3 style={sectionTitleStyle}>Edit Name</h3>
          <label style={labelStyle}>Firstname</label>
          <input style={inputStyle} name="firstname" value={nameForm.firstname} onChange={handleNameChange} required />
          <label style={labelStyle}>Lastname</label>
          <input style={inputStyle} name="lastname" value={nameForm.lastname} onChange={handleNameChange} required />
          <button type="button" style={buttonStyle} onMouseOver={e => e.currentTarget.style.background = '#27ae60'} onMouseOut={e => e.currentTarget.style.background = '#2ecc40'} onClick={() => handleSectionSubmit('name')}>Save Changes</button>
        </div>
        
        <div className="settings-divider" />
        
        {/* Username Section */}
        <div className="settings-box settings-fadein" style={boxStyle}>
          <h3 style={sectionTitleStyle}>Edit Username</h3>
          <label style={labelStyle}>Username</label>
          <input style={inputStyle} name="username" value={usernameForm.username} onChange={handleUsernameChange} required />
          <button type="button" style={buttonStyle} onMouseOver={e => e.currentTarget.style.background = '#27ae60'} onMouseOut={e => e.currentTarget.style.background = '#2ecc40'} onClick={() => handleSectionSubmit('username')}>Save Changes</button>
        </div>
        
        <div className="settings-divider" />
        
        {/* Password Section */}
        <div className="settings-box settings-fadein" style={boxStyle}>
          <h3 style={sectionTitleStyle}>Edit Password</h3>
          <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '16px' }}>
            Enter your new password below. You'll receive an email verification code to confirm the change.
          </p>
          <label style={labelStyle}>New Password</label>
          <div style={{ position: 'relative' }}>
            <input
              style={inputStyle}
              name="password"
              type={showNewPassword ? 'text' : 'password'}
              value={passwordForm.password}
              onChange={handlePasswordChange}
              required
            />
            <span
              onClick={() => setShowNewPassword(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888', fontSize: 18 }}
              title={showNewPassword ? 'Hide password' : 'Show password'}
            >
              {showNewPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
          
          <label style={labelStyle}>Confirm Password</label>
          <div style={{ position: 'relative' }}>
            <input
              style={inputStyle}
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              required
            />
            <span
              onClick={() => setShowConfirmPassword(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888', fontSize: 18 }}
              title={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
          
          <button type="button" style={buttonStyle} onMouseOver={e => e.currentTarget.style.background = '#27ae60'} onMouseOut={e => e.currentTarget.style.background = '#2ecc40'} onClick={() => handleSectionSubmit('password')}>Save Changes</button>
        </div>
      </div>

      {error && (
        <div style={{ color: 'red', textAlign: 'center', marginTop: 16 }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{ color: '#2ecc40', textAlign: 'center', marginTop: 16 }}>
          {success}
        </div>
      )}

      {/* Verification Modal */}
      {showModal && (
        <Modal onClose={() => !isVerifying && setShowModal(false)}>
          <div style={{ padding: '24px', maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '16px', color: '#2ecc40' }}>
              <FaEnvelopeOpenText style={{ marginRight: '8px', fontSize: '24px' }} />
              Email Verification
            </h3>
            <p style={{ marginBottom: '16px' }}>Please enter the verification code sent to your email.</p>
            
            <form onSubmit={handleVerify}>
              <input
                type="text"
                value={verifCode}
                onChange={e => setVerifCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '18px',
                  textAlign: 'center',
                  letterSpacing: '4px',
                  border: '2px solid #2ecc40',
                  borderRadius: '6px'
                }}
                maxLength={6}
                required
              />
              
              <button
                type="submit"
                disabled={isVerifying}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#2ecc40',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: isVerifying ? 'not-allowed' : 'pointer',
                  opacity: isVerifying ? 0.7 : 1
                }}
              >
                {isVerifying ? 'Verifying...' : 'Verify'}
              </button>
            </form>
            
            <div style={{ marginTop: '16px', fontSize: '14px' }}>
              {timer > 0 ? (
                <span>Resend code in {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resendDisabled}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2ecc40',
                    cursor: resendDisabled ? 'not-allowed' : 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Resend Code
                </button>
              )}
            </div>
            
            {verifMsg && (
              <div style={{ marginTop: '16px', color: '#2ecc40' }}>
                <FaCheckCircle style={{ marginRight: '8px' }} />
                {verifMsg}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CoachSettings; 