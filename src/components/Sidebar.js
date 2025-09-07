import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaHome, FaUser, FaEnvelope, FaShoppingCart, FaCog, FaSignOutAlt, FaIdCard } from 'react-icons/fa';

const Sidebar = ({ user, open, onClose, onLogout, isAdmin, handleNavigate }) => {
  const navigate = useNavigate();
  const displayName = user ? `${user.firstname} ${user.lastname}` : 'Guest';

  // Notification badge logic
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    function fetchNotifCount() {
      if (user && user.username) {
        if (user.userType === 'coach' || user.role === 'coach') {
          // For coaches, fetch ALL notifications to get accurate unread count
          fetch(`http://localhost:3001/api/coach-by-id/${user._id}/notifications?page=1&limit=1000`)
            .then(res => res.json())
            .then(data => {
              console.log('🔍 [SIDEBAR DEBUG] Coach notifications response:', data);
              if (data.notifications && Array.isArray(data.notifications)) {
                const unreadCount = data.notifications.filter(n => {
                  // Handle both boolean and string values for read status
                  if (typeof n.read === 'boolean') {
                    return n.read !== true;
                  }
                  if (typeof n.read === 'string') {
                    return n.read !== 'true';
                  }
                  // Default to unread if undefined or other value
                  return true;
                }).length;
                console.log('🔍 [SIDEBAR DEBUG] Unread count for coach:', unreadCount);
                setNotifCount(unreadCount);
              } else {
                setNotifCount(0);
              }
            })
            .catch((error) => {
              console.error('🔍 [SIDEBAR ERROR] Failed to fetch coach notifications:', error);
              setNotifCount(0);
            });
        } else {
          fetch(`http://localhost:3001/api/users/${user.username}?_t=${Date.now()}`)
            .then(res => res.json())
            .then(data => {
              console.log('🔍 [SIDEBAR DEBUG] User notifications response:', data);
              if (data.notifications && Array.isArray(data.notifications)) {
                const unreadCount = data.notifications.filter(n => {
                  // Handle both boolean and string values for read status
                  if (typeof n.read === 'boolean') {
                    return n.read !== true;
                  }
                  if (typeof n.read === 'string') {
                    return n.read !== 'true';
                  }
                  // Default to unread if undefined or other value
                  return true;
                }).length;
                console.log('🔍 [SIDEBAR DEBUG] Unread count for user:', unreadCount);
                setNotifCount(unreadCount);
              } else {
                setNotifCount(0);
              }
            })
            .catch((error) => {
              console.error('🔍 [SIDEBAR ERROR] Failed to fetch user notifications:', error);
              setNotifCount(0);
            });
        }
      }
    }
    // Initial fetch and setup background polling for badge updates
    if (user && user.username) {
      fetchNotifCount();
      
      // More frequent polling for better responsiveness - every 30 seconds
      const badgeInterval = setInterval(() => {
        // Only fetch if page is visible to save resources
        if (document.visibilityState === 'visible') {
          fetchNotifCount();
        }
      }, 30000); // 30 seconds for more responsive badge updates
      
      // Listen for manual notification updates
      window.addEventListener('notificationsUpdated', fetchNotifCount);
      
      // Also listen for page visibility changes to refresh immediately
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          fetchNotifCount();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        clearInterval(badgeInterval);
        window.removeEventListener('notificationsUpdated', fetchNotifCount);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [user]);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
    onClose();
  };

  // Default user object with placeholder values if no user is logged in
  const defaultUser = { name: 'John Doe', avatar: '/images/profile.jpg' };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.2)',
            zIndex: 2000,
          }}
        />
      )}

      {/* Sidebar (right) */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          right: open ? 0 : -260,
          left: 'auto',
          width: 260,
          height: '100vh',
          background: '#181818',
          boxShadow: '-2px 0 16px rgba(0,0,0,0.18)',
          zIndex: 2002,
          transition: 'right 0.25s cubic-bezier(.4,0,.2,1)',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
        }}
        aria-label="Sidebar menu"
      >
        <button
          onClick={onClose}
          style={{
            alignSelf: 'flex-end',
            background: 'none',
            border: 'none',
            fontSize: 28,
            margin: 16,
            cursor: 'pointer',
            color: '#fff',
          }}
          aria-label="Close menu"
        >
          &times;
        </button>
        {/* Profile Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 10, marginBottom: 30 }}>
          <div style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '4px solid #2ecc40',
            boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
          }}>
            <img src={user ? user.profilePic || '/images/profile.jpg' : '/images/profile.jpg'} alt="User" style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover' }} />
          </div>
          <span style={{ fontWeight: 'bold', fontSize: 18, color: '#fff', marginTop: 12, letterSpacing: 1, textAlign: 'center', textTransform: 'uppercase', fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif' }}>{displayName}</span>
        </div>
        {/* Menu Items */}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
          {user && (user.userType === 'coach' || user.role === 'coach') ? (
            <li>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate && handleNavigate('/schedules');
                  onClose();
                }}
                style={{...sidebarItemStyle, background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer'}}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(46, 204, 64, 0.15)';
                  e.currentTarget.style.borderLeft = '4px solid #2ecc40';
                  e.currentTarget.style.color = '#39ff6a';
                  e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(46, 204, 64, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderLeft = '4px solid transparent';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <FaHome style={iconStyle} /> SCHEDULES
              </button>
            </li>
          ) : (
            <li>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate && handleNavigate('/');
                  onClose();
                }}
                style={{...sidebarItemStyle, background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer'}}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(46, 204, 64, 0.15)';
                  e.currentTarget.style.borderLeft = '4px solid #2ecc40';
                  e.currentTarget.style.color = '#39ff6a';
                  e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(46, 204, 64, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderLeft = '4px solid transparent';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <FaHome style={iconStyle} /> HOME
              </button>
            </li>
          )}
          <li>
            <button 
              onClick={(e) => {
                e.preventDefault();
                handleNavigate && handleNavigate('/profile');
                onClose();
              }}
              style={{...sidebarItemStyle, background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer'}}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(46, 204, 64, 0.15)';
                e.currentTarget.style.borderLeft = '4px solid #2ecc40';
                e.currentTarget.style.color = '#39ff6a';
                e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(46, 204, 64, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderLeft = '4px solid transparent';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <FaUser style={iconStyle} /> PROFILE
            </button>
          </li>
          {/* MEMBERSHIP for user/client only (not coach and not admin) */}
          {user && !(user.userType === 'coach' || user.role === 'coach') && !isAdmin && (
            <li>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate && handleNavigate('/membership');
                  onClose();
                }}
                style={{...sidebarItemStyle, background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer'}}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(46, 204, 64, 0.15)';
                  e.currentTarget.style.borderLeft = '4px solid #2ecc40';
                  e.currentTarget.style.color = '#39ff6a';
                  e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(46, 204, 64, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderLeft = '4px solid transparent';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <FaIdCard style={iconStyle} /> MEMBERSHIP
              </button>
            </li>
          )}
          <li>
            <button 
              onClick={(e) => {
                e.preventDefault();
                handleNavigate && handleNavigate('/inbox');
                onClose();
              }}
              style={{...sidebarItemStyle, position: 'relative', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer'}}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(46, 204, 64, 0.15)';
                e.currentTarget.style.borderLeft = '4px solid #2ecc40';
                e.currentTarget.style.color = '#39ff6a';
                e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(46, 204, 64, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderLeft = '4px solid transparent';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <FaEnvelope style={iconStyle} /> NOTIFICATION
              {notifCount > 0 && (
                <span style={{
                  background: '#e74c3c', 
                  color: '#fff', 
                  borderRadius: '50%', 
                  padding: '4px 8px', 
                  fontSize: 12, 
                  fontWeight: 'bold', 
                  marginLeft: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 20,
                  height: 20,
                  textAlign: 'center',
                  boxShadow: '0 2px 6px rgba(231, 76, 60, 0.4)',
                  border: '2px solid #fff',
                  animation: 'pulse 2s infinite'
                }}>{notifCount}</span>
              )}
            </button>
          </li>
          <li>
            <button 
              onClick={(e) => {
                e.preventDefault();
                handleNavigate && handleNavigate('/settings');
                onClose();
              }}
              style={{...sidebarItemStyle, background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer'}}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(46, 204, 64, 0.15)';
                e.currentTarget.style.borderLeft = '4px solid #2ecc40';
                e.currentTarget.style.color = '#39ff6a';
                e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(46, 204, 64, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderLeft = '4px solid transparent';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <FaCog style={iconStyle} /> SETTINGS
            </button>
          </li>
          {/* Payslip only for coaches */}
          {user && (user.userType === 'coach' || user.role === 'coach') && (
            <li>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate && handleNavigate('/payslip');
                  onClose();
                }}
                style={{...sidebarItemStyle, background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer'}}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(46, 204, 64, 0.15)';
                  e.currentTarget.style.borderLeft = '4px solid #2ecc40';
                  e.currentTarget.style.color = '#39ff6a';
                  e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(46, 204, 64, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderLeft = '4px solid transparent';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <FaShoppingCart style={iconStyle} /> PAYSLIP
              </button>
            </li>
          )}
        </ul>
        {/* Logout Button */}
        {user && (
          <button 
            onClick={handleLogout} 
            style={{
              background: 'none',
              border: 'none',
              color: '#e74c3c',
              fontWeight: 'bold',
              fontSize: 16,
              padding: '18px 24px',
              textAlign: 'left',
              width: '100%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
              textTransform: 'uppercase',
              letterSpacing: 1,
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(231, 76, 60, 0.1)';
              e.currentTarget.style.color = '#ff6b6b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = '#e74c3c';
            }}
          >
            <FaSignOutAlt style={{ 
              color: 'inherit',
              transition: 'transform 0.2s ease'
            }} /> LOGOUT
          </button>
        )}
      </nav>
      
      {/* Add CSS for notification badge animation */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

const sidebarItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  color: '#fff',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: 15,
  padding: '12px 24px',
  transition: 'all 0.3s ease',
  borderLeft: '4px solid transparent',
  textTransform: 'uppercase',
  letterSpacing: 1,
  fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
  position: 'relative',
  overflow: 'hidden',
};

const iconStyle = {
  color: '#2ecc40',
  fontSize: 18,
};

export default Sidebar; 