import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../designs/membership.css'; // Reuse navbar styles
import Sidebar from './Sidebar';

const CLASSES_PER_PAGE = 4;
const COACHES_PER_PAGE = 4;

const Navbar = ({ user, onLogout, isAdmin, onAdminLogout, handleNavigate }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [classesDropdownOpen, setClassesDropdownOpen] = useState(false);
  const [classStartIdx, setClassStartIdx] = useState(0);
  const [coachStartIdx, setCoachStartIdx] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuHover, setMenuHover] = useState(false);
  const [coaches, setCoaches] = useState([]);
  const [coachesLoading, setCoachesLoading] = useState(true);
  const [navbarClasses, setNavbarClasses] = useState([]);
  const [siteSettings, setSiteSettings] = useState({ logoText: '' });
  const [membershipApproved, setMembershipApproved] = useState(false);

  const handleMenuClick = () => {
    if (user) {
      setSidebarOpen(!sidebarOpen);
    }
  };

  const handleClassLeft = (e) => {
    e.stopPropagation();
    setClassStartIdx((prev) => Math.max(0, prev - 1));
  };

  const handleClassRight = (e) => {
    e.stopPropagation();
    setClassStartIdx((prev) => Math.min(navbarClasses.length - CLASSES_PER_PAGE, prev + 1));
  };

  const handleCoachLeft = (e) => {
    e.stopPropagation();
    setCoachStartIdx((prev) => Math.max(0, prev - 1));
  };

  const handleCoachRight = (e) => {
    e.stopPropagation();
    setCoachStartIdx((prev) => Math.min(coaches.length - COACHES_PER_PAGE, prev + 1));
  };

  // Reset carousels when dropdowns close
  useEffect(() => {
    if (!classesDropdownOpen) setClassStartIdx(0);
    if (!dropdownOpen) setCoachStartIdx(0);
  }, [classesDropdownOpen, dropdownOpen]);

  // 🚀 OPTIMIZED: Lazy load coaches only when dropdown is opened
  const fetchCoaches = async () => {
    if (coaches.length > 0) return; // Already loaded
    
    setCoachesLoading(true);
    try {
      // 🚀 PERFORMANCE: Skip booking status for navbar dropdown (faster loading)
      const res = await fetch('http://localhost:3001/api/coaches?skipBookingStatus=true');
      const data = await res.json();
      setCoaches(data);
    } catch (err) {
      setCoaches([]);
    } finally {
      setCoachesLoading(false);
    }
  };

  // Initialize coaches as empty (lazy loaded on demand)

  // Fetch classes from backend for dropdown
  useEffect(() => {
    const fetchClasses = () => {
      fetch('http://localhost:3001/api/classes')
        .then(res => res.json())
        .then(data => setNavbarClasses(data))
        .catch(() => setNavbarClasses([]));
    };
    fetchClasses(); // initial fetch
    window.addEventListener('classAdded', fetchClasses);
    return () => {
      window.removeEventListener('classAdded', fetchClasses);
    };
  }, []);

  // Fetch site settings
  useEffect(() => {
    fetch('http://localhost:3001/api/site-settings')
      .then(res => res.json())
      .then(data => {
        setSiteSettings(data);
        localStorage.setItem('siteLogoText', data.logoText || '');
        localStorage.setItem('siteLogoImageUrl', data.logoImageUrl || '');
      })
      .catch(() => {});

    // Listen for logo text changes in localStorage
    const handleStorage = (e) => {
      if (e.key === 'siteLogoText') {
        setSiteSettings(prev => ({ ...prev, logoText: e.newValue || '' }));
      }
      if (e.key === 'siteLogoImageUrl') {
        setSiteSettings(prev => ({ ...prev, logoImageUrl: e.newValue || '' }));
      }
    };
    window.addEventListener('storage', handleStorage);

    // Listen for custom event for same-tab updates
    const handleLogoTextUpdated = () => {
      const newLogoText = localStorage.getItem('siteLogoText') || '';
      setSiteSettings(prev => ({ ...prev, logoText: newLogoText }));
    };
    window.addEventListener('logoTextUpdated', handleLogoTextUpdated);

    const handleLogoImageUpdated = () => {
      const newLogoImageUrl = localStorage.getItem('siteLogoImageUrl') || '';
      setSiteSettings(prev => ({ ...prev, logoImageUrl: newLogoImageUrl }));
    };
    window.addEventListener('logoImageUpdated', handleLogoImageUpdated);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('logoTextUpdated', handleLogoTextUpdated);
      window.removeEventListener('logoImageUpdated', handleLogoImageUpdated);
    };
  }, []);

  // Fetch membership status for user
  useEffect(() => {
    let ignore = false;
    const fetchMembershipStatus = async () => {
      if (user && (user._id || user.username)) {
        try {
          const res = await fetch(`http://localhost:3001/api/membership-application/status?userId=${user._id || user.username}`);
          const data = await res.json();
          if (
            data.success &&
            data.application &&
            data.application.status &&
            data.application.status.toLowerCase() === 'approved' &&
            data.application.expirationDate &&
            new Date(data.application.expirationDate) > new Date()
          ) {
            if (!ignore) setMembershipApproved(true);
          } else {
            if (!ignore) setMembershipApproved(false);
          }
        } catch {
          if (!ignore) setMembershipApproved(false);
        }
      } else {
        setMembershipApproved(false);
      }
    };
    fetchMembershipStatus();
    return () => { ignore = true; };
  }, [user]);

  // Map userType to role if needed
  const sidebarUser = user
    ? { ...user, role: user.role || user.userType }
    : null;

  return (
    <>
      <header className="navbar" style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 }}>
        <Link to="/" className="logo">
          {siteSettings.logoImageUrl ? (
            <img 
              src={siteSettings.logoImageUrl} 
              alt={siteSettings.logoText || "Logo"} 
              style={{ height: 48, objectFit: 'contain' }} 
            />
          ) : (
            siteSettings.logoText
          )}
        </Link>
        <nav style={{ flex: 1 }}>
          <ul style={{ display: 'flex', alignItems: 'center', gap: 30, margin: 0, padding: 0, listStyle: 'none', justifyContent: 'flex-end' }}>
            {(!user || (user.userType !== 'coach' && user.role !== 'coach')) && (
              <li><a href="#" onClick={e => { e.preventDefault(); handleNavigate && handleNavigate('/'); }}>HOME</a></li>
            )}
            {isAdmin && user && user.userType !== 'coach' && (
              <li><a href="#" onClick={e => { e.preventDefault(); handleNavigate && handleNavigate('/admin'); }} style={{ color: '#fff', textDecoration: 'none', fontSize: '1rem', fontFamily: 'Afacad, sans-serif' }}>ADMIN</a></li>
            )}
            {(!user || user.userType !== 'coach') && (
              <>
                <li><a href="#" onClick={e => { e.preventDefault(); handleNavigate && handleNavigate('/rates'); }}>RATES</a></li>
                {/* PROMOS: Only show if user has approved membership OR is admin */}
                {user && user.userType !== 'coach' && (isAdmin || membershipApproved) && (
                  <li><a href="#" onClick={e => { e.preventDefault(); handleNavigate && handleNavigate('/promos'); }}>PROMOS</a></li>
                )}
                <li><a href="#" onClick={e => { e.preventDefault(); handleNavigate && handleNavigate('/schedules'); }}>SCHEDULES</a></li>
                <li
                  className="dropdown"
                  onMouseEnter={() => setClassesDropdownOpen(true)}
                  onMouseLeave={() => setClassesDropdownOpen(false)}
                >
                  <a href="#" onClick={e => { e.preventDefault(); handleNavigate && handleNavigate('/classes'); }}>CLASSES</a>
                  <div
                    className="coaches-dropdown-content"
                    style={{ 
                      display: classesDropdownOpen ? 'flex' : 'none',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '30px',
                      padding: '16px 40px',
                      height: '200px',
                      width: '100vw',
                      position: 'fixed',
                      left: 0,
                      right: 0,
                      top: '60px',
                      background: '#000',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                      borderRadius: '5',
                      marginTop: '0',
                      zIndex: 1000,
                    }}
                    onMouseEnter={() => setClassesDropdownOpen(true)}
                    onMouseLeave={() => setClassesDropdownOpen(false)}
                  >
                    {classStartIdx > 0 && (
                      <button 
                        className="dropdown-arrow left" 
                        onClick={handleClassLeft}
                        style={{
                          background: 'linear-gradient(135deg, #2ecc40 60%, #27ae60 100%)',
                          border: 'none',
                          color: 'white',
                          padding: '10px',
                          cursor: 'pointer',
                          borderRadius: '50%',
                          width: '60px',
                          height: '60px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '28px',
                          boxShadow: '0 4px 18px rgba(46,204,64,0.3), 0 0 15px rgba(46,204,64,0.2)',
                          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          zIndex: 2,
                          flexShrink: 0,
                          marginRight: 8,
                          transform: 'scale(1)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'scale(1.15)';
                          e.currentTarget.style.boxShadow = '0 8px 32px rgba(46,204,64,0.4), 0 0 25px rgba(46,204,64,0.3)';
                          e.currentTarget.style.background = 'linear-gradient(135deg, #39ff6a 60%, #2ecc40 100%)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 4px 18px rgba(46,204,64,0.3), 0 0 15px rgba(46,204,64,0.2)';
                          e.currentTarget.style.background = 'linear-gradient(135deg, #2ecc40 60%, #27ae60 100%)';
                        }}
                        onMouseDown={e => {
                          e.currentTarget.style.transform = 'scale(0.95)';
                        }}
                        onMouseUp={e => {
                          e.currentTarget.style.transform = 'scale(1.15)';
                        }}
                      >
                        &#8592;
                      </button>
                    )}
                    <div style={{ 
                      overflow: 'hidden',
                      width: `${(240 * CLASSES_PER_PAGE) + (40 * (CLASSES_PER_PAGE - 1))}px`,
                      position: 'relative',
                      height: '100%',
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'center'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        gap: '40px',
                        transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        transform: `translateX(-${classStartIdx * (240 + 40)}px)`,
                        height: '100%',
                        alignItems: 'stretch',
                        justifyContent: 'flex-start',
                        width: `${navbarClasses.length * (240 + 40) - 40}px`,
                      }}>
                        {navbarClasses.map((cls) => (
                          <a href="#" onClick={e => { e.preventDefault(); handleNavigate && handleNavigate(`/classes?class=${cls._id}`); }} className="coach-thumb" key={cls._id} style={{ 
                            width: '240px', 
                            height: '180px', 
                            flexShrink: 0, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'flex-start', 
                            alignItems: 'center', 
                            overflow: 'visible', 
                            margin: '0 0 8px 0', 
                            background: 'none', 
                            boxShadow: 'none', 
                            borderRadius: '8px'
                          }}>
                            {cls.image && (
                              <img src={cls.image} alt={cls.name} style={{ 
                                width: '100%', 
                                height: '130px', 
                                objectFit: 'cover', 
                                borderRadius: '8px 8px 0 0', 
                                marginBottom: 0
                              }} />
                            )}
                            <span style={{ 
                              fontSize: '1.1rem', 
                              fontWeight: 'bold', 
                              padding: '10px 4px 6px 4px', 
                              textAlign: 'center', 
                              color: 'white', 
                              background: 'rgba(0,0,0,0.7)', 
                              width: '100%',
                              minHeight: '50px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              lineHeight: '1.2',
                              wordWrap: 'break-word',
                              hyphens: 'auto'
                            }}>{cls.name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                    {classStartIdx + CLASSES_PER_PAGE < navbarClasses.length && (
                      <button 
                        className="dropdown-arrow right" 
                        onClick={handleClassRight}
                        style={{
                          background: 'linear-gradient(135deg, #2ecc40 60%, #27ae60 100%)',
                          border: 'none',
                          color: 'white',
                          padding: '10px',
                          cursor: 'pointer',
                          borderRadius: '50%',
                          width: '60px',
                          height: '60px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '28px',
                          boxShadow: '0 4px 18px rgba(46,204,64,0.3), 0 0 15px rgba(46,204,64,0.2)',
                          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          zIndex: 2,
                          flexShrink: 0,
                          marginLeft: 8,
                          transform: 'scale(1)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'scale(1.15)';
                          e.currentTarget.style.boxShadow = '0 8px 32px rgba(46,204,64,0.4), 0 0 25px rgba(46,204,64,0.3)';
                          e.currentTarget.style.background = 'linear-gradient(135deg, #39ff6a 60%, #2ecc40 100%)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 4px 18px rgba(46,204,64,0.3), 0 0 15px rgba(46,204,64,0.2)';
                          e.currentTarget.style.background = 'linear-gradient(135deg, #2ecc40 60%, #27ae60 100%)';
                        }}
                        onMouseDown={e => {
                          e.currentTarget.style.transform = 'scale(0.95)';
                        }}
                        onMouseUp={e => {
                          e.currentTarget.style.transform = 'scale(1.15)';
                        }}
                      >
                        &#8594;
                      </button>
                    )}
                  </div>
                </li>
                <li
                  className="dropdown"
                  onMouseEnter={() => {
                    setDropdownOpen(true);
                    // 🚀 LAZY LOAD: Only fetch coaches when user hovers over dropdown
                    if (coaches.length === 0) {
                      fetchCoaches();
                    }
                  }}
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <a href="#" onClick={e => { e.preventDefault(); handleNavigate && handleNavigate('/coaches?coach=coachros'); }}>COACHES</a>
                  <div
                    className="coaches-dropdown-content"
                    style={{ 
                      display: dropdownOpen ? 'flex' : 'none',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0',
                      padding: '16px 0',
                      height: '220px',
                      width: '100vw',
                      position: 'fixed',
                      left: 0,
                      right: 0,
                      top: '60px',
                      background: '#000',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                      borderRadius: '0',
                      marginTop: '0',
                      zIndex: 1000,
                    }}
                    onMouseEnter={() => setDropdownOpen(true)}
                    onMouseLeave={() => setDropdownOpen(false)}
                  >
                    {coachStartIdx > 0 && (
                      <button 
                        className="dropdown-arrow left" 
                        onClick={handleCoachLeft}
                        style={{
                          background: 'linear-gradient(135deg, #2ecc40 60%, #27ae60 100%)',
                          border: 'none',
                          color: 'white',
                          padding: '10px',
                          cursor: 'pointer',
                          borderRadius: '50%',
                          width: '60px',
                          height: '60px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '28px',
                          boxShadow: '0 4px 18px rgba(46,204,64,0.3), 0 0 15px rgba(46,204,64,0.2)',
                          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          zIndex: 2,
                          flexShrink: 0,
                          marginRight: 8,
                          transform: 'scale(1)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'scale(1.15)';
                          e.currentTarget.style.boxShadow = '0 8px 32px rgba(46,204,64,0.4), 0 0 25px rgba(46,204,64,0.3)';
                          e.currentTarget.style.background = 'linear-gradient(135deg, #39ff6a 60%, #2ecc40 100%)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 4px 18px rgba(46,204,64,0.3), 0 0 15px rgba(46,204,64,0.2)';
                          e.currentTarget.style.background = 'linear-gradient(135deg, #2ecc40 60%, #27ae60 100%)';
                        }}
                        onMouseDown={e => {
                          e.currentTarget.style.transform = 'scale(0.95)';
                        }}
                        onMouseUp={e => {
                          e.currentTarget.style.transform = 'scale(1.15)';
                        }}
                      >
                        &#8592;
                      </button>
                    )}
                    <div style={{ 
                      overflow: 'hidden',
                      width: `${(240 * COACHES_PER_PAGE) + (40 * (COACHES_PER_PAGE - 1))}px`,
                      position: 'relative',
                      height: '100%',
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'center'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        gap: '40px',
                        transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        transform: `translateX(-${coachStartIdx * (240 + 40)}px)`,
                        height: '100%',
                        alignItems: 'stretch',
                        justifyContent: 'flex-start',
                        width: `${coaches.length * (240 + 40) - 40}px`,
                      }}>
                        {coaches.map((coach) => (
                          <a href="#" onClick={e => { e.preventDefault(); handleNavigate && handleNavigate(`/coaches?coach=${coach.username}`); }} className="coach-thumb" key={coach._id} style={{ 
                            width: '240px', 
                            height: '180px', 
                            flexShrink: 0, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'flex-end', 
                            overflow: 'hidden', 
                            margin: '0', 
                            background: 'none', 
                            boxShadow: 'none', 
                            borderRadius: '8px'
                          }}>
                            <div className="coach-thumb-img-wrapper" style={{ 
                              height: '150px',
                              width: '100%',
                              overflow: 'hidden',
                              borderRadius: '8px',
                            }}>
                              <img 
                                src={coach.profilePic || '/images/placeholder.jpg'} 
                                alt={coach.firstname + ' ' + coach.lastname} 
                                style={{ 
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  borderRadius: '8px'
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', padding: '8px 0 2px 0', textAlign: 'center', color: 'white' }}>{`Coach ${coach.firstname}`}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                    {coachStartIdx + COACHES_PER_PAGE < coaches.length && (
                      <button 
                        className="dropdown-arrow right" 
                        onClick={handleCoachRight}
                        style={{
                          background: 'linear-gradient(135deg, #2ecc40 60%, #27ae60 100%)',
                          border: 'none',
                          color: 'white',
                          padding: '10px',
                          cursor: 'pointer',
                          borderRadius: '50%',
                          width: '60px',
                          height: '60px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '28px',
                          boxShadow: '0 4px 18px rgba(46,204,64,0.3), 0 0 15px rgba(46,204,64,0.2)',
                          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          zIndex: 2,
                          flexShrink: 0,
                          marginLeft: 8,
                          transform: 'scale(1)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'scale(1.15)';
                          e.currentTarget.style.boxShadow = '0 8px 32px rgba(46,204,64,0.4), 0 0 25px rgba(46,204,64,0.3)';
                          e.currentTarget.style.background = 'linear-gradient(135deg, #39ff6a 60%, #2ecc40 100%)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 4px 18px rgba(46,204,64,0.3), 0 0 15px rgba(46,204,64,0.2)';
                          e.currentTarget.style.background = 'linear-gradient(135deg, #2ecc40 60%, #27ae60 100%)';
                        }}
                        onMouseDown={e => {
                          e.currentTarget.style.transform = 'scale(0.95)';
                        }}
                        onMouseUp={e => {
                          e.currentTarget.style.transform = 'scale(1.15)';
                        }}
                      >
                        &#8594;
                      </button>
                    )}
                  </div>
                </li>
                <li>
                  <a href="#" onClick={e => { e.preventDefault(); handleNavigate && handleNavigate('/contact'); }}>CONTACT</a>
                </li>
              </>
            )}
            {user && user.userType === 'coach' && (
              <li><a href="#" onClick={e => { e.preventDefault(); handleNavigate && handleNavigate('/schedules'); }}>SCHEDULES</a></li>
            )}
            {/* Conditionally render LOGIN link */}
            {!user && (
              <li><a href="#" onClick={e => { e.preventDefault(); handleNavigate && handleNavigate('/login'); }}>LOGIN</a></li>
            )}
          </ul>
        </nav>
        {/* Hamburger Menu Icon Container (always rendered, icon conditional) */}
        <div
          className="menu-icon"
          onClick={handleMenuClick}
          onMouseEnter={() => user && setMenuHover(true)}
          onMouseLeave={() => user && setMenuHover(false)}
          style={{
            width: 40,
            height: 40,
            background: user && menuHover ? '#2ecc40' : 'none',
            border: 'none',
            fontSize: 32,
            color: user && menuHover ? '#000' : '#fff',
            cursor: user ? 'pointer' : 'default',
            marginLeft: 20,
            marginRight: 60,
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            padding: 0,
            borderRadius: 2,
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          {/* Hamburger Menu Icon (visible only when user is logged in) */}
          {user && (
            <>
              <span style={{ display: 'block', width: 28, height: 3, background: menuHover ? '#000' : '#fff', margin: '3px 0', borderRadius: 5, transition: 'background 0.2s' }}></span>
              <span style={{ display: 'block', width: 28, height: 3, background: menuHover ? '#000' : '#fff', margin: '3px 0', borderRadius: 5, transition: 'background 0.2s' }}></span>
              <span style={{ display: 'block', width: 28, height: 3, background: menuHover ? '#000' : '#fff', margin: '3px 0', borderRadius: 5, transition: 'background 0.2s' }}></span>
            </>
          )}
        </div>
      </header>
      <div className="blur-overlay" style={{ display: dropdownOpen || classesDropdownOpen ? 'block' : 'none' }}></div>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={sidebarUser} onLogout={onLogout} isAdmin={isAdmin} handleNavigate={handleNavigate} />
    </>
  );
};

export default Navbar; 