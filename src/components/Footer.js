import React, { useEffect, useState } from 'react';
import '../designs/footer.css';

const Footer = () => {
  const [footer, setFooter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFooter = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/footer');
      const data = await res.json();
      setFooter(data);
    } catch (err) {
      setError('Failed to load footer.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFooter();
  }, []);

  useEffect(() => {
    // Listen for footer updates
    const handleFooterUpdated = () => {
      fetchFooter();
    };
    window.addEventListener('footerUpdated', handleFooterUpdated);

    return () => {
      window.removeEventListener('footerUpdated', handleFooterUpdated);
    };
  }, []);

  if (loading) return <footer className="footer"><div className="footer-content"><p>Loading footer...</p></div></footer>;
  if (error || !footer) return <footer className="footer"><div className="footer-content"><p>{error || 'No footer data.'}</p></div></footer>;

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>{footer.title}</h3>
          <p>{footer.description}</p>
        </div>
        <div className="footer-section">
          <h3>Contact Us</h3>
          <p><span className="emoji">📍</span>{footer.contact.address}</p>
          <p><span className="emoji">📞</span>{footer.contact.phone}</p>
          <p><span className="emoji">📧</span>{footer.contact.email}</p>
        </div>
        <div className="footer-section">
          <h3>Follow Us</h3>
          <br />
          <div className="social-links" style={{ marginTop: 0 }}>
            {footer.social.facebook && <a href={footer.social.facebook} className="social-link" target="_blank" rel="noopener noreferrer"><i className="fa fa-facebook-f"></i></a>}
            {footer.social.instagram && <a href={footer.social.instagram} className="social-link" target="_blank" rel="noopener noreferrer"><i className="fa fa-instagram"></i></a>}
            {footer.social.youtube && <a href={footer.social.youtube} className="social-link" target="_blank" rel="noopener noreferrer"><i className="fa fa-youtube"></i></a>}
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} {footer.title}. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer; 