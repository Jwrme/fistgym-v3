import React, { useEffect, useState } from 'react';
import { FaBell } from 'react-icons/fa';

const Inbox = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [notifTotal, setNotifTotal] = useState(0);
  const limit = 5;

  useEffect(() => {
    let interval;
    const user = JSON.parse(localStorage.getItem('user'));
    console.log('🔍 [FRONTEND DEBUG] LocalStorage user:', user);
    console.log('🔍 [FRONTEND DEBUG] User.username:', user?.username);
    console.log('🔍 [FRONTEND DEBUG] User.isAdmin:', user?.isAdmin);
    console.log('🔍 [FRONTEND DEBUG] User.userType:', user?.userType);
    
    if (!user || (!user.username && !user._id)) {
      setError('You must be logged in to view notifications.');
      setLoading(false);
      return;
    }
    const fetchNotifications = (pageOverride) => {
      // If coach, use new endpoint by ObjectId with pagination
      if (user.userType === 'coach' || user.role === 'coach') {
        const pageNum = pageOverride || page;
        fetch(`http://localhost:3001/api/coach-by-id/${user._id}/notifications?page=${pageNum}&limit=${limit}`)
          .then(res => res.json())
          .then(data => {
            console.log('🔍 [FRONTEND DEBUG] Coach ID:', user._id);
            console.log('🔍 [FRONTEND DEBUG] Fetch response:', data);
            console.log('🔍 [FRONTEND DEBUG] Notifications array:', data.notifications);
            
            const sortedNotifications = (data.notifications || []).sort((a, b) => {
              const timestampA = new Date(a.timestamp || a.date);
              const timestampB = new Date(b.timestamp || b.date);
              console.log('🔍 [SORT DEBUG] Comparing:', a.type, timestampA, 'vs', b.type, timestampB);
              return timestampB - timestampA;
            });
            console.log('🔍 [FRONTEND DEBUG] Sorted notifications:', sortedNotifications);
            
            setNotifications(sortedNotifications);
            setTotalPages(data.totalPages || 1);
            setNotifTotal(data.total || 0);
            setLoading(false);
          })
          .catch(() => {
            setError('Failed to fetch notifications.');
            setLoading(false);
          });
      } else {
        // Default: user notifications with pagination
        const pageNum = pageOverride || page;
        fetch(`http://localhost:3001/api/users/${user.username}?_t=${Date.now()}`)
          .then(res => res.json())
          .then(data => {
            console.log('🔍 [FRONTEND DEBUG] User:', user.username);
            console.log('🔍 [FRONTEND DEBUG] Raw API response data:', data);
            console.log('🔍 [FRONTEND DEBUG] Data.notifications:', data.notifications);
            console.log('🔍 [FRONTEND DEBUG] Notifications count:', data.notifications?.length || 0);
            
            const allNotifications = (data.notifications || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            console.log('🔍 [FRONTEND DEBUG] Sorted notifications:', allNotifications);
            
            const total = allNotifications.length;
            const totalPages = Math.ceil(total / limit);
            const startIndex = (pageNum - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedNotifications = allNotifications.slice(startIndex, endIndex);
            
            console.log('🔍 [FRONTEND DEBUG] Paginated notifications to display:', paginatedNotifications);
            
            setNotifications(paginatedNotifications);
            setTotalPages(totalPages);
            setNotifTotal(total);
            setLoading(false);
          })
          .catch((error) => {
            console.error('🔍 [FRONTEND ERROR] Fetch failed:', error);
            console.error('🔍 [FRONTEND ERROR] Error details:', error.message);
            setError('Failed to fetch notifications.');
            setLoading(false);
          });
      }
    };
    fetchNotifications();
    // Smart polling: Only poll when page is visible and reduce frequency
    let pollInterval = 180000; // 3 minutes (180 seconds) default
    
    // Slightly faster polling for admin users
    if (user.isAdmin) {
      pollInterval = 120000; // 2 minutes for admin
    }
    
    const smartPoll = () => {
      // Only fetch if page is visible (user is actively using it)
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };
    
    interval = setInterval(smartPoll, pollInterval);
    
    // Also fetch when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    Inbox.fetchNotifications = fetchNotifications;
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [page]);

  const isRead = notif => {
    // Handle both boolean and string values for read status
    if (typeof notif.read === 'boolean') {
      return notif.read === true;
    }
    if (typeof notif.read === 'string') {
      return notif.read === 'true';
    }
    // Default to unread if undefined or other value
    return false;
  };

  const handleSelect = idx => {
    setSelected(sel => sel.includes(idx) ? sel.filter(i => i !== idx) : [...sel, idx]);
  };

  const handleDelete = async () => {
    setProcessing(true);
    const user = JSON.parse(localStorage.getItem('user'));
    const notifIds = selected.map(idx => notifications[idx]._id?.toString()).filter(Boolean);
    try {
      if (user.userType === 'coach' || user.role === 'coach') {
        await fetch(`http://localhost:3001/api/coaches/${user.username}/notifications`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notifIds })
        });
      } else {
        await fetch(`http://localhost:3001/api/users/${user.username}/notifications`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notifIds })
        });
      }
      setSelected([]);
      // Refresh notifications first
      if (Inbox.fetchNotifications) {
        await Inbox.fetchNotifications();
      }
      
      // Dispatch event to update badge with delay to ensure backend is updated
      setTimeout(() => {
        window.dispatchEvent(new Event('notificationsUpdated'));
      }, 100);
      
      // Additional dispatch after a longer delay for reliability
      setTimeout(() => {
        window.dispatchEvent(new Event('notificationsUpdated'));
      }, 500);
      
      // Validation: check if deleted
      const stillExists = notifIds.some(id => notifications.find(n => n._id === id));
      if (stillExists) {
        setToast('Some notifications could not be deleted.');
      } else {
        setToast('Notification(s) deleted successfully.');
      }
    } catch {
      setError('Failed to delete notification(s).');
      setToast('Failed to delete notification(s).');
    }
    setProcessing(false);
    setTimeout(() => setToast(''), 2500);
  };

  const handleRead = async () => {
    setProcessing(true);
    const user = JSON.parse(localStorage.getItem('user'));
    const notifIds = selected.map(idx => notifications[idx]._id?.toString()).filter(Boolean);
    try {
      if (user.userType === 'coach' || user.role === 'coach') {
        await fetch(`http://localhost:3001/api/coaches/${user.username}/notifications/read`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notifIds })
        });
      } else {
        await fetch(`http://localhost:3001/api/users/${user.username}/notifications/read`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notifIds })
        });
      }
      setSelected([]);
      // Refresh notifications first
      if (Inbox.fetchNotifications) {
        await Inbox.fetchNotifications();
      }
      
      // Dispatch event to update badge with delay to ensure backend is updated
      setTimeout(() => {
        window.dispatchEvent(new Event('notificationsUpdated'));
      }, 100);
      
      // Additional dispatch after a longer delay for reliability
      setTimeout(() => {
        window.dispatchEvent(new Event('notificationsUpdated'));
      }, 500);
      
      // Validation: check if marked as read (use the latest notifications from backend)
      if (!(user.userType === 'coach' || user.role === 'coach')) {
        const userData = await fetch(`http://localhost:3001/api/users/${user.username}`).then(res => res.json());
        const notRead = notifIds.some(id => {
          const n = (userData.notifications || []).find(n => n._id === id);
          return n && !n.read;
        });
        if (notRead) {
          setToast('Some notifications could not be marked as read.');
        } else {
          setToast('Notification(s) marked as read.');
        }
      } else {
        setToast('Notification(s) marked as read.');
      }
    } catch {
      setError('Failed to mark as read.');
      setToast('Failed to mark as read.');
    }
    setProcessing(false);
    setTimeout(() => setToast(''), 2500);
  };

  const handleReadAll = async () => {
    setProcessing(true);
    const user = JSON.parse(localStorage.getItem('user'));
    
    try {
      let allNotifIds = [];
      
      if (user.userType === 'coach' || user.role === 'coach') {
        // For coaches, get ALL notifications from all pages
        console.log('🔍 [READ ALL] Fetching coach notifications...');
        const response = await fetch(`http://localhost:3001/api/coach-by-id/${user._id}/notifications?page=1&limit=1000`);
        const data = await response.json();
        allNotifIds = (data.notifications || []).map(notif => notif._id?.toString()).filter(Boolean);
        console.log('🔍 [READ ALL] Found notification IDs:', allNotifIds);
        
        const markReadResponse = await fetch(`http://localhost:3001/api/coaches/${user.username}/notifications/read`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notifIds: allNotifIds })
        });
        
        const markReadResult = await markReadResponse.json();
        console.log('🔍 [READ ALL] Mark read result:', markReadResult);
        
        if (!markReadResponse.ok) {
          throw new Error(`Failed to mark as read: ${markReadResult.error || 'Unknown error'}`);
        }
      } else {
        // For regular users, get ALL notifications
        console.log('🔍 [READ ALL] Fetching user notifications...');
        const response = await fetch(`http://localhost:3001/api/users/${user.username}`);
        const data = await response.json();
        console.log('🔍 [READ ALL] User data received:', data);
        console.log('🔍 [READ ALL] User notifications:', data.notifications);
        allNotifIds = (data.notifications || []).map(notif => notif._id?.toString()).filter(Boolean);
        console.log('🔍 [READ ALL] Found notification IDs:', allNotifIds);
        
        // Debug: Check current read status
        const readStatuses = (data.notifications || []).map(n => ({ 
          id: n._id?.toString(), 
          read: n.read, 
          type: typeof n._id,
          rawId: n._id 
        }));
        console.log('🔍 [READ ALL] Current read statuses:', readStatuses);
        
        const markReadResponse = await fetch(`http://localhost:3001/api/users/${user.username}/notifications/read`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notifIds: allNotifIds })
        });
        
        const markReadResult = await markReadResponse.json();
        console.log('🔍 [READ ALL] Mark read result:', markReadResult);
        
        if (!markReadResponse.ok) {
          throw new Error(`Failed to mark as read: ${markReadResult.error || 'Unknown error'}`);
        }
      }
      
      setSelected([]);
      // Force immediate refresh of notifications
      if (Inbox.fetchNotifications) {
        console.log('🔍 [READ ALL] Refreshing notifications after mark as read...');
        await Inbox.fetchNotifications();
        
        // Debug: Verify notifications are actually marked as read  
        if (!(user.userType === 'coach' || user.role === 'coach')) {
          const verifyResponse = await fetch(`http://localhost:3001/api/users/${user.username}`);
          const verifyData = await verifyResponse.json();
          const stillUnreadCount = (verifyData.notifications || []).filter(n => !n.read).length;
          console.log('🔍 [READ ALL] Verification - remaining unread notifications:', stillUnreadCount);
          console.log('🔍 [READ ALL] Verification - all notifications:', verifyData.notifications?.map(n => ({ id: n._id, read: n.read })));
        }
      }
      // Dispatch event to update badge
      window.dispatchEvent(new Event('notificationsUpdated'));
      // Force additional refreshes to ensure persistence
      setTimeout(() => {
        if (Inbox.fetchNotifications) {
          Inbox.fetchNotifications();
        }
        window.dispatchEvent(new Event('notificationsUpdated'));
      }, 300);
      setTimeout(() => {
        window.dispatchEvent(new Event('notificationsUpdated'));
      }, 1000);
      setToast(`All ${allNotifIds.length} notifications marked as read.`);
    } catch (error) {
      console.error('❌ [READ ALL] Error:', error);
      setError(`Failed to mark all as read: ${error.message}`);
      setToast(`Failed to mark all as read: ${error.message}`);
    }
    setProcessing(false);
    setTimeout(() => setToast(''), 2500);
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete all notifications?')) {
      return;
    }
    setProcessing(true);
    const user = JSON.parse(localStorage.getItem('user'));
    
    try {
      let allNotifIds = [];
      
      if (user.userType === 'coach' || user.role === 'coach') {
        // For coaches, get ALL notifications from all pages
        console.log('🔍 [DELETE ALL] Fetching coach notifications...');
        const response = await fetch(`http://localhost:3001/api/coach-by-id/${user._id}/notifications?page=1&limit=1000`);
        const data = await response.json();
        allNotifIds = (data.notifications || []).map(notif => notif._id).filter(Boolean);
        console.log('🔍 [DELETE ALL] Found notification IDs:', allNotifIds);
        
        const deleteResponse = await fetch(`http://localhost:3001/api/coaches/${user.username}/notifications`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notifIds: allNotifIds })
        });
        
        const deleteResult = await deleteResponse.json();
        console.log('🔍 [DELETE ALL] Delete result:', deleteResult);
        
        if (!deleteResponse.ok) {
          throw new Error(`Failed to delete: ${deleteResult.error || 'Unknown error'}`);
        }
      } else {
        // For regular users, get ALL notifications
        console.log('🔍 [DELETE ALL] Fetching user notifications...');
        const response = await fetch(`http://localhost:3001/api/users/${user.username}`);
        const data = await response.json();
        allNotifIds = (data.notifications || []).map(notif => notif._id?.toString()).filter(Boolean);
        console.log('🔍 [DELETE ALL] Found notification IDs:', allNotifIds);
        
        // Debug: Check notification ID types
        const idTypes = (data.notifications || []).map(n => ({ 
          id: n._id?.toString(), 
          type: typeof n._id,
          rawId: n._id 
        }));
        console.log('🔍 [DELETE ALL] ID types:', idTypes);
        
        const deleteResponse = await fetch(`http://localhost:3001/api/users/${user.username}/notifications`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notifIds: allNotifIds })
        });
        
        const deleteResult = await deleteResponse.json();
        console.log('🔍 [DELETE ALL] Delete result:', deleteResult);
        
        if (!deleteResponse.ok) {
          throw new Error(`Failed to delete: ${deleteResult.error || 'Unknown error'}`);
        }
      }
      
      setSelected([]);
      // Force immediate refresh of notifications
      if (Inbox.fetchNotifications) {
        await Inbox.fetchNotifications();
      }
      // Dispatch event to update badge
      window.dispatchEvent(new Event('notificationsUpdated'));
      // Force additional refreshes to ensure persistence
      setTimeout(() => {
        if (Inbox.fetchNotifications) {
          Inbox.fetchNotifications();
        }
        window.dispatchEvent(new Event('notificationsUpdated'));
      }, 300);
      setTimeout(() => {
        window.dispatchEvent(new Event('notificationsUpdated'));
      }, 1000);
      setToast(`All ${allNotifIds.length} notifications deleted successfully.`);
    } catch (error) {
      console.error('❌ [DELETE ALL] Error:', error);
      setError(`Failed to delete all notifications: ${error.message}`);
      setToast(`Failed to delete all notifications: ${error.message}`);
    }
    setProcessing(false);
    setTimeout(() => setToast(''), 2500);
  };

  return (
    <div style={{ maxWidth: 600, margin: '80px auto 0 auto', background: 'none', padding: 0, minHeight: '60vh' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 30, left: '50%', transform: 'translateX(-50%)', background: '#145a32', color: '#fff', padding: '12px 32px', borderRadius: 8, fontWeight: 'bold', fontSize: 18, zIndex: 9999, boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
          {toast}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 36 }}>
        <h2 style={{ color: '#2ecc40', textAlign: 'center', fontWeight: 'bold', letterSpacing: 2, fontSize: 38, fontFamily: 'Montserrat, Arial, sans-serif', textShadow: '2px 2px 0 #181818', margin: 0 }}>
          Notifications
        </h2>
        <button 
          onClick={() => {
            console.log('🔄 Manual refresh triggered');
            if (Inbox.fetchNotifications) {
              Inbox.fetchNotifications(1);
              setPage(1);
            }
          }}
          style={{
            marginLeft: '20px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🔄 Refresh
        </button>
        <button 
          onClick={handleReadAll}
          disabled={processing || notifications.length === 0}
          style={{
            marginLeft: '10px',
            background: '#2ecc40',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: processing || notifications.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: processing || notifications.length === 0 ? 0.6 : 1
          }}
        >
          ✓ Read All
        </button>
        <button 
          onClick={handleDeleteAll}
          disabled={processing || notifications.length === 0}
          style={{
            marginLeft: '10px',
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: processing || notifications.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: processing || notifications.length === 0 ? 0.6 : 1
          }}
        >
          🗑️ Delete All
        </button>
        {selected.length > 0 && (
          <div style={{ marginLeft: 24, display: 'flex', gap: 12 }}>
            <button onClick={handleRead} disabled={processing} style={{ background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer', boxShadow: '0 2px 8px #2ecc4022', transition: 'background 0.18s' }}>Read</button>
            <button onClick={handleDelete} disabled={processing} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer', boxShadow: '0 2px 8px #e74c3c22', transition: 'background 0.18s' }}>Delete</button>
          </div>
        )}
      </div>
      {loading && <div style={{ textAlign: 'center', color: '#888', fontSize: 18, marginTop: 40 }}>Loading notifications...</div>}
      {error && <div style={{ color: 'red', textAlign: 'center', fontSize: 18, marginTop: 40 }}>{error}</div>}
      {!loading && !error && notifications.length === 0 && <div style={{ textAlign: 'center', color: '#888', fontSize: 18, marginTop: 40 }}>No notifications yet.</div>}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {(notifications || []).map((notif, idx) => {
          if (!notif) return null;
          let dateObj = null;
          let phDate = '—';
          let phTime = '';
          if (notif.timestamp || notif.date) {
            let d;
            try {
              d = new Date(notif.timestamp || notif.date);
              if (!isNaN(d.getTime()) && d.getFullYear() > 1970 && d.getFullYear() < 3000) {
                dateObj = d;
                try {
                  phDate = dateObj.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'long', month: 'long', day: 'numeric' });
                  phTime = dateObj.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' });
                } catch (err) {
                  phDate = '—';
                  phTime = '';
                }
              }
            } catch (err) {
              phDate = '—';
              phTime = '';
            }
          }
          const borderColor = !isRead(notif) ? '#2ecc40' : '#bbb';
          const bgColor = !isRead(notif) ? 'linear-gradient(135deg, #eaffea 90%, #f8fff8 100%)' : 'linear-gradient(135deg, #f8f8f8 90%, #f4f4f4 100%)';
          const shadow = !isRead(notif) ? '0 4px 18px rgba(46,204,64,0.13)' : '0 2px 10px rgba(44,204,64,0.07)';
          const statusColor = !isRead(notif) ? '#2ecc40' : '#888';
          return (
            <li key={notif._id || idx} style={{
              background: bgColor,
              borderRadius: 22,
              boxShadow: shadow,
              marginBottom: 18,
              padding: '18px 22px 14px 18px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              borderLeft: `7px solid ${borderColor}`,
              border: 'none',
              minHeight: 70,
              position: 'relative',
              overflow: 'hidden',
              animation: 'notifFadeIn 0.7s cubic-bezier(.39,.575,.565,1) both',
              opacity: isRead(notif) ? 0.7 : 1,
              transition: 'box-shadow 0.18s, transform 0.18s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.025)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <FaBell style={{ color: borderColor, fontSize: 26, marginRight: 18, flexShrink: 0 }} />
              <input type="checkbox" checked={selected.includes(idx)} onChange={() => handleSelect(idx)} style={{ marginRight: 16, width: 18, height: 18 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#181818', fontSize: 16, textAlign: 'left', marginBottom: 2, letterSpacing: 0.5, wordBreak: 'break-word' }}>
                  {notif.message}
                </div>
                <div style={{ fontSize: 13, color: '#888', textAlign: 'left', marginBottom: 2 }}>
                  {phDate}{phTime ? ` • ${phTime}` : ''}
                </div>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 14px',
                  borderRadius: 16,
                  background: isRead(notif) ? '#eee' : '#2ecc40',
                  color: isRead(notif) ? '#888' : '#fff',
                  fontWeight: 600,
                  fontSize: 13,
                  marginTop: 4,
                  letterSpacing: 0.5,
                  boxShadow: isRead(notif) ? 'none' : '0 1px 6px #2ecc4033',
                  border: isRead(notif) ? '1px solid #ddd' : 'none',
                }}>
                  {isRead(notif) ? 'Read' : 'Unread'}
                </span>
              </div>
              <style>{`
                @keyframes notifFadeIn {
                  0% { opacity: 0; transform: translateY(20px); }
                  100% { opacity: 1; transform: translateY(0); }
                }
                @media (max-width: 600px) {
                  li {
                    flexDirection: column !important;
                    alignItems: flex-start !important;
                    padding: 14px 10px 10px 10px !important;
                  }
                }
              `}</style>
            </li>
          );
        })}
      </ul>
      {/* Pagination controls for all users */}
      {(!loading && !error && (notifTotal > limit)) && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 24, gap: 16 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#181818', color: '#fff', fontWeight: 'bold', fontSize: 15, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>Prev</button>
          <span style={{ color: '#2ecc40', fontWeight: 'bold', fontSize: 16 }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#181818', color: '#fff', fontWeight: 'bold', fontSize: 15, cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}>Next</button>
        </div>
      )}
    </div>
  );
};

export default Inbox; 