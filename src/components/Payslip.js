import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Payslip = () => {
  const [coach, setCoach] = useState(null);
  const [payslip, setPayslip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get coach info from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.userType !== 'coach') {
      setError('Access denied. Payslip is for coaches only.');
      setLoading(false);
      return;
    }
    setCoach(user);
    fetchPayslip(user._id);
  }, []);

  const fetchPayslip = async (coachId) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/payroll/payslip/${coachId}`);
      if (!res.ok) throw new Error('Failed to fetch payslip');
      const data = await res.json();
      setPayslip(data);
    } catch (err) {
      setError('Error fetching payslip.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading payslip...</div>;
  if (error) return <div style={{ padding: 40, color: 'red' }}>{error}</div>;
  if (!payslip) return <div style={{ padding: 40 }}>No payslip data found.</div>;

  return (
    <>
      <section className="hero" style={{
        background: "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/images/cage22.png') center/cover no-repeat"
      }}>
        <h1>PAYSLIP</h1>
        <p>View your salary breakdown and class earnings.</p>
      </section>
      <div style={{ minHeight: '100vh', background: '#fff', paddingTop: 40 }}>
        <div style={{ maxWidth: 700, margin: '0 auto', marginTop: 40 }}></div>
        <div style={{ maxWidth: 700, margin: '0 auto', marginTop: 16, background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', padding: 32, border: '1px solid #eee' }}>
          <Link to="/" className="return-home" style={{ display: 'block', marginBottom: 16, textAlign: 'left' }}>&larr; RETURN HOME</Link>
          <h2 style={{ color: '#145a32', fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>Payslip</h2>
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <strong>Coach:</strong> {coach.firstname} {coach.lastname}<br />
            <strong>Period:</strong> {new Date(payslip.periodStart).toLocaleDateString()} - {new Date(payslip.periodEnd).toLocaleDateString()}
          </div>
          <div style={{ marginBottom: 16, fontWeight: 'bold', color: '#145a32', textAlign: 'center' }}>
            Total Salary: ₱{(payslip.coachShare || 0).toLocaleString()}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ background: '#f8f8f8' }}>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Class</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Date</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Clients</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Revenue</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Coach Share (50%)</th>
              </tr>
            </thead>
            <tbody>
              {payslip.classBreakdown && payslip.classBreakdown.map((c, i) => (
                <tr key={i}>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{c.className}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{new Date(c.date).toLocaleDateString()}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{c.clientCount}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>₱{c.revenue.toLocaleString()}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>₱{c.coachShare.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ color: '#888', fontSize: 14, textAlign: 'center' }}>
            Note: This payslip only shows your salary. Gym earnings are not shown here.
          </div>
        </div>
      </div>
    </>
  );
};

export default Payslip; 