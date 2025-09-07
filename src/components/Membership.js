import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../designs/membership.css';
import { DateRange, Calendar } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { enUS } from 'date-fns/locale';
import { addMonths, startOfMonth, endOfMonth, isWithinInterval, isSameMonth, isSameDay } from 'date-fns';

const getUser = () => {
  const u = JSON.parse(localStorage.getItem('user'));
  return u || {};
};

const Membership = () => {
  const user = getUser();
  const [proof, setProof] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [existingApp, setExistingApp] = useState(null);
  const [dismissedRejected, setDismissedRejected] = useState(false);
  // Image Modal State (for viewing QR codes in full size)
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [paymentSettings, setPaymentSettings] = useState({ 
    classRates: {
      'Boxing': 500,
      'Muay Thai': 500,
      'Kali': 450,
      'Jiu Jitsu Adults': 600,
      'Jiu Jitsu Kids': 400,
      'MMA': 450,
      'Judo': 450,
      'Wrestling': 400
    },
    classQrCodes: {
      'Boxing': '/images/gcashqr.png',
      'Muay Thai': '/images/gcashqr.png',
      'Kali': '/images/gcashqr.png',
      'Jiu Jitsu Adults': '/images/gcashqr.png',
      'Jiu Jitsu Kids': '/images/gcashqr.png',
      'MMA': '/images/gcashqr.png',
      'Judo': '/images/gcashqr.png',
      'Wrestling': '/images/gcashqr.png'
    },
    membershipRate: 1000,
    membershipQrCode: '/images/gcashqr.png' 
  });
  const fileInputRef = useRef();

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage('');
  };

  // Fetch payment settings
  const fetchPaymentSettings = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/payment-settings');
      const data = await response.json();
      setPaymentSettings(data);
    } catch (error) {
      console.error('Error fetching payment settings:', error);
    }
  };

  useEffect(() => {
    if (user && (user._id || user.username) && !dismissedRejected) {
      fetch(`http://localhost:3001/api/membership-application/status?userId=${user._id || user.username}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.application) {
            setExistingApp(data.application);
          } else {
            setExistingApp(null);
          }
        });
    }
    
    // Fetch payment settings
    fetchPaymentSettings();
  }, [user?._id, dismissedRejected]);

  // Listen for payment settings updates
  useEffect(() => {
    const handlePaymentSettingsUpdated = () => {
      fetchPaymentSettings();
    };
    window.addEventListener('paymentSettingsUpdated', handlePaymentSettingsUpdated);
    return () => {
      window.removeEventListener('paymentSettingsUpdated', handlePaymentSettingsUpdated);
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Please select a JPG or PNG image.');
    const reader = new FileReader();
    reader.onloadend = () => {
      setProof(reader.result); // base64 string
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!proof) return alert('Please upload your GCash payment proof.');

    const payload = {
      name: user.firstname + ' ' + user.lastname,
      email: user.email,
      userId: user._id || user.username || '',
      proof, // base64 string
    };

    try {
      const res = await fetch('http://localhost:3001/api/membership-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setShowModal(true);
      } else {
        alert(data.message || 'Submission failed.');
      }
    } catch (err) {
      alert('Error submitting application.');
    }
  };

  if (!user || !user.firstname || !user.email) {
    return <div style={{ padding: 40 }}>You must be logged in to avail membership.</div>;
  }

  // If user already has a membership application, show status instead of form
  if (existingApp) {
    // Check if rejected and archived
    if (existingApp.status && existingApp.status.toLowerCase() === 'rejected' && existingApp.archived && !dismissedRejected) {
      return (
        <div style={{ padding: '60px 0 0 0', minHeight: '100vh', background: '#181818', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '32px 36px', boxShadow: '0 6px 32px rgba(231,76,60,0.13)', minWidth: 340, maxWidth: 400, textAlign: 'center', margin: '0 12px' }}>
            <div style={{ fontSize: 22, marginBottom: 18, color: '#e74c3c', fontWeight: 700, letterSpacing: 0.5 }}>
              Membership Application Rejected
            </div>
            <div style={{ fontSize: 17, marginBottom: 18, color: '#181818', fontWeight: 500, letterSpacing: 0.5 }}>
              You have failed to provide a valid proof of payment.
            </div>
            <button
              style={{ background: '#e74c3c', color: '#fff', fontWeight: 'bold', fontSize: 16, padding: '10px 32px', border: 'none', borderRadius: 6, cursor: 'pointer', letterSpacing: 1 }}
              onClick={() => { setDismissedRejected(true); setExistingApp(null); }}
            >I understand</button>
          </div>
        </div>
      );
    }
    // Check if approved and not expired
    if (
      existingApp.status &&
      existingApp.status.toLowerCase() === 'approved' &&
      existingApp.expirationDate &&
      new Date(existingApp.expirationDate) > new Date()
    ) {
      return (
        <div style={{
          width: 1200,
          maxWidth: '100%',
          margin: '0 auto',
          marginTop: 60,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 32,
        }}>
          {/* Membership Info (left side) */}
          <div style={{
            minWidth: 260,
            maxWidth: 320,
            color: '#fff',
            background: 'transparent',
            boxShadow: 'none',
            textAlign: 'left',
            marginTop: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            gap: 8,
            paddingTop: 60,
          }}>
            <div style={{ fontWeight: 'bold', fontSize: 22, marginBottom: 2 }}>
              Name: <span style={{ fontWeight: 500 }}>{existingApp.name}</span>
            </div>
            <div style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 6 }}>
              Email: <span style={{ fontWeight: 500 }}>{existingApp.email}</span>
            </div>
            <div style={{ color: '#2ecc40', fontWeight: 700, fontSize: 18, marginBottom: 0 }}>Membership Period:</div>
          </div>
          {/* Calendars (right side) */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 32,
            width: 'auto',
          }}>
            <CalendarMembershipView startDate={existingApp.startDate} endDate={existingApp.expirationDate} />
          </div>
        </div>
      );
    }
    // If approved but expired, or not approved, show the application form
    // If pending or rejected, show status as before
    if (existingApp.status && existingApp.status.toLowerCase() === 'approved' && existingApp.expirationDate && new Date(existingApp.expirationDate) <= new Date()) {
      // Membership expired, allow re-application (show form below)
    } else {
      return (
        <div style={{ padding: '60px 0 0 0', minHeight: '100vh', background: '#181818' }}>
          <h2 style={{ color: '#2ecc40', fontWeight: 'bold', fontSize: 32, letterSpacing: 1, textAlign: 'center', marginBottom: 32, fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif', textShadow: '1px 2px 8px #000' }}>
            Membership Application Status
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: 400 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '32px 36px', boxShadow: '0 6px 32px rgba(46,204,64,0.13)', minWidth: 340, maxWidth: 400, textAlign: 'center', margin: '0 12px' }}>
              <div style={{ fontSize: 18, marginBottom: 18, color: '#181818', fontWeight: 600, letterSpacing: 0.5 }}>
                <b>Name:</b> <span style={{ fontWeight: 500 }}>{existingApp.name}</span><br />
                <b>Email:</b> <span style={{ fontWeight: 500 }}>{existingApp.email}</span><br />
                <b>Date Submitted:</b> <span style={{ fontWeight: 500 }}>{new Date(existingApp.date).toLocaleString()}</span>
              </div>
              <div style={{ fontWeight: 700, color: '#2ecc40', fontSize: 17, marginBottom: 10, letterSpacing: 0.5 }}>Proof of Payment:</div>
              {existingApp.proof && (
                <img src={existingApp.proof} alt="Proof" style={{ maxWidth: 220, maxHeight: 220, borderRadius: 14, border: '2px solid #2ecc40', margin: '0 auto 10px auto', boxShadow: '0 2px 12px rgba(46,204,64,0.10)', objectFit: 'cover', background: '#f8f8f8' }} />
              )}
            </div>
          </div>
          <div style={{ color: '#bbb', marginTop: 32, textAlign: 'center', fontSize: 18, fontWeight: 500, letterSpacing: 0.5 }}>
            Your application is under review. We will notify you once approved.
          </div>
        </div>
      );
    }
  }

    return (
        <>
      {/* Success Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.35)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 36, minWidth: 320, textAlign: 'center', boxShadow: '0 4px 32px rgba(46,204,64,0.13)' }}>
            <h2 style={{ color: '#2ecc40', marginBottom: 12 }}>Thank you!</h2>
            <p style={{ fontSize: 18, marginBottom: 18 }}>Your membership application is under review.<br />We will notify you once approved.</p>
            <button onClick={async () => {
              setShowModal(false);
              // Fetch latest application status and update UI
              if (user && (user._id || user.username)) {
                const res = await fetch(`http://localhost:3001/api/membership-application/status?userId=${user._id || user.username}`);
                const data = await res.json();
                if (data.success && data.application) {
                  setExistingApp(data.application);
                }
              }
            }} style={{ background: '#2ecc40', color: '#fff', fontWeight: 'bold', fontSize: 16, padding: '10px 32px', border: 'none', borderRadius: 6, cursor: 'pointer', letterSpacing: 1 }}>OK</button>
          </div>
        </div>
      )}
            <section className="hero" style={{
                background: "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/images/cage22.png') center/cover no-repeat"
            }}>
                <h1>MEMBERSHIP</h1>
                <p>Be a Member & Unleash Your Potential! Join Our MMA Gym Today!</p>
            </section>

            <main className="membership-main" style={{
                background: '#fff',
                color: '#181818',
                borderRadius: 0,
                paddingBottom: 40,
                marginTop: 0,
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'flex-start',
                gap: 32,
                flexWrap: 'wrap',
                width: '100%'
            }}>
                <aside className="contact-info" style={{
                    background: '#f8fff8',
                    borderRadius: 16,
                    padding: '32px 28px',
                    boxShadow: '0 4px 24px rgba(46,204,64,0.07)',
                    minWidth: 340,
                    maxWidth: 400,
                    margin: '0 12px',
                    marginTop: 16,
                    width: 400,
                    flex: '0 1 400px'
                }}>
                    <div style={{ fontSize: 26, color: '#2ecc40', fontWeight: 'bold', marginBottom: 6, letterSpacing: 1, textAlign: 'left' }}>SenJitsu Membership Perks</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#222', fontSize: 16, textAlign: 'left' }}>
                        <li style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
                            <span style={{ color: '#27ae60', fontSize: 22, marginTop: 2 }}>✅</span>
                            <div><span style={{ fontWeight: 700, color: '#219150' }}>₱100 OFF</span> <span style={{ color: '#222', fontWeight: 400 }}>— on every class booking</span></div>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 0 }}>
                            <span style={{ color: '#27ae60', fontSize: 22, marginTop: 2 }}>✅</span>
                            <div><span style={{ fontWeight: 700, color: '#219150' }}>Access to exclusive package deals</span> <span style={{ color: '#222', fontWeight: 400 }}>for sessions, classes, or bulk booking</span></div>
                        </li>
                    </ul>
                    <div style={{ marginTop: 22, color: '#888', fontSize: 14, fontStyle: 'italic', textAlign: 'left' }}>
                      Unlock your full potential — join now and experience the perks of being a SenJitsu member!
                    </div>
                </aside>
                <section className="form-section" style={{
                    background: '#fff',
                    borderRadius: 16,
                    boxShadow: '0 4px 24px rgba(46,204,64,0.07)',
                    padding: '36px 28px 32px 28px',
                    maxWidth: 600,
                    margin: '0 auto',
                    marginTop: 0,
                    width: 600,
                    flex: '0 1 600px',
                    display: 'flex',
                    flexDirection: 'row',
                    gap: 24,
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ flex: '0 1 220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', width: 220 }}>
                        <h3 style={{ color: '#2ecc40', marginBottom: 8, fontSize: 18, fontWeight: 700, textAlign: 'center' }}>Step 1: Pay via GCash</h3>
                        <img 
                            src={paymentSettings.membershipQrCode} 
                            alt="GCash QR" 
                            style={{ 
                                width: 200, 
                                margin: '0 auto', 
                                display: 'block', 
                                borderRadius: 10, 
                                boxShadow: '0 2px 12px rgba(0,0,0,0.10)', 
                                cursor: 'pointer',
                                transition: 'transform 0.2s'
                            }} 
                            onClick={() => handleImageClick(paymentSettings.membershipQrCode)}
                            title="Click to view full size"
                        />
                        <div style={{ marginTop: 10, fontWeight: 600, color: '#222', fontSize: 15, textAlign: 'center' }}>Amount: <span style={{ color: '#2ecc40' }}>₱{paymentSettings.membershipRate.toFixed(2)}</span></div>
                        <div style={{ fontSize: 14, color: '#222', marginTop: 2, textAlign: 'center' }}>Recipient: <b>SENJITSU</b></div>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 2, textAlign: 'center' }}>Scan the QR code using your GCash app.</div>
                    </div>
                    <form onSubmit={handleSubmit} style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                        <div style={{ marginBottom: 0, background: '#f8fff8', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(46,204,64,0.07)' }}>
                            <h3 style={{ color: '#2ecc40', marginBottom: 8, fontSize: 18, fontWeight: 700 }}>Step 2: Upload Proof of Payment</h3>
                            <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} style={{ marginBottom: 8, width: '100%', padding: 6, borderRadius: 6, border: '1px solid #ccc', background: '#fff' }} />
                            {preview && (
                                <div style={{ marginTop: 8, textAlign: 'center' }}>
                                    <img src={preview} alt="Preview" style={{ maxWidth: 160, borderRadius: 8, border: '1px solid #eee', boxShadow: '0 2px 8px rgba(46,204,64,0.07)' }} />
                                </div>
                            )}
                        </div>
                        <div style={{ marginBottom: 0, background: '#f8fff8', borderRadius: 12, padding: 18, boxShadow: '0 2px 12px rgba(46,204,64,0.07)' }}>
                            <h3 style={{ color: '#2ecc40', marginBottom: 8, fontSize: 18, fontWeight: 700 }}>Your Details</h3>
                            <input type="text" value={user.firstname + ' ' + user.lastname} readOnly style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc', background: '#fff' }} />
                            <input type="email" value={user.email} readOnly style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc', background: '#fff' }} />
                        </div>
                        <button type="submit" style={{ background: '#2ecc40', color: '#fff', fontWeight: 'bold', fontSize: 16, padding: '14px 0', border: 'none', borderRadius: 6, cursor: 'pointer', letterSpacing: 1, width: '100%', boxShadow: '0 2px 8px rgba(46,204,64,0.07)' }}>Submit Membership Application</button>
                    </form>
                </section>
            </main>

            {/* Image Modal for QR codes */}
            {showImageModal && (
                <div 
                    style={{
                        position: 'fixed', 
                        top: 0, 
                        left: 0, 
                        width: '100vw', 
                        height: '100vh', 
                        background: 'rgba(0,0,0,0.7)', 
                        zIndex: 9999, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center'
                    }} 
                    onClick={closeImageModal}
                >
                    <div 
                        style={{ 
                            position: 'relative', 
                            background: 'none', 
                            padding: 24, 
                            borderRadius: 16, 
                            boxShadow: '0 4px 32px rgba(0,0,0,0.25)', 
                            backgroundColor: '#fff' 
                        }} 
                        onClick={e => e.stopPropagation()}
                    >
                        <img 
                            src={selectedImage} 
                            alt="QR Code" 
                            style={{ 
                                maxWidth: 540, 
                                maxHeight: 540, 
                                borderRadius: 12, 
                                display: 'block', 
                                margin: '0 auto' 
                            }} 
                        />
                        <button 
                            onClick={closeImageModal} 
                            style={{ 
                                position: 'absolute', 
                                top: 10, 
                                right: 10, 
                                background: '#fff', 
                                color: '#181818', 
                                border: 'none', 
                                borderRadius: '50%', 
                                width: 32, 
                                height: 32, 
                                fontSize: 20, 
                                fontWeight: 'bold', 
                                cursor: 'pointer', 
                                boxShadow: '0 2px 8px rgba(0,0,0,0.18)' 
                            }}
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

function CalendarMembershipView({ startDate, endDate }) {
  console.log('CalendarMembershipView:', { startDate, endDate });
  if (!startDate || !endDate) return <div style={{ color: 'red' }}>Membership period not set.</div>;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end)) return <div style={{ color: 'red' }}>Invalid membership dates.</div>;

  // Get start and end months
  const startMonth = startOfMonth(start);
  const endMonth = startOfMonth(end);

  // Helper to highlight only the membership days in the given month
  function getHighlightedRange(monthDate) {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    // Clamp the range to the membership period
    const rangeStart = start > monthStart ? start : monthStart;
    const rangeEnd = end < monthEnd ? end : monthEnd;
    return {
      startDate: rangeStart,
      endDate: rangeEnd,
      key: 'selection',
      color: '#2ecc40',
    };
  }

  return (
    <div style={{
      width: 950,
      maxWidth: '100%',
      margin: '0 auto',
      marginTop: 32,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: 32,
          width: '100%',
          marginTop: 32,
        }}
      >
        {/* Start Month Card */}
        <div style={{
          background: '#181f1a',
          border: '2px solid #2ecc40',
          borderRadius: 16,
          boxShadow: '0 2px 16px rgba(46,204,64,0.10)',
          padding: '28px 18px 18px 18px',
          flex: 1,
          minWidth: 340,
          maxWidth: 400,
          margin: '0 8px',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ fontWeight: 700, color: '#2ecc40', fontSize: 20, marginBottom: 8 }}>Start Month</div>
          <div style={{ fontWeight: 600, color: '#fff', fontSize: 16, marginBottom: 12 }}>{start.toLocaleString('default', { month: 'long' })} {start.getFullYear()}</div>
          <Calendar
            date={startMonth}
            locale={enUS}
            months={1}
            showMonthAndYearPickers={false}
            showNavigation={false}
            color={'#2ecc40'}
            ranges={[getHighlightedRange(startMonth)]}
            disabledDates={[]}
            displayMode="dateRange"
            onChange={() => {}}
          />
        </div>
        {/* End Month Card */}
        <div style={{
          background: '#181f1a',
          border: '2px solid #2ecc40',
          borderRadius: 16,
          boxShadow: '0 2px 16px rgba(46,204,64,0.10)',
          padding: '28px 18px 18px 18px',
          flex: 1,
          minWidth: 340,
          maxWidth: 400,
          margin: '0 8px',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ fontWeight: 700, color: '#2ecc40', fontSize: 20, marginBottom: 8 }}>End Month</div>
          <div style={{ fontWeight: 600, color: '#fff', fontSize: 16, marginBottom: 12 }}>{end.toLocaleString('default', { month: 'long' })} {end.getFullYear()}</div>
          <Calendar
            date={endMonth}
            locale={enUS}
            months={1}
            showMonthAndYearPickers={false}
            showNavigation={false}
            color={'#2ecc40'}
            ranges={[getHighlightedRange(endMonth)]}
            disabledDates={[]}
            displayMode="dateRange"
            onChange={() => {}}
          />
        </div>
      </div>
    </div>
  );
}

export default Membership; 