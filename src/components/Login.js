import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../designs/login.css';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { FaEnvelopeOpenText, FaCheckCircle, FaExclamationCircle, FaExclamationTriangle, FaUser, FaUserAlt, FaLock, FaEnvelope } from 'react-icons/fa';

const Login = ({ onLogin, onLoginSuccess }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [signUpPassword, setSignUpPassword] = useState('');
    const [showSignUpPassword, setShowSignUpPassword] = useState(false);
    const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
    const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [signUpUsername, setSignUpUsername] = useState('');
    const [signUpFirstName, setSignUpFirstName] = useState('');
    const [signUpLastName, setSignUpLastName] = useState('');
    const [showVerification, setShowVerification] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [pendingUserEmail, setPendingUserEmail] = useState('');
    const [timer, setTimer] = useState(180); // 3 minutes in seconds
    const [resendDisabled, setResendDisabled] = useState(true);
    const [verifMsg, setVerifMsg] = useState('');
    const [showCoachVerification, setShowCoachVerification] = useState(false);
    const [coachVerificationCode, setCoachVerificationCode] = useState('');
    const [coachVerifMsg, setCoachVerifMsg] = useState('');
    const [coachVerifError, setCoachVerifError] = useState('');
    const [pendingCoachEmail, setPendingCoachEmail] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        let interval;
        if (showVerification && timer > 0) {
            interval = setInterval(() => {
                setTimer(t => t - 1);
            }, 1000);
        } else if (timer === 0) {
            setResendDisabled(false);
            setVerifMsg('Verification code expired. Please resend code.');
        }
        return () => clearInterval(interval);
    }, [showVerification, timer]);

    const showSignUp = () => {
        setIsSignUp(true);
    };

    const showLogin = () => {
        setIsSignUp(false);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            // Use the enhanced coach login handler from index.js
            if (window.handleCoachLogin) {
                const result = await window.handleCoachLogin(email, password);
                
                if (result.success) {
                    let userWithAdmin = result.user;
                    if (userWithAdmin && typeof userWithAdmin.isAdmin === 'undefined') {
                        const isAdminLS = localStorage.getItem('isAdmin');
                        userWithAdmin.isAdmin = isAdminLS === 'true';
                    }
                    if (userWithAdmin.userType === 'coach') {
                        userWithAdmin.username = result.user.username;
                        userWithAdmin.userType = 'coach';
                        userWithAdmin._id = result.user._id;
                    }
                    if (onLogin) {
                        onLogin(userWithAdmin);
                    }
                    localStorage.setItem('user', JSON.stringify(userWithAdmin));
                    if (userWithAdmin.userType) {
                        localStorage.setItem('userType', userWithAdmin.userType);
                    }
                    setTimeout(() => {
                        navigate('/');
                    }, 50);
                } else if (result.requiresVerification) {
                    setShowCoachVerification(true);
                    setPendingCoachEmail(result.email);
                    setCoachVerifMsg(result.message);
                    setCoachVerifError('');
                    setCoachVerificationCode('');
                } else {
                    setError(result.error || 'Login failed');
                }
            } else {
                // Fallback to original login method
                const res = await fetch('http://localhost:3001/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: email, password })
                });
                const data = await res.json();

                if (data.success) {
                    let userWithAdmin = data.user;
                    if (userWithAdmin && typeof userWithAdmin.isAdmin === 'undefined') {
                        const isAdminLS = localStorage.getItem('isAdmin');
                        userWithAdmin.isAdmin = isAdminLS === 'true';
                    }
                    if (userWithAdmin.userType === 'coach') {
                        userWithAdmin.username = data.user.username;
                        userWithAdmin.userType = 'coach';
                        userWithAdmin._id = data.user._id;
                    }
                    if (onLogin) {
                        onLogin(userWithAdmin);
                    }
                    localStorage.setItem('user', JSON.stringify(userWithAdmin));
                    if (userWithAdmin.userType) {
                        localStorage.setItem('userType', userWithAdmin.userType);
                    }
                    setTimeout(() => {
                        navigate('/');
                    }, 50);
                } else {
                    if (data.notVerified) {
                        setShowCoachVerification(true);
                        setPendingCoachEmail(data.email);
                        setCoachVerifMsg('');
                        setCoachVerifError('');
                        setCoachVerificationCode('');
                    } else if (data.error && data.error.includes('Email not verified')) {
                        setShowVerification(true);
                        setPendingUserEmail(email);
                        setTimer(180);
                        setError('');
                        await handleResendCode(email);
                    } else {
                        setError(data.error || 'Login failed');
                    }
                }
            }
        } catch (err) {
            setError('Failed to fetch. Make sure the backend is running.' + err.message);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        if (signUpPassword !== signUpConfirmPassword) {
            setError('Passwords do not match');
            return;
        }
        try {
            const res = await fetch('http://localhost:3001/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    username: signUpUsername,
                    firstname: signUpFirstName,
                    lastname: signUpLastName,
                    password: signUpPassword,
                    isAdmin: false // Always false for normal users
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Signup failed');
            setShowVerification(true);
            setPendingUserEmail(email);
            setSignUpUsername('');
            setSignUpFirstName('');
            setSignUpLastName('');
            setEmail('');
            setSignUpPassword('');
            setSignUpConfirmPassword('');
            setError('');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch('http://localhost:3001/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: pendingUserEmail, code: verificationCode })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Verification failed');
            setShowVerification(false);
            setIsSignUp(false);
            setError('Email verified! Please log in.');
            setVerificationCode('');
            setPendingUserEmail('');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleResendCode = async (customEmail) => {
        setError('');
        setVerifMsg('');
        setResendDisabled(true);
        setTimer(180);
        try {
            const res = await fetch('http://localhost:3001/resend-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: customEmail || pendingUserEmail })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to resend code');
            setVerifMsg('Verification code resent! Please check your email.');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleCoachVerifyCode = async (e) => {
        e.preventDefault();
        setCoachVerifError('');
        setCoachVerifMsg('');
        try {
            // Use the verification system from index.js
            if (window.verifyCoachCode) {
                const result = await window.verifyCoachCode(pendingCoachEmail, coachVerificationCode);
                if (result.success) {
                    setCoachVerifMsg('Verification successful! You can now login.');
                    setShowCoachVerification(false);
                    setCoachVerificationCode('');
                    setPendingCoachEmail('');
                    setError('Coach verified! Please log in.');
                } else {
                    setCoachVerifError(result.error || 'Invalid code.');
                }
            } else {
                // Fallback to original backend verification
                const res = await fetch('http://localhost:3001/api/coaches/verify-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: pendingCoachEmail, code: coachVerificationCode })
                });
                const data = await res.json();
                if (data.success) {
                    setCoachVerifMsg('Verification successful! You can now login.');
                    setShowCoachVerification(false);
                    setCoachVerificationCode('');
                    setPendingCoachEmail('');
                    setError('Coach verified! Please log in.');
                } else {
                    setCoachVerifError(data.error || 'Invalid code.');
                }
            }
        } catch (err) {
            setCoachVerifError('Verification failed.');
        }
    };

    return (
        <div style={{ background: '#fff', minHeight: '100vh' }}>
            <section className="hero" style={{
                background: "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/images/cage22.png') center/cover no-repeat"
            }}>
                <h1>{isSignUp ? 'SIGN UP' : 'SIGN IN'}</h1>
                <p>
                    {isSignUp 
                        ? 'Create your SenJitsu account to manage your membership and bookings.'
                        : 'Access your SenJitsu account to manage your membership and bookings.'}
                </p>
            </section>

            <main className="login-main">
                <section className="login-section">
                    <form className="login-form" style={{ display: isSignUp ? 'none' : 'flex' }} onSubmit={handleLogin}>
                        <h2>Sign In</h2>
                        <input type="text" placeholder="Email or Username" required value={email} onChange={e => setEmail(e.target.value)} />
                        <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                style={{ width: '100%', paddingRight: 36, boxSizing: 'border-box' }}
                            />
                            <span
                                onClick={() => setShowPassword(v => !v)}
                                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888', fontSize: 18 }}
                                title={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <FaEyeSlash color="#181818" /> : <FaEye color="#181818" /> }
                            </span>
                        </div>
                        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
                        <button type="submit">SIGN IN</button>
                        <div className="login-links">
                            <Link to="/forgot-password">Forgot password?</Link>
                            <a href="#" onClick={(e) => { e.preventDefault(); showSignUp(); }}>Create an account</a>
                        </div>
                    </form>

                    {showVerification && (
                        <form className="verification-form" onSubmit={handleVerifyCode}>
                            <FaEnvelopeOpenText size={48} color="#1ee43b" style={{ marginBottom: 8 }} />
                            <h2>Email Verification</h2>
                            <input
                                type="text"
                                placeholder="Enter verification code"
                                value={verificationCode}
                                onChange={e => setVerificationCode(e.target.value)}
                                required
                                disabled={timer === 0}
                                style={{ marginBottom: 20 }}
                            />
                            <button type="submit" disabled={timer === 0} style={{ marginBottom: 10 }}>Verify</button>
                            <button type="button" onClick={() => handleResendCode(email)} disabled={resendDisabled} style={{ marginTop: 0, marginBottom: 12 }}>Resend Code</button>
                            <div className="timer" style={{ marginBottom: 10 }}>
                                {timer > 0 ? `Code expires in ${Math.floor(timer/60)}:${('0'+(timer%60)).slice(-2)}` : 'Code expired.'}
                            </div>
                            {verifMsg && (
                                <div className="msg warning" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FaExclamationTriangle color="#e4b81e" size={18} /> {verifMsg}
                                </div>
                            )}
                            <div className="login-links" style={{ marginBottom: 10 }}>
                                <a href="#" onClick={(e) => { e.preventDefault(); setShowVerification(false); setIsSignUp(true); setTimer(180); setVerifMsg(''); }}>Back to Sign Up</a>
                            </div>
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
                    )}

                    <form className="signup-form animated-card" style={{ display: isSignUp && !showVerification ? 'flex' : 'none' }} onSubmit={handleSignup}>
                        <FaUserAlt size={40} color="#1ee43b" style={{ marginBottom: 8 }} />
                        <h2 style={{ marginBottom: 8 }}>Sign Up</h2>
                        <div style={{ width: '100%', position: 'relative', marginBottom: 12 }}>
                            <FaUser style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b' }} />
                            <input type="text" placeholder="Username" required value={signUpUsername} onChange={e => setSignUpUsername(e.target.value)} style={{ paddingLeft: 36 }} />
                        </div>
                        <div style={{ width: '100%', position: 'relative', marginBottom: 12 }}>
                            <FaUser style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b' }} />
                            <input type="text" placeholder="First Name" required value={signUpFirstName} onChange={e => setSignUpFirstName(e.target.value)} style={{ paddingLeft: 36 }} />
                        </div>
                        <div style={{ width: '100%', position: 'relative', marginBottom: 12 }}>
                            <FaUser style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b' }} />
                            <input type="text" placeholder="Last Name" required value={signUpLastName} onChange={e => setSignUpLastName(e.target.value)} style={{ paddingLeft: 36 }} />
                        </div>
                        <div style={{ width: '100%', position: 'relative', marginBottom: 12 }}>
                            <FaEnvelope style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b' }} />
                            <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} style={{ paddingLeft: 36 }} />
                        </div>
                        <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box', marginBottom: 12 }}>
                            <FaLock style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b' }} />
                            <input
                                type={showSignUpPassword ? 'text' : 'password'}
                                placeholder="Password"
                                required
                                value={signUpPassword}
                                onChange={e => setSignUpPassword(e.target.value)}
                                style={{ width: '100%', paddingLeft: 36, paddingRight: 36, boxSizing: 'border-box' }}
                            />
                            <span
                                onClick={() => setShowSignUpPassword(v => !v)}
                                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888', fontSize: 18 }}
                                title={showSignUpPassword ? 'Hide password' : 'Show password'}
                            >
                                {showSignUpPassword ? <FaEyeSlash color="#181818" /> : <FaEye color="#181818" />}
                            </span>
                        </div>
                        <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box', marginBottom: 12 }}>
                            <FaLock style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b' }} />
                            <input
                                type={showSignUpConfirmPassword ? 'text' : 'password'}
                                placeholder="Confirm Password"
                                required
                                value={signUpConfirmPassword}
                                onChange={e => setSignUpConfirmPassword(e.target.value)}
                                style={{ width: '100%', paddingLeft: 36, paddingRight: 36, boxSizing: 'border-box' }}
                            />
                            <span
                                onClick={() => setShowSignUpConfirmPassword(v => !v)}
                                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888', fontSize: 18 }}
                                title={showSignUpConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                                {showSignUpConfirmPassword ? <FaEyeSlash color="#181818" /> : <FaEye color="#181818" />}
                            </span>
                        </div>
                        {error && isSignUp && <div className="msg error" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><FaExclamationCircle color="#e43b1e" size={18} />{error}</div>}
                        <button type="submit" style={{ marginBottom: 10 }}>SIGN UP</button>
                        <div className="login-links">
                            <a href="#" onClick={(e) => { e.preventDefault(); showLogin(); }}>Already have an account? Log in</a>
                        </div>
                    </form>
                </section>
            </main>

            {/* Coach Verification Modal */}
            {showCoachVerification && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-content" style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 400, maxWidth: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: '2px solid #2ecc40' }}>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <FaEnvelopeOpenText size={48} color="#2ecc40" style={{ marginBottom: 12 }} />
                            <h3 style={{ color: '#2ecc40', marginBottom: 8, fontSize: '1.5rem' }}>Coach Account Verification</h3>
                            <p style={{ color: '#666', marginBottom: 16 }}>A 6-digit verification code has been sent to:</p>
                            <p style={{ color: '#2ecc40', fontWeight: 'bold', marginBottom: 20 }}>{pendingCoachEmail}</p>
                        </div>
                        
                        <form onSubmit={handleCoachVerifyCode}>
                            <div style={{ marginBottom: 20 }}>
                                <input
                                    type="text"
                                    value={coachVerificationCode}
                                    onChange={e => setCoachVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    maxLength={6}
                                    style={{ 
                                        fontSize: 24, 
                                        letterSpacing: 8, 
                                        textAlign: 'center', 
                                        width: '100%', 
                                        padding: '12px',
                                        border: '2px solid #ddd',
                                        borderRadius: 8,
                                        fontWeight: 'bold',
                                        color: '#2ecc40'
                                    }}
                                    required
                                />
                            </div>
                            
                            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                                <button 
                                    type="submit" 
                                    style={{ 
                                        flex: 1,
                                        background: '#2ecc40', 
                                        color: '#fff', 
                                        border: 'none', 
                                        borderRadius: 8, 
                                        padding: '12px 24px', 
                                        fontWeight: 'bold', 
                                        fontSize: 16, 
                                        cursor: 'pointer',
                                        transition: 'background 0.3s'
                                    }}
                                    onMouseEnter={e => e.target.style.background = '#27ae60'}
                                    onMouseLeave={e => e.target.style.background = '#2ecc40'}
                                >
                                    Verify Account
                                </button>
                                
                                <button 
                                    type="button"
                                    onClick={async () => {
                                        setCoachVerifMsg('Sending new code...');
                                        setCoachVerifError('');
                                        
                                        if (window.resendCoachVerificationCode) {
                                            const result = await window.resendCoachVerificationCode(pendingCoachEmail, 'Coach');
                                            if (result.success) {
                                                setCoachVerifMsg('New verification code sent to your email!');
                                                setCoachVerifError('');
                                            } else {
                                                setCoachVerifError(result.error || 'Failed to send verification code');
                                                setCoachVerifMsg('');
                                            }
                                        } else {
                                            setCoachVerifError('Resend functionality not available');
                                            setCoachVerifMsg('');
                                        }
                                    }}
                                    style={{ 
                                        background: '#f39c12', 
                                        color: '#fff', 
                                        border: 'none', 
                                        borderRadius: 8, 
                                        padding: '12px 16px', 
                                        fontWeight: 'bold', 
                                        fontSize: 14, 
                                        cursor: 'pointer',
                                        transition: 'background 0.3s'
                                    }}
                                    onMouseEnter={e => e.target.style.background = '#e67e22'}
                                    onMouseLeave={e => e.target.style.background = '#f39c12'}
                                >
                                    Resend
                                </button>
                            </div>
                        </form>
                        
                        {coachVerifError && (
                            <div style={{ 
                                color: '#e74c3c', 
                                background: '#fdf2f2', 
                                padding: '12px', 
                                borderRadius: 6, 
                                border: '1px solid #e74c3c',
                                marginBottom: 12,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}>
                                <FaExclamationCircle />
                                {coachVerifError}
                            </div>
                        )}
                        
                        {coachVerifMsg && (
                            <div style={{ 
                                color: '#27ae60', 
                                background: '#f0f9f0', 
                                padding: '12px', 
                                borderRadius: 6, 
                                border: '1px solid #27ae60',
                                marginBottom: 12,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}>
                                <FaCheckCircle />
                                {coachVerifMsg}
                            </div>
                        )}
                        
                        <div style={{ textAlign: 'center', marginTop: 16 }}>
                            <button 
                                onClick={() => {
                                    setShowCoachVerification(false);
                                    setCoachVerificationCode('');
                                    setCoachVerifMsg('');
                                    setCoachVerifError('');
                                }}
                                style={{ 
                                    background: 'transparent', 
                                    color: '#666', 
                                    border: 'none', 
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    fontSize: 14
                                }}
                            >
                                Cancel and go back to login
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login; 