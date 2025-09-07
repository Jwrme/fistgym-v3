import React, { useEffect, useState } from 'react';
import { FaFacebook, FaInstagram, FaYoutube, FaPhoneAlt, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';
import { FaFacebookMessenger } from 'react-icons/fa6';

const socialLinks = [
  { icon: 'messenger', label: 'Talk to Us', url: '#' },
  { icon: 'facebook', label: 'Like/Follow Us on Facebook', url: '#' },
  { icon: 'instagram', label: 'Follow Us on Instagram', url: '#' },
  { icon: 'youtube', label: 'Subscribe to our YouTube', url: '#' },
];

const iconMap = {
  phone: <FaPhoneAlt style={{ color: '#2ecc40', fontSize: 20, verticalAlign: 'middle' }} />,
  email: <FaEnvelope style={{ color: '#2ecc40', fontSize: 20, verticalAlign: 'middle' }} />,
  location: <FaMapMarkerAlt style={{ color: '#2ecc40', fontSize: 22, verticalAlign: 'middle' }} />,
  messenger: <FaFacebookMessenger style={{ color: '#2ecc40', fontSize: 20, verticalAlign: 'middle' }} />,
  facebook: <FaFacebook style={{ color: '#2ecc40', fontSize: 20, verticalAlign: 'middle' }} />,
  instagram: <FaInstagram style={{ color: '#2ecc40', fontSize: 20, verticalAlign: 'middle' }} />,
  youtube: <FaYoutube style={{ color: '#2ecc40', fontSize: 20, verticalAlign: 'middle' }} />
};

export default function Contact() {
  const [contactInfo, setContactInfo] = useState({ phone: '', email: '', address: '', social: { messenger: '', facebook: '', instagram: '', youtube: '' }, mapEmbedUrl: '' });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchContactInfo = () => {
      setLoading(true);
      fetch('http://localhost:3001/api/contact-info')
        .then(res => res.json())
        .then(data => { setContactInfo(data); setLoading(false); })
        .catch(() => setLoading(false));
    };
    fetchContactInfo();
    const handleUpdate = () => fetchContactInfo();
    window.addEventListener('contactInfoUpdated', handleUpdate);
    return () => window.removeEventListener('contactInfoUpdated', handleUpdate);
  }, []);
  if (loading) return <div style={{ color: '#2ecc40', textAlign: 'center', marginTop: 80 }}>Loading contact info...</div>;
  return (
    <>
      <style>{`
        .contact-heading {
          color: #2ecc40;
          font-size: 2.7rem;
          font-weight: bold;
          text-align: center;
          letter-spacing: 3px;
          margin-bottom: 0.5rem;
          margin-top: 0.5rem;
        }
        .contact-heading-underline {
          width: 90px;
          height: 6px;
          background: linear-gradient(90deg, #2ecc40 60%, #27ae60 100%);
          border-radius: 6px;
          margin: 0 auto 36px auto;
          box-shadow: 0 0 16px #2ecc40a0;
        }
        .contact-row {
          display: flex;
          flex-direction: row;
          gap: 0;
          justify-content: center;
          align-items: stretch;
          max-width: 1200px;
          width: 100%;
          height: 420px;
          min-height: 420px;
          margin: 0 auto;
          position: relative;
          background: none;
        }
        .contact-card {
          background: linear-gradient(135deg, #1a1f1a 80%, #232b23 100%);
          border-radius: 22px;
          border: 2px solid #2ecc40;
          box-shadow: 0 0 24px 2px #2ecc40a0, 0 4px 24px rgba(0,0,0,0.18);
          min-width: 320px;
          max-width: 370px;
          flex: 1;
          color: #fff;
          margin: 0 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 420px;
          padding: 48px 36px 44px 36px;
        }
        .contact-separator {
          width: 8px;
          min-width: 8px;
          max-width: 8px;
          height: 80%;
          background: linear-gradient(180deg, #2ecc40 0%, #27ae60 100%);
          border-radius: 8px;
          box-shadow: 0 0 24px 6px #2ecc40a0;
          margin: 0 16px;
          align-self: center;
        }
        .contact-card h2 {
          color: #2ecc40;
          font-weight: bold;
          font-size: 2rem;
          margin-bottom: 28px;
          letter-spacing: 2px;
          text-align: center;
        }
        .contact-card ul, .contact-card .contact-details {
          width: 100%;
        }
        .contact-card ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
          font-size: 1.15rem;
        }
        .contact-card li, .contact-card .contact-details > div {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .contact-card .contact-details > div {
          margin-bottom: 12px;
        }
        .contact-card .contact-details > div:last-child {
          margin-bottom: 0;
        }
        .contact-card .contact-details > div:last-child {
          margin-bottom: 0;
        }
        .contact-card iframe {
          border-radius: 16px;
          border: none;
          box-shadow: 0 0 12px #2ecc40a0;
          width: 320px;
          height: 240px;
          margin: 0 auto;
          display: block;
        }
        @media (max-width: 1100px) {
          .contact-row {
            gap: 0;
            height: auto;
            min-height: unset;
          }
          .contact-card {
            min-width: 260px;
            min-height: 320px;
            height: 100%;
            padding: 32px 12px 32px 12px;
          }
          .contact-separator {
            margin: 0 8px;
            height: 60%;
          }
        }
        @media (max-width: 900px) {
          .contact-row {
            flex-direction: column;
            align-items: center;
            gap: 32px;
            min-height: unset;
            height: auto;
          }
          .contact-separator {
            display: none;
          }
          .contact-card {
            margin: 16px 0;
            min-height: 320px;
            height: auto;
          }
        }
        .contact-social-link {
          color: #fff;
          text-decoration: none;
          transition: color 0.18s, text-shadow 0.18s;
          font-weight: 500;
          font-size: 1.08rem;
        }
        .contact-social-link:hover {
          color: #39ff6a;
          text-shadow: 0 0 8px #39ff6a, 0 0 2px #2ecc40;
        }
      `}</style>
      <div style={{ background: '#181818', minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '40px 0 40px 0' }}>
        <div style={{ marginTop: '60px' }}>
          <div className="contact-heading">CONTACT US</div>
          <div className="contact-heading-underline"></div>
        </div>
        <div className="contact-row" style={{ marginTop: '24px' }}>
          {/* Contact Info */}
          <div className="contact-card">
            <h2>OUR CONTACT</h2>
            <div className="contact-details" style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: '1.15rem', width: '100%' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {iconMap.phone} <span style={{marginLeft:8}}><a href={`tel:${contactInfo.phone || ''}`} className="contact-social-link">{contactInfo.phone}</a></span>
                </li>
                <li style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {iconMap.email} <span style={{marginLeft:8}}><a href={`mailto:${contactInfo.email || ''}`} className="contact-social-link">{contactInfo.email}</a></span>
                </li>
              </ul>
            </div>
          </div>
          {/* Separator */}
          <div className="contact-separator"></div>
          {/* Social Links */}
          <div className="contact-card">
            <h2>OUR SOCIALS</h2>
            <ul>
              {['messenger', 'facebook', 'instagram', 'youtube'].map(key => {
                const soc = contactInfo.social?.[key];
                if (!soc || !soc.url) return null;
                return (
                  <li key={key}>
                    {iconMap[key]} <a href={soc.url} className="contact-social-link" target="_blank" rel="noopener noreferrer">{soc.label || key.charAt(0).toUpperCase() + key.slice(1)}</a>
                  </li>
                );
              })}
            </ul>
          </div>
          {/* Separator */}
          <div className="contact-separator"></div>
          {/* Google Map */}
          <div className="contact-card" style={{ padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <iframe
              title="Google Map"
              src={contactInfo.mapEmbedUrl || ''}
              style={{ border: 0, borderRadius: 16, margin: 0, width: '320px', height: '240px', display: 'block' }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </div>
    </>
  );
} 
