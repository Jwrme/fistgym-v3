import React, { useEffect, useState } from 'react';

const MembershipApplicationsPanel = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [zoomImg, setZoomImg] = useState(null);
  const [phTime, setPhTime] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const APPLICATIONS_PER_PAGE = 5;

  const fetchApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3001/api/membership-applications');
      const data = await res.json();
      if (data.success) setApplications(data.applications);
      else setError('Failed to fetch applications.');
    } catch (err) {
      setError('Failed to fetch applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const phDate = now.toLocaleString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setPhTime(phDate);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter out expired approved memberships and rejected applications
  const filteredApplications = applications.filter(app => {
    if (app.status === 'rejected') return false;
    if (app.status === 'approved' && app.expirationDate) {
      return new Date(app.expirationDate) > new Date();
    }
    return app.status !== 'approved' || !app.expirationDate;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredApplications.length / APPLICATIONS_PER_PAGE);
  const startIndex = (currentPage - 1) * APPLICATIONS_PER_PAGE;
  const endIndex = startIndex + APPLICATIONS_PER_PAGE;
  const currentApplications = filteredApplications.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleAction = async (id, action) => {
    setActionLoading(id + action);
    try {
      const res = await fetch(`http://localhost:3001/api/membership-application/${id}/${action}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setApplications(applications => applications.map(app => app._id === id ? data.application : app));
      } else {
        alert(data.message || 'Action failed.');
      }
    } catch (err) {
      alert('Action failed.');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', padding: 24, margin: '0 auto', maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ fontWeight: 'bold', fontSize: 22, color: '#181818', letterSpacing: 1, margin: 0 }}>All Membership Applications</h3>
        <div style={{ fontWeight: 'bold', fontSize: 16, color: '#2ecc40', minWidth: 320, textAlign: 'right' }}>{phTime}</div>
      </div>
{loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div style={{ color: 'red' }}>{error}</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}>
              <thead>
                <tr style={{ background: '#f8f8f8', color: '#222', fontWeight: 700 }}>
                  <th style={{ padding: 10, borderBottom: '2px solid #eee' }}>Name</th>
                  <th style={{ padding: 10, borderBottom: '2px solid #eee' }}>Email</th>
                  <th style={{ padding: 10, borderBottom: '2px solid #eee' }}>Date</th>
                  <th style={{ padding: 10, borderBottom: '2px solid #eee' }}>Status</th>
                  <th style={{ padding: 10, borderBottom: '2px solid #eee' }}>Start Date</th>
                  <th style={{ padding: 10, borderBottom: '2px solid #eee' }}>End Date</th>
                  <th style={{ padding: 10, borderBottom: '2px solid #eee' }}>Proof of Payment</th>
                  <th style={{ padding: 10, borderBottom: '2px solid #eee' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#888' }}>No applications found.</td></tr>
                )}
                {currentApplications.map(app => (
                  <tr key={app._id} style={{ background: app.status === 'approved' ? '#eaffea' : app.status === 'rejected' ? '#ffeaea' : '#fff' }}>
                    <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>{app.name}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>{app.email}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>{new Date(app.date).toLocaleString()}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid #eee', fontWeight: 600, color: app.status === 'approved' ? '#2ecc40' : app.status === 'rejected' ? '#e74c3c' : '#f39c12' }}>{app.status.charAt(0).toUpperCase() + app.status.slice(1)}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>{app.startDate ? new Date(app.startDate).toLocaleString() : '-'}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>{app.expirationDate ? new Date(app.expirationDate).toLocaleString() : '-'}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                      {app.proof ? (
                        <img 
                          src={app.proof} 
                          alt="Proof of Payment" 
                          style={{ maxWidth: 80, maxHeight: 80, borderRadius: 8, border: '1px solid #eee', cursor: 'zoom-in' }} 
                          onClick={() => setZoomImg(app.proof)}
                        />
                      ) : <span style={{ color: '#bbb' }}>No image</span>}
                    </td>
                    <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                      {app.status === 'pending' ? (
                        <>
                          <button onClick={() => handleAction(app._id, 'approve')} disabled={actionLoading === app._id + 'approve'} style={{ background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 5, padding: '7px 18px', fontWeight: 600, marginRight: 8, cursor: 'pointer' }}>Approve</button>
                          <button onClick={() => handleAction(app._id, 'reject')} disabled={actionLoading === app._id + 'reject'} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 5, padding: '7px 18px', fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                        </>
                      ) : (
                        <span style={{ color: '#888' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {filteredApplications.length > APPLICATIONS_PER_PAGE && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, padding: '0 10px' }}>
              <div style={{ fontSize: 14, color: '#666' }}>
                Showing {startIndex + 1}-{Math.min(endIndex, filteredApplications.length)} of {filteredApplications.length} applications
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button 
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  style={{
                    background: currentPage === 1 ? '#f5f5f5' : '#2ecc40',
                    color: currentPage === 1 ? '#999' : '#fff',
                    border: 'none',
                    borderRadius: 5,
                    padding: '8px 16px',
                    fontWeight: 600,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>
                <span style={{ fontSize: 14, color: '#666', margin: '0 10px' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  style={{
                    background: currentPage === totalPages ? '#f5f5f5' : '#2ecc40',
                    color: currentPage === totalPages ? '#999' : '#fff',
                    border: 'none',
                    borderRadius: 5,
                    padding: '8px 16px',
                    fontWeight: 600,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {/* Zoom Modal */}
      {zoomImg && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setZoomImg(null)}>
          <div style={{ position: 'relative', background: 'none', padding: 24, borderRadius: 16, boxShadow: '0 4px 32px rgba(0,0,0,0.25)', backgroundColor: '#fff' }} onClick={e => e.stopPropagation()}>
            <img src={zoomImg} alt="Proof of Payment" style={{ maxWidth: 540, maxHeight: 540, borderRadius: 12, display: 'block', margin: '0 auto' }} />
            <button onClick={() => setZoomImg(null)} style={{ position: 'absolute', top: 10, right: 10, background: '#fff', color: '#181818', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 20, fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>&times;</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembershipApplicationsPanel; 
