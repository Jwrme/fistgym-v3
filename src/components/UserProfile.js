import React, { useRef, useState, useEffect } from 'react';

const getUser = () => {
  const u = JSON.parse(localStorage.getItem('user'));
  return u || {};
};

const GREEN = '#2ecc40';

// Helper to render belt colors (copied from CoachProfile)
function renderBelt(belt) {
    if (!belt) return '';
    const b = belt.toLowerCase();
    if (b === 'black') {
        return (
            <span className="belt">
                <span className="black" style={{ width: 22, height: 12, display: 'inline-block', borderRadius: 2, background: '#000' }}></span>
                <span className="red" style={{ width: 22, height: 12, display: 'inline-block', borderRadius: 2, background: '#e74c3c' }}></span>
                <span className="black" style={{ width: 22, height: 12, display: 'inline-block', borderRadius: 2, background: '#000' }}></span>
            </span>
        );
    }
    if (b === 'blue') {
        return (
            <span className="belt">
                <span style={{ width: 66, height: 12, background: '#3498db', display: 'inline-block', borderRadius: 2 }}></span>
            </span>
        );
    }
    if (b === 'purple') {
        return (
            <span className="belt">
                <span style={{ width: 66, height: 12, background: '#8e44ad', display: 'inline-block', borderRadius: 2 }}></span>
            </span>
        );
    }
    if (b === 'brown') {
        return (
            <span className="belt">
                <span style={{ width: 66, height: 12, background: '#a0522d', display: 'inline-block', borderRadius: 2 }}></span>
            </span>
        );
    }
    // Default: just show text
    return <span>{belt}</span>;
}

const socialIcons = (user) => (
  <span style={{ marginLeft: 12, display: 'flex', gap: 8 }}>
    {user.facebook && (
      <a href={user.facebook} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', fontSize: 20, transition: 'color 0.2s' }} className="profile-social profile-facebook">
        <i className="fab fa-facebook"></i>
      </a>
    )}
    {user.instagram && (
      <a href={user.instagram} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', fontSize: 20, transition: 'color 0.2s' }} className="profile-social profile-instagram">
        <i className="fab fa-instagram"></i>
      </a>
    )}
  </span>
);

// Function to group package payments together
const groupPackagePayments = (payments) => {
  console.log('🔧 [GROUPING] All input payments:', payments.map(p => ({
    id: p._id,
    isPackage: p.isPackage,
    packageType: p.packageType,
    className: p.className,
    amount: p.amount,
    packagePrice: p.packagePrice
  })));
  
  const grouped = {};
  const individual = [];
  
  payments.forEach(payment => {
    console.log('🔧 [CHECKING] Payment:', {
      isPackage: payment.isPackage,
      packageType: payment.packageType,
      className: payment.className
    });
    
    if (payment.isPackage && payment.packageType) {
      console.log('✅ [PACKAGE] This is a package payment');
      // Create a simpler key based on package type only
      const packageKey = `${payment.packageType}_${payment.userId}`;
      
      if (!grouped[packageKey]) {
        // Create a new grouped payment entry
        // Always use the package price (₱1600) not individual session amounts
        grouped[packageKey] = {
          ...payment,
          amount: payment.packagePrice || 1600, // Use package price, default to 1600 for Judo
          originalAmount: payment.amount,
          packageSessions: payment.packageSessions || 4,
          sessionCount: 1,
          sessionDetails: [payment],
          isGroupedPackage: true,
          // Use the earliest submission date for package start
          packageStartDate: payment.submittedAt
        };
      } else {
        // Add session details but don't change the amount
        grouped[packageKey].sessionDetails.push(payment);
        grouped[packageKey].sessionCount = grouped[packageKey].sessionDetails.length;
        
        // Keep the earliest submission date as package start
        if (new Date(payment.submittedAt) < new Date(grouped[packageKey].packageStartDate)) {
          grouped[packageKey].packageStartDate = payment.submittedAt;
          grouped[packageKey].submittedAt = payment.submittedAt;
        }
      }
    } else {
      console.log('🔵 [INDIVIDUAL] This is individual payment');
      // Individual payments (not packages)
      individual.push(payment);
    }
  });
  
  // Convert grouped packages back to array
  const groupedPackages = Object.values(grouped);
  
  const result = [...groupedPackages, ...individual];
  
  console.log('🔧 [RESULT] Final grouped result:', result.map(p => ({
    isGroupedPackage: p.isGroupedPackage,
    amount: p.amount,
    className: p.className,
    sessionCount: p.sessionCount || 1
  })));
  
  return result;
};

const UserProfile = () => {
  const [user, setUser] = useState(getUser());
  const [profilePic, setProfilePic] = useState(user.profilePic || '/images/profile.jpg');
  const [classHistory, setClassHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentCurrentPage, setPaymentCurrentPage] = useState(1);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [coachData, setCoachData] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const fileInputRef = useRef();

  const CLASSES_PER_PAGE = 4;
  const PAYMENTS_PER_PAGE = 2; // Reduced to show pagination more easily

  // Fetch class history
  const fetchClassHistory = async () => {
    if (!user.username) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/users/${user.username}/booking-history`);
      const data = await response.json();
      if (data.success) {
        setClassHistory(data.bookingHistory || []);
      }
    } catch (error) {
      console.error('Error fetching class history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch payment history using dedicated endpoint
  const fetchPaymentHistory = async () => {
    if (!user.username) return;
    
    setPaymentLoading(true);
    try {
      // Use the dedicated payment history endpoint for this user
      const cleanUsername = user.username ? user.username.replace('@', '') : '';
      
      const response = await fetch(`http://localhost:3001/api/users/${cleanUsername}/payment-history`);
      const data = await response.json();
      
      if (data.success && data.paymentHistory) {
        if (data.paymentHistory.length > 0) {
          // Group package payments together
          const groupedPayments = groupPackagePayments(data.paymentHistory);
          setPaymentHistory(groupedPayments);
        } else {
          setPaymentHistory([]);
        }
      } else {
        // Fallback: try the admin payments endpoint with filtering
        const [approvalRes, verifiedRes, rejectedRes] = await Promise.all([
          fetch(`http://localhost:3001/api/admin/payments?status=for approval`),
          fetch(`http://localhost:3001/api/admin/payments?status=verified`),
          fetch(`http://localhost:3001/api/admin/payments?status=rejected`)
        ]);
        
        const [approvalData, verifiedData, rejectedData] = await Promise.all([
          approvalRes.json(),
          verifiedRes.json(),
          rejectedRes.json()
        ]);
        
        // Combine all payments
        let allPayments = [];
        if (approvalData.success && approvalData.payments) {
          allPayments = allPayments.concat(approvalData.payments);
        }
        if (verifiedData.success && verifiedData.payments) {
          allPayments = allPayments.concat(verifiedData.payments);
        }
        if (rejectedData.success && rejectedData.payments) {
          allPayments = allPayments.concat(rejectedData.payments);
        }
        
        if (allPayments.length > 0) {
          // Use multiple username variations for filtering to catch all possible matches
          const usernameVariations = [
            user.username, // Original username
            cleanUsername, // Without @ symbol
            `@${cleanUsername}`, // With @ symbol if it doesn't have one
          ].filter(Boolean).filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
          
          // Filter payments for the specific user using multiple username variations
          const userPayments = allPayments.filter(payment => {
            // Check if payment.userId matches any of the username variations
            return usernameVariations.some(variation => payment.userId === variation);
          });
          
          if (userPayments.length > 0) {
            // Sort by submission date (latest first)
            userPayments.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
            // Group package payments together
            const groupedPayments = groupPackagePayments(userPayments);
            setPaymentHistory(groupedPayments);
          } else {
            setPaymentHistory([]);
          }
        } else {
          setPaymentHistory([]);
        }
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentHistory([]);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Fetch coach data if user is a coach
  const fetchCoachData = async () => {
    if (!user.username || !(user.userType === 'coach' || user.role === 'coach')) return;
    
    setCoachLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/coaches?username=${user.username}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setCoachData(data[0] || null);
      } else if (data && data.username) {
        setCoachData(data);
      }
    } catch (error) {
      console.error('Error fetching coach data:', error);
    } finally {
      setCoachLoading(false);
    }
  };

  useEffect(() => {
    fetchClassHistory();
    fetchPaymentHistory();
    fetchCoachData();
  }, [user.username]);

  const handleEditClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Please select a JPG or PNG image.');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setProfilePic(ev.target.result);
      // Save to localStorage
      const updatedUser = { ...user, profilePic: ev.target.result };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      window.dispatchEvent(new Event('profilePicUpdated'));
      // Save to database
      try {
        await fetch('http://localhost:3001/update-profile-pic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user.username, profilePic: ev.target.result })
        });
        // Fetch latest user data from backend and update localStorage and state
        const res = await fetch(`http://localhost:3001/api/users/${user.username}`);
        const updatedUserData = await res.json();
        if (updatedUserData && updatedUserData.profilePic) {
          localStorage.setItem('user', JSON.stringify(updatedUserData));
          setUser(updatedUserData);
          setProfilePic(updatedUserData.profilePic);
        }
      } catch (err) {
        alert('Failed to update profile picture in database.');
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const socket = new window.WebSocket('ws://localhost:3001');
    socket.onopen = () => {
        console.log('WebSocket connected!');
    };
    socket.onmessage = (event) => {
        console.log('WebSocket message:', event.data);
    };
    socket.onclose = () => {
        console.log('WebSocket disconnected!');
    };
    socket.onerror = (err) => {
        console.error('WebSocket error:', err);
    };
    return () => {
        socket.close();
    };
  }, []);

  // Calculate pagination
  const totalPages = Math.ceil(classHistory.length / CLASSES_PER_PAGE);
  const startIndex = (currentPage - 1) * CLASSES_PER_PAGE;
  const currentClasses = classHistory.slice(startIndex, startIndex + CLASSES_PER_PAGE);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Payment history pagination
  const paymentTotalPages = Math.ceil(paymentHistory.length / PAYMENTS_PER_PAGE);
  const paymentStartIndex = (paymentCurrentPage - 1) * PAYMENTS_PER_PAGE;
  const currentPayments = paymentHistory.slice(paymentStartIndex, paymentStartIndex + PAYMENTS_PER_PAGE);

  const handlePaymentPrevPage = () => {
    if (paymentCurrentPage > 1) {
      setPaymentCurrentPage(paymentCurrentPage - 1);
    }
  };

  const handlePaymentNextPage = () => {
    if (paymentCurrentPage < paymentTotalPages) {
      setPaymentCurrentPage(paymentCurrentPage + 1);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return '#28a745';
      case 'rejected': return '#dc3545';
      case 'for approval': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'verified': return 'Verified';
      case 'rejected': return 'Rejected';
      case 'for approval': return 'Pending';
      default: return 'Unknown';
    }
  };

  if (!user) return <div style={{ padding: 40 }}>Please log in to view your profile.</div>;
  
  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      {/* Header Section */}
      <div style={{
        background: "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/images/cage22.png') center/cover no-repeat",
        height: 260,
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          height: '100%',
          maxWidth: 1200,
          margin: '0 auto',
          position: 'relative',
          zIndex: 2,
          flexWrap: 'wrap',
        }}>
          {/* Floating Profile Pic with Edit Button */}
          <div style={{
            position: 'relative',
            width: 160,
            minWidth: 160,
            height: 160,
            zIndex: 3,
            top: 36,
            margin: '0 auto',
          }}>
            <div className="profile-pic-wrapper">
              <img
                src={profilePic}
                alt="User"
                className="profile-pic"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 160,
                  height: 160,
                  borderRadius: '50%',
                  border: `4px solid #fff`,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                  objectFit: 'cover',
                  zIndex: 10,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              />
              {/* Edit Button absolutely positioned as sibling, not clipped */}
              <button
                onClick={handleEditClick}
                className="profile-edit-btn"
                style={{
                  position: 'absolute',
                  right: 5,
                  bottom: 5,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#222',
                  color: '#fff',
                  border: `2px solid ${GREEN}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                  cursor: 'pointer',
                  fontSize: 18,
                  zIndex: 20,
                  padding: 0,
                  transition: 'background 0.2s, border 0.2s, transform 0.2s',
                }}
                title="Edit profile picture"
              >
                {/* SVG Camera Icon */}
                <svg className="profile-edit-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="4"/><path d="M5.5 7h13l-1.38-2.76A2 2 0 0 0 15.24 3H8.76a2 2 0 0 0-1.88 1.24L5.5 7z"/><rect x="3" y="7" width="18" height="13" rx="2"/></svg>
              </button>
              <input
                type="file"
                accept="image/png, image/jpeg"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          </div>
          {/* Info Right - left-aligned beside profile pic */}
          <div style={{
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            height: '100%',
            marginLeft: 40,
            marginBottom: 24,
            minWidth: 220,
            flex: 1,
            alignItems: 'flex-start',
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ borderLeft: `6px solid ${GREEN}`, height: 44, marginRight: 16 }}></div>
              <h1 style={{
                fontFamily: 'Courier New, Courier, monospace',
                fontWeight: 'bold',
                fontSize: 38,
                letterSpacing: 2,
                paddingLeft: 0,
                margin: 0,
              }}>{user.firstname?.toUpperCase()} {user.lastname?.toUpperCase()}</h1>
            </div>
            <div style={{ fontSize: 18, fontWeight: 500, marginTop: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
              {user.username}
              {socialIcons(user)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div style={{ maxWidth: 700, margin: '80px auto 0', background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 32, border: `2px solid ${GREEN}`, position: 'relative', textAlign: 'left' }}>
        {/* About Section */}
        <h2 style={{ color: GREEN, fontWeight: 'bold', marginBottom: 8, fontFamily: 'Montserrat, Arial, sans-serif', letterSpacing: 1, textAlign: 'left' }}>About</h2>
        <div style={{ width: 60, height: 4, background: GREEN, borderRadius: 2, margin: '0 0 18px 0' }}></div>
        <div style={{ fontSize: 17, color: '#222', marginBottom: 8 }}><strong>Name:</strong> {user.firstname} {user.lastname}</div>
        <div style={{ fontSize: 17, color: '#222', marginBottom: 8 }}><strong>Username:</strong> {user.username}</div>
        <div style={{ fontSize: 17, color: '#222', marginBottom: 24 }}><strong>Email:</strong> {user.email}</div>
        
        {/* Coach-specific information */}
        {(user.userType === 'coach' || user.role === 'coach') && (
          <>
            {coachLoading ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>Loading coach information...</div>
            ) : coachData ? (
              <>
                {/* Coach Details Table */}
                <h2 style={{ color: GREEN, fontWeight: 'bold', marginTop: 30, marginBottom: 8, fontFamily: 'Montserrat, Arial, sans-serif', letterSpacing: 1, textAlign: 'left' }}>Coach Details</h2>
                <div style={{ width: 60, height: 4, background: GREEN, borderRadius: 2, margin: '0 0 18px 0' }}></div>
                
                <table style={{ 
                  width: '100%', 
                  marginBottom: 24,
                  borderCollapse: 'collapse'
                }}>
                  <tbody>
                    {coachData.title && (
                      <tr>
                        <td style={{ 
                          fontSize: 17, 
                          color: '#222', 
                          fontWeight: 'bold', 
                          padding: '8px 0', 
                          width: '30%',
                          verticalAlign: 'top'
                        }}>TITLE:</td>
                        <td style={{ 
                          fontSize: 17, 
                          color: '#666', 
                          padding: '8px 0',
                          verticalAlign: 'top'
                        }}>{coachData.title}</td>
                      </tr>
                    )}
                    {coachData.specialties && coachData.specialties.length > 0 && (
                      <tr>
                        <td style={{ 
                          fontSize: 17, 
                          color: '#222', 
                          fontWeight: 'bold', 
                          padding: '8px 0',
                          verticalAlign: 'top'
                        }}>DISCIPLINES:</td>
                        <td style={{ 
                          fontSize: 17, 
                          color: '#666', 
                          padding: '8px 0',
                          verticalAlign: 'top'
                        }}>{coachData.specialties.join(', ')}</td>
                      </tr>
                    )}
                    {coachData.belt && (
                      <tr>
                        <td style={{ 
                          fontSize: 17, 
                          color: '#222', 
                          fontWeight: 'bold', 
                          padding: '8px 0',
                          verticalAlign: 'top'
                        }}>BELT:</td>
                        <td style={{ 
                          fontSize: 17, 
                          color: '#666', 
                          padding: '8px 0',
                          verticalAlign: 'top'
                        }}>{renderBelt(coachData.belt)}</td>
                      </tr>
                    )}
                    {coachData.proRecord && (
                      <tr>
                        <td style={{ 
                          fontSize: 17, 
                          color: '#222', 
                          fontWeight: 'bold', 
                          padding: '8px 0',
                          verticalAlign: 'top'
                        }}>PRO RECORD:</td>
                        <td style={{ 
                          fontSize: 17, 
                          color: '#666', 
                          padding: '8px 0',
                          verticalAlign: 'top'
                        }}>{coachData.proRecord}</td>
                      </tr>
                    )}
                    {coachData.specialties && coachData.specialties.length > 0 && (
                      <tr>
                        <td style={{ 
                          fontSize: 17, 
                          color: '#222', 
                          fontWeight: 'bold', 
                          padding: '8px 0',
                          verticalAlign: 'top'
                        }}>CLASSES:</td>
                        <td style={{ 
                          fontSize: 17, 
                          color: '#666', 
                          padding: '8px 0',
                          verticalAlign: 'top'
                        }}>{coachData.specialties.join(', ')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Coach Bio */}
                {coachData.biography && (
                  <>
                    <h2 style={{ color: GREEN, fontWeight: 'bold', marginTop: 30, marginBottom: 8, fontFamily: 'Montserrat, Arial, sans-serif', letterSpacing: 1, textAlign: 'left' }}>Bio</h2>
                    <div style={{ width: 60, height: 4, background: GREEN, borderRadius: 2, margin: '0 0 18px 0' }}></div>
                    <div style={{ 
                      fontSize: 16, 
                      color: '#444', 
                      lineHeight: '1.6',
                      marginBottom: 24
                    }}>
                      {coachData.biography.split('\n').map((line, idx) =>
                        line.trim() ? <p key={idx} style={{ marginBottom: 16 }}>{line}</p> : null
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 20, color: '#666', background: '#f8f9fa', borderRadius: 8, border: '1px solid #e9ecef' }}>
                Coach information not found. Please contact administrator.
              </div>
            )}
          </>
        )}

        {/* Class History Section - Hide for coaches */}
        {!(user.userType === 'coach' || user.role === 'coach') && (
          <>
            <h2 style={{ color: GREEN, fontWeight: 'bold', marginBottom: 8, fontFamily: 'Montserrat, Arial, sans-serif', letterSpacing: 1, textAlign: 'left' }}>Class History</h2>
        <div style={{ width: 60, height: 4, background: GREEN, borderRadius: 2, margin: '0 0 18px 0' }}></div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>Loading class history...</div>
        ) : classHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#666', background: '#f8f9fa', borderRadius: 8, border: '1px solid #e9ecef' }}>
            No class history yet. Start booking classes to see your history here!
          </div>
        ) : (
          <>
            {/* Classes Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: 16, 
              marginBottom: 20 
            }}>
              {currentClasses.map((classItem, index) => (
                <div key={index} style={{
                  background: '#f8f9fa',
                  border: `2px solid ${GREEN}`,
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'center',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(46, 204, 64, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
                >
                  <div style={{ 
                    fontSize: 14, 
                    fontWeight: 'bold', 
                    color: GREEN, 
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 1
                  }}>
                    {classItem.class || 'Boxing'}
                  </div>
                  <div style={{ 
                    fontSize: 13, 
                    color: '#666', 
                    marginBottom: 4 
                  }}>
                    {classItem.coachName}
                  </div>
                  <div style={{ 
                    fontSize: 12, 
                    color: '#888' 
                  }}>
                    {formatDate(classItem.date)}
                  </div>
                  <div style={{ 
                    fontSize: 11, 
                    color: '#aaa',
                    marginTop: 4
                  }}>
                    {classItem.time}
                  </div>
                  <div style={{
                    marginTop: 8,
                    padding: '4px 8px',
                    background: classItem.attendanceStatus === 'completed' ? '#28a745' : '#ffc107',
                    color: '#fff',
                    borderRadius: 12,
                    fontSize: 10,
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}>
                    {classItem.attendanceStatus || 'Completed'}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: 16,
                marginTop: 20
              }}>
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  style={{
                    background: currentPage === 1 ? '#e9ecef' : GREEN,
                    color: currentPage === 1 ? '#6c757d' : '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 'bold',
                    transition: 'all 0.2s'
                  }}
                >
                  ← Previous
                </button>
                
                <span style={{ 
                  color: '#666', 
                  fontSize: 14,
                  fontWeight: 'bold'
                }}>
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  style={{
                    background: currentPage === totalPages ? '#e9ecef' : GREEN,
                    color: currentPage === totalPages ? '#6c757d' : '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 'bold',
                    transition: 'all 0.2s'
                  }}
                >
                  Next →
                </button>
              </div>
            )}

            {/* Summary */}
            <div style={{
              marginTop: 20,
              padding: 16,
              background: '#f8f9fa',
              borderRadius: 8,
              border: '1px solid #e9ecef',
              textAlign: 'center'
            }}>
              <span style={{ color: '#666', fontSize: 14 }}>
                Total Classes Completed: <strong style={{ color: GREEN }}>{classHistory.length}</strong>
              </span>
            </div>
          </>
        )}
        {/* End Class History Section */}
        </>
        )}

        {/* Payment History Section - Hide for coaches */}
        {!(user.userType === 'coach' || user.role === 'coach') && (
          <>
            <h2 style={{ color: GREEN, fontWeight: 'bold', marginTop: 40, marginBottom: 8, fontFamily: 'Montserrat, Arial, sans-serif', letterSpacing: 1, textAlign: 'left' }}>Payment History</h2>
        <div style={{ width: 60, height: 4, background: GREEN, borderRadius: 2, margin: '0 0 18px 0' }}></div>
        
        {paymentLoading ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>Loading payment history...</div>
        ) : paymentHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#666', background: '#f8f9fa', borderRadius: 8, border: '1px solid #e9ecef' }}>
            No payment history yet. Start booking classes to see your payments here!
          </div>
        ) : (
          <>
            {/* Payments Table */}
            <div style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse', 
                background: '#fff', 
                borderRadius: 8, 
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: `1px solid ${GREEN}`
              }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ 
                      padding: 12, 
                      fontWeight: 'bold', 
                      fontSize: 14, 
                      color: '#333',
                      borderBottom: `2px solid ${GREEN}`,
                      textAlign: 'left'
                    }}>Date</th>
                    <th style={{ 
                      padding: 12, 
                      fontWeight: 'bold', 
                      fontSize: 14, 
                      color: '#333',
                      borderBottom: `2px solid ${GREEN}`,
                      textAlign: 'left'
                    }}>Time</th>
                    <th style={{ 
                      padding: 12, 
                      fontWeight: 'bold', 
                      fontSize: 14, 
                      color: '#333',
                      borderBottom: `2px solid ${GREEN}`,
                      textAlign: 'left'
                    }}>Amount</th>
                    <th style={{ 
                      padding: 12, 
                      fontWeight: 'bold', 
                      fontSize: 14, 
                      color: '#333',
                      borderBottom: `2px solid ${GREEN}`,
                      textAlign: 'left'
                    }}>Status</th>
                    <th style={{ 
                      padding: 12, 
                      fontWeight: 'bold', 
                      fontSize: 14, 
                      color: '#333',
                      borderBottom: `2px solid ${GREEN}`,
                      textAlign: 'left'
                    }}>Class</th>
                    <th style={{ 
                      padding: 12, 
                      fontWeight: 'bold', 
                      fontSize: 14, 
                      color: '#333',
                      borderBottom: `2px solid ${GREEN}`,
                      textAlign: 'left'
                    }}>Coach</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ 
                        textAlign: 'center', 
                        color: '#888',
                        padding: 20
                      }}>No payment records found.</td>
                    </tr>
                  ) : (
                    currentPayments.map((payment, index) => (
                      <tr key={index} style={{ 
                        borderBottom: '1px solid #e9ecef',
                        '&:hover': { background: '#f8f9fa' }
                      }}>
                                                 <td style={{ padding: 12, fontSize: 14 }}>
                           {new Date(payment.date).toLocaleDateString('en-PH', { 
                             timeZone: 'Asia/Manila', 
                             year: 'numeric', 
                             month: 'long', 
                             day: 'numeric' 
                           })}
                         </td>
                         <td style={{ padding: 12, fontSize: 14 }}>
                           {payment.isGroupedPackage ? 'Package Booking' : (payment.time || 'N/A')}
                         </td>
                        <td style={{ padding: 12, fontSize: 14 }}>
                          <div>
                            <strong>₱{payment.amount}</strong>
                            {payment.hasMembershipDiscount && (
                              <div style={{ 
                                fontSize: 11, 
                                color: '#666',
                                textDecoration: 'line-through'
                              }}>
                                ₱{payment.originalAmount}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: 12, fontSize: 14 }}>
                          <span style={{
                            padding: '4px 8px',
                            background: getStatusColor(payment.status),
                            color: '#fff',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }}>
                            {getStatusText(payment.status)}
                          </span>
                        </td>
                        <td style={{ padding: 12, fontSize: 14 }}>
                          <div>
                            {payment.isPackage ? (
                              <>
                                <strong>{payment.packageType} Package</strong>
                                <div style={{ fontSize: 11, color: '#666' }}>
                                  {payment.isGroupedPackage ? 
                                    `${payment.sessionCount} sessions completed` : 
                                    `${payment.packageSessions || 4} sessions`}
                                </div>
                                {payment.isGroupedPackage && payment.sessionDetails && (
                                  <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                                    Total: ₱{payment.amount} for {payment.sessionDetails.length} payments
                                  </div>
                                )}
                              </>
                            ) : (
                              payment.className || 'Boxing'
                            )}
                          </div>
                        </td>
                                                 <td style={{ padding: 12, fontSize: 14 }}>
                           {payment.coachName || payment.coachId || 'N/A'}
                         </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Payment Pagination - Always show if there are payments */}
            {paymentHistory.length > 0 && (
              <div style={{ 
                marginTop: 20,
                padding: 16,
                background: '#f8f9fa',
                borderRadius: 8,
                border: `1px solid ${GREEN}`,
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center'
              }}>
                <button
                  onClick={handlePaymentPrevPage}
                  disabled={paymentCurrentPage === 1}
                  style={{
                    background: paymentCurrentPage === 1 ? '#e9ecef' : GREEN,
                    color: paymentCurrentPage === 1 ? '#6c757d' : '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    cursor: paymentCurrentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 'bold',
                    transition: 'all 0.3s',
                    minWidth: 100,
                    boxShadow: paymentCurrentPage === 1 ? 'none' : `0 2px 4px rgba(46, 204, 64, 0.2)`
                  }}
                  onMouseOver={e => {
                    if (paymentCurrentPage !== 1) {
                      e.target.style.background = '#27ae60';
                      e.target.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseOut={e => {
                    if (paymentCurrentPage !== 1) {
                      e.target.style.background = GREEN;
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  ← Previous
                </button>
                
                <div style={{ 
                  textAlign: 'center',
                  flex: 1,
                  margin: '0 20px'
                }}>
                  <div style={{ 
                    color: GREEN, 
                    fontSize: 16,
                    fontWeight: 'bold',
                    marginBottom: 4
                  }}>
                    Page {paymentCurrentPage} of {paymentTotalPages}
                  </div>
                  <div style={{ 
                    color: '#666', 
                    fontSize: 12
                  }}>
                    Showing {currentPayments.length} of {paymentHistory.length} payment{paymentHistory.length !== 1 ? 's' : ''}
                  </div>
                </div>
                
                <button
                  onClick={handlePaymentNextPage}
                  disabled={paymentCurrentPage === paymentTotalPages}
                  style={{
                    background: paymentCurrentPage === paymentTotalPages ? '#e9ecef' : GREEN,
                    color: paymentCurrentPage === paymentTotalPages ? '#6c757d' : '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    cursor: paymentCurrentPage === paymentTotalPages ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 'bold',
                    transition: 'all 0.3s',
                    minWidth: 100,
                    boxShadow: paymentCurrentPage === paymentTotalPages ? 'none' : `0 2px 4px rgba(46, 204, 64, 0.2)`
                  }}
                  onMouseOver={e => {
                    if (paymentCurrentPage !== paymentTotalPages) {
                      e.target.style.background = '#27ae60';
                      e.target.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseOut={e => {
                    if (paymentCurrentPage !== paymentTotalPages) {
                      e.target.style.background = GREEN;
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  Next →
                </button>
              </div>
            )}

            {/* Payment Summary */}
            {paymentHistory.length > 0 && (
              <div style={{
                marginTop: 10,
                padding: 16,
                background: 'linear-gradient(135deg, #f8fff8 0%, #e8f8e8 100%)',
                borderRadius: 8,
                border: `2px solid ${GREEN}`,
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(46, 204, 64, 0.1)'
              }}>
                <div style={{ 
                  color: GREEN, 
                  fontSize: 16, 
                  fontWeight: 'bold',
                  marginBottom: 8,
                  letterSpacing: '0.5px'
                }}>
                  💰 PAYMENT SUMMARY
                </div>
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-around',
                  flexWrap: 'wrap',
                  gap: 16
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>Total Payments</div>
                    <div style={{ color: GREEN, fontSize: 20, fontWeight: 'bold' }}>{paymentHistory.length}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>Total Amount</div>
                    <div style={{ color: GREEN, fontSize: 20, fontWeight: 'bold' }}>
                      ₱{paymentHistory.reduce((total, payment) => {
                        // Use the amount field which should now be correct for grouped packages
                        return total + (payment.amount || 0);
                      }, 0).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>Verified Payments</div>
                    <div style={{ color: '#28a745', fontSize: 20, fontWeight: 'bold' }}>
                      {paymentHistory.reduce((count, payment) => {
                        if (payment.status === 'verified') {
                          // For grouped packages, count all session details, for individual payments count 1
                          return count + (payment.isGroupedPackage ? payment.sessionDetails?.length || 1 : 1);
                        }
                        return count;
                      }, 0)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {/* End Payment History Section */}
        </>
        )}
      </div>
      {/* Responsive Styles */}
    </div>
  );
};

export default UserProfile;