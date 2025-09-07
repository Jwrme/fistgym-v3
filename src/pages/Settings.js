import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { FaEnvelopeOpenText, FaCheckCircle, FaExclamationCircle, FaExclamationTriangle, FaEye, FaEyeSlash } from 'react-icons/fa';

const Settings = ({ user = {}, onUpdate }) => {
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
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0) {
      setResendDisabled(false);
      setVerifMsg('Verification code expired. Please resend code.');
    }
    return () => clearInterval(interval);
  }, [showModal, timer]);

  // Handlers for each section
  const handleNameChange = (e) => {
    setNameForm({ ...nameForm, [e.target.name]: e.target.value });
  };
  const handleUsernameChange = (e) => {
    setUsernameForm({ ...usernameForm, [e.target.name]: e.target.value });
  };
  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
    // Clear any existing errors when user starts typing password
    if (error && error.toLowerCase().includes('current password')) {
      setError('');
    }
  };

  // Shared verification code flow
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
      const res = await fetch(`http://localhost:3001/${user.userType === 'coach' ? 'api/coaches/' : ''}send-update-code`, {
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
      const res = await fetch(`http://localhost:3001/${user.userType === 'coach' ? 'api/coaches/' : ''}verify-update-code`, {
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

      // Use the appropriate endpoint based on user type
      const updateEndpoint = user.userType === 'coach' 
        ? `http://localhost:3001/api/coaches/${user._id}`
        : 'http://localhost:3001/update-profile';

      console.log('Sending update request:', { updateEndpoint, updateBody, pendingSection });
      
      const updateRes = await fetch(updateEndpoint, {
        method: user.userType === 'coach' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody)
      });
      const updateData = await updateRes.json();
      
      console.log('Update response:', { status: updateRes.status, data: updateData });
      
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
      const res = await fetch(`http://localhost:3001/${user.userType === 'coach' ? 'api/coaches/' : ''}send-update-code`, {
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

  return (
    <div style={{ maxWidth: 1300, margin: '80px auto 60px auto', background: 'none', padding: 0, minHeight: '80vh' }}>
      <style>{`
        .settings-fadein { animation: fadeInCard 0.8s cubic-bezier(.39,.575,.565,1) both; }
        @keyframes fadeInCard {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .settings-box:hover {
          box-shadow: 0 10px 40px #2ecc40aa, 0 2px 16px #181818;
          transform: translateY(-6px) scale(1.025);
          border-color: #1ee43b;
        }
        .settings-divider {
          width: 6px;
          height: 380px;
          background: linear-gradient(180deg, #2ecc40 0%, #27ae60 50%, #2ecc40 100%);
          border-radius: 8px;
          align-self: stretch;
          margin: 0 18px;
          box-shadow: 0 0 24px #2ecc40cc, 0 0 8px #27ae60cc;
          animation: glowDivider 2.5s infinite alternate;
        }
        @keyframes glowDivider {
          0% { box-shadow: 0 0 12px #2ecc40cc, 0 0 4px #27ae60cc; }
          100% { box-shadow: 0 0 32px #2ecc40cc, 0 0 16px #27ae60cc; }
        }
        @media (max-width: 1200px) {
          .settings-row { flex-direction: column !important; align-items: center !important; }
          .settings-divider { display: none !important; }
        }
      `}</style>
      <div style={{ height: 30 }} />
      <h2 style={{ color: '#2ecc40', textAlign: 'center', marginBottom: 36, fontWeight: 'bold', letterSpacing: 2, fontSize: 32 }}>Account Settings</h2>
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
      {/* Success/Error Message */}
      {error && <div style={{ color: '#e43b1e', marginTop: 8, marginBottom: 8, fontWeight: 'bold', textAlign: 'center' }}>{error}</div>}
      {success && <div style={{ color: '#2ecc40', marginTop: 8, marginBottom: 8, fontWeight: 'bold', textAlign: 'center' }}>{success}</div>}
      {/* Verification Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)}>
        <form className="verification-form" onSubmit={handleVerify} style={{ background: 'none', boxShadow: 'none', padding: 0, margin: 0 }}>
          <FaEnvelopeOpenText size={48} color="#1ee43b" style={{ marginBottom: 8 }} />
          <h2 style={{ color: '#2ecc40' }}>Email Verification</h2>
          <input
            type="text"
            placeholder="Enter verification code"
            value={verifCode}
            onChange={e => setVerifCode(e.target.value)}
            required
            disabled={timer === 0}
            style={{ marginBottom: 20 }}
          />
          <button type="submit" disabled={timer === 0 || isVerifying} style={{ marginBottom: 10 }}>
            {isVerifying ? 'Verifying...' : 'Verify'}
          </button>
          <button type="button" onClick={handleResend} disabled={resendDisabled} style={{ marginTop: 0, marginBottom: 12 }}>Resend Code</button>
          <div className="timer" style={{ marginBottom: 10, color: '#fff' }}>
            {timer > 0 ? `Code expires in ${Math.floor(timer/60)}:${('0'+(timer%60)).slice(-2)}` : 'Code expired.'}
          </div>
          {verifMsg && (
            <div className="msg warning" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaExclamationTriangle color="#e4b81e" size={18} /> {verifMsg}
            </div>
          )}
          {error && (
            <div className={`msg ${error.includes('verified') ? 'success' : 'error'}`} style={{ display: 'flex', alignItems: 'center', gap: 8, animation: error.includes('verified') ? 'popSuccess 0.5s' : 'none' }}>
              {error.includes('verified') ? (
                <FaCheckCircle color="#1ee43b" size={18} />
              ) : (
                <FaExclamationCircle color="#e43b1e" size={18} />
              )}
              {error}
            </div>
          )}
        </form>
      </Modal>
      <div style={{ height: 60 }} />
    </div>
  );
};

const containerStyle = {
  display: 'flex',
  flexDirection: 'row',
  gap: 32,
  justifyContent: 'center',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
};
const boxStyle = {
  background: 'linear-gradient(135deg, #232d23 60%, #181818 100%)',
  borderRadius: 18,
  boxShadow: '0 6px 32px rgba(46,204,64,0.10), 0 1.5px 8px rgba(0,0,0,0.13)',
  padding: 32,
  marginBottom: 24,
  minWidth: 320,
  maxWidth: 370,
  flex: '1 1 340px',
  border: '1.5px solid #2ecc40',
  transition: 'box-shadow 0.2s, transform 0.2s',
};
const dividerStyle = {
  width: 2,
  minHeight: 320,
  background: 'linear-gradient(180deg, #2ecc40 0%, #181818 100%)',
  borderRadius: 2,
  alignSelf: 'center',
  margin: '0 8px',
  boxShadow: '0 0 8px #2ecc40aa',
  display: 'none',
};
const sectionTitleStyle = { color: '#2ecc40', marginBottom: 16, textAlign: 'center', letterSpacing: 1, fontWeight: 'bold', fontSize: 22 };
const labelStyle = { color: '#fff', display: 'block', marginTop: 12, marginBottom: 4, fontWeight: 'bold', letterSpacing: 1, fontSize: 16 };
const inputStyle = { width: '100%', padding: 10, borderRadius: 6, border: '1.5px solid #444', marginBottom: 12, background: '#181818', color: '#fff', fontSize: 16, transition: 'border 0.2s' };
const buttonStyle = { background: '#2ecc40', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 8, marginTop: 18, cursor: 'pointer', fontWeight: 'bold', width: '100%', letterSpacing: 1, fontSize: 17, boxShadow: '0 2px 8px rgba(46,204,64,0.10)', transition: 'background 0.2s' };

export default Settings; 