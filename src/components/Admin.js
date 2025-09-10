import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Payroll from './Payroll';
import FinancialAnalyticsDashboard from './FinancialAnalyticsDashboard';
import '../designs/admin.css';
import { FaEye, FaEyeSlash, FaChalkboardTeacher, FaMoneyBillWave, FaEnvelope, FaUser, FaUserAlt, FaLock, FaTrophy, FaFileVideo, FaFileImage, FaAlignLeft, FaRegEdit, FaHeading, FaMapMarkerAlt, FaPhoneAlt, FaFacebook, FaInstagram, FaYoutube, FaGift, FaCheckCircle, FaTimesCircle, FaFacebookMessenger, FaChartLine, FaLink, FaImage } from 'react-icons/fa';
import Modal from './Modal';
import HomeSettings from './HomeSettings';
import MembershipApplicationsPanel from './MembershipApplicationsPanel';

// Place this at the top, before the Admin component:
function EmailTemplateEditor() {
  const [subject, setSubject] = React.useState('');
  const [logoUrl, setLogoUrl] = React.useState('');
  const [body, setBody] = React.useState('');
  const [buttonText, setButtonText] = React.useState('');
  const [buttonLink, setButtonLink] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [logoFile, setLogoFile] = React.useState(null);

  React.useEffect(() => {
    fetch('http://localhost:3001/api/email-template/membership-approval')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.template) {
          setSubject(data.template.subject || '');
          setLogoUrl(data.template.logoUrl || '');
          setBody(data.template.body || '');
          setButtonText(data.template.buttonText || '');
          setButtonLink(data.template.buttonLink || '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new window.FileReader();
    reader.onloadend = () => {
      setLogoUrl(reader.result);
      setLogoFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUrlChange = (e) => {
    setLogoUrl(e.target.value);
    setLogoFile(null);
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    setLogoFile(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    const res = await fetch('http://localhost:3001/api/email-template/membership-approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, logoUrl, body, buttonText, buttonLink })
    });
    const data = await res.json();
    if (data.success) setMessage('Saved!');
    else setMessage('Error saving.');
    setSaving(false);
  };

  return loading ? <div>Loading...</div> : (
    <form onSubmit={handleSave} style={{ maxWidth: 520, margin: '40px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', padding: 32 }}>
      <h2 style={{ fontSize: 26, marginBottom: 18, color: '#181818', fontWeight: 700 }}>Membership Approval Email Template</h2>
      <label style={{ fontWeight: 600 }}>Subject</label>
      <input type="text" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%', marginBottom: 14, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
      <label style={{ fontWeight: 600 }}>Logo/Image URL or Upload</label>
      <input type="text" value={logoUrl} onChange={handleLogoUrlChange} placeholder="Paste image URL or upload below" style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
      <input type="file" accept="image/*" onChange={handleLogoFileChange} style={{ marginBottom: 8 }} />
      {logoUrl && (
        <div style={{ marginBottom: 8 }}>
          <img src={logoUrl} alt="Logo Preview" style={{ height: 48, borderRadius: 6, border: '1px solid #eee', background: '#fafafa', marginRight: 10 }} />
          <button type="button" onClick={handleRemoveLogo} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer', marginLeft: 8 }}>Remove Logo Image</button>
        </div>
      )}
      <label style={{ fontWeight: 600 }}>Body (use {'{name}'} for user name)</label>
      <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} style={{ width: '100%', marginBottom: 14, padding: 8, borderRadius: 4, border: '1px solid #ccc', fontFamily: 'inherit' }} />
      <label style={{ fontWeight: 600 }}>Button Text</label>
      <input type="text" value={buttonText} onChange={e => setButtonText(e.target.value)} style={{ width: '100%', marginBottom: 14, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
      <label style={{ fontWeight: 600 }}>Button Link</label>
      <input type="text" value={buttonLink} onChange={e => setButtonLink(e.target.value)} style={{ width: '100%', marginBottom: 18, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
      <button type="submit" disabled={saving} style={{ background: '#2ecc40', color: '#fff', fontWeight: 'bold', fontSize: 16, padding: '10px 32px', border: 'none', borderRadius: 6, cursor: 'pointer', letterSpacing: 1, marginBottom: 18 }}>{saving ? 'Saving...' : 'Save Template'}</button>
      {message && <div style={{ color: '#2ecc40', fontWeight: 600, marginBottom: 18 }}>{message}</div>}
      <div style={{ borderTop: '1px solid #eee', marginTop: 18, paddingTop: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Preview:</div>
        <div style={{ background: '#f4f6f8', borderRadius: 8, padding: 24, textAlign: 'center' }}>
          {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: 48, marginBottom: 8 }} />}
          <h2 style={{ fontSize: 22, color: '#181818', margin: '18px 0 10px 0' }}>{subject}</h2>
          <div style={{ color: '#222', fontSize: 16, marginBottom: 18 }} dangerouslySetInnerHTML={{ __html: body.replace('{name}', '<b>Juan Dela Cruz</b>') }} />
          {buttonText && buttonLink && <a href={buttonLink} style={{ display: 'inline-block', marginTop: 8, padding: '12px 32px', background: '#2ecc40', color: '#fff', fontWeight: 'bold', fontSize: 16, borderRadius: 6, textDecoration: 'none', letterSpacing: 1 }}>{buttonText}</a>}
        </div>
      </div>
    </form>
  );
}

function BookingEmailTemplateEditor() {
  const [logoUrl, setLogoUrl] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [logoFile, setLogoFile] = React.useState(null);

  React.useEffect(() => {
    fetch('http://localhost:3001/api/email-template/booking-approval')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.template) {
          setLogoUrl(data.template.logoUrl || '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new window.FileReader();
    reader.onloadend = () => {
      setLogoUrl(reader.result);
      setLogoFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUrlChange = (e) => {
    setLogoUrl(e.target.value);
    setLogoFile(null);
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    setLogoFile(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    
    try {
      console.log('Saving logo URL:', logoUrl);
      const res = await fetch('http://localhost:3001/api/email-template/booking-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl })
      });
      
      const data = await res.json();
      console.log('Save response:', data);
      
      if (data.success) {
        setMessage('✅ Logo saved successfully to database!');
        console.log('✅ Logo saved to database');
        // Reload the template to confirm it was saved
        setTimeout(() => {
          fetch('http://localhost:3001/api/email-template/booking-approval')
            .then(res => res.json())
            .then(data => {
              if (data.success && data.template) {
                setLogoUrl(data.template.logoUrl || '');
                console.log('✅ Template reloaded, logo URL:', data.template.logoUrl);
              }
            });
        }, 1000);
      } else {
        setMessage('❌ Error saving logo: ' + (data.error || 'Unknown error'));
        console.error('❌ Error saving logo:', data.error);
      }
    } catch (error) {
      console.error('❌ Network error saving logo:', error);
      setMessage('Network error saving logo.');
    } finally {
      setSaving(false);
    }
  };

  return loading ? <div>Loading...</div> : (
    <form onSubmit={handleSave} style={{ maxWidth: 520, margin: '40px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', padding: 32 }}>
      <h2 style={{ fontSize: 26, marginBottom: 18, color: '#181818', fontWeight: 700 }}>Booking Approval Email Template</h2>
      
      <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#333', fontSize: 18 }}>ℹ️ Fully Automatic Email System</h3>
        <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: 14 }}>The system automatically generates:</p>
        <ul style={{ margin: '8px 0', color: '#666', fontSize: 14, paddingLeft: 20 }}>
          <li>Email subject (e.g., "Booking Confirmed! Boxing with Coach Alan - SenJitsu/Fist Gym")</li>
          <li>User's name</li>
          <li>Coach name</li>
          <li>Class type</li>
          <li>Date and time</li>
          <li>Booking amount</li>
          <li>Complete email message</li>
        </ul>
        <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: 14 }}>You only need to set your logo below.</p>
      </div>

      <label style={{ fontWeight: 600 }}>Your Logo/Image</label>
      <input type="text" value={logoUrl} onChange={handleLogoUrlChange} placeholder="Paste image URL or upload below" style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
      <input type="file" accept="image/*" onChange={handleLogoFileChange} style={{ marginBottom: 8 }} />
      {logoUrl && (
        <div style={{ marginBottom: 8 }}>
          <img src={logoUrl} alt="Logo Preview" style={{ height: 48, borderRadius: 6, border: '1px solid #eee', background: '#fafafa', marginRight: 10 }} />
          <button type="button" onClick={handleRemoveLogo} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer', marginLeft: 8 }}>Remove Logo Image</button>
        </div>
      )}
      
      <button type="submit" disabled={saving} style={{ 
        background: saving ? '#ccc' : '#2ecc40', 
        color: '#fff', 
        fontWeight: 'bold', 
        fontSize: 16, 
        padding: '10px 32px', 
        border: 'none', 
        borderRadius: 6, 
        cursor: saving ? 'not-allowed' : 'pointer', 
        letterSpacing: 1, 
        marginBottom: 18 
      }}>
        {saving ? '🔄 Saving to Database...' : '💾 Save Logo to Database'}
      </button>
      {message && (
        <div style={{ 
          color: message.includes('✅') ? '#2ecc40' : '#e74c3c', 
          fontWeight: 600, 
          marginBottom: 18,
          padding: '8px 12px',
          borderRadius: '4px',
          background: message.includes('✅') ? '#e8f5e8' : '#fde8e8'
        }}>
          {message}
        </div>
      )}
      
      <div style={{ borderTop: '1px solid #eee', marginTop: 18, paddingTop: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Email Preview:</div>
        <div style={{ background: '#f4f6f8', borderRadius: 8, padding: 24, textAlign: 'center' }}>
          {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: 48, marginBottom: 8 }} />}
          <h2 style={{ fontSize: 22, color: '#181818', margin: '18px 0 10px 0' }}>Booking Confirmed! Boxing with Coach Alan - SenJitsu/Fist Gym</h2>
          <div style={{ color: '#222', fontSize: 16, marginBottom: 18 }}>
            <p>Congratulations <b>Juan Dela Cruz</b>! Your booking for <b>Boxing</b> with <b>Coach Alan</b> on <b>Monday, January 15, 2025</b> at <b>10:00 AM - 11:00 AM</b> has been confirmed. We look forward to seeing you!</p>
            <div style={{ background: '#fff', borderRadius: 8, padding: 16, margin: '16px 0', textAlign: 'left' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>Booking Details:</h4>
              <p style={{ margin: '4px 0', color: '#666' }}><strong>Class:</strong> Boxing</p>
              <p style={{ margin: '4px 0', color: '#666' }}><strong>Coach:</strong> Coach Alan</p>
              <p style={{ margin: '4px 0', color: '#666' }}><strong>Date:</strong> Monday, January 15, 2025</p>
              <p style={{ margin: '4px 0', color: '#666' }}><strong>Time:</strong> 10:00 AM - 11:00 AM</p>
              <p style={{ margin: '4px 0', color: '#666' }}><strong>Amount:</strong> ₱500</p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

function EmailBrandEditor() {
  const [brandName, setBrandName] = React.useState('');
  const [logoUrl, setLogoUrl] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [logoFile, setLogoFile] = React.useState(null);

  React.useEffect(() => {
    fetch('http://localhost:3001/api/email-brand')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.brand) {
          setBrandName(data.brand.brandName || '');
          setLogoUrl(data.brand.logoUrl || '');
          setAddress(data.brand.address || '');
        } else {
          console.error('Failed to load email brand:', data.error);
          setMessage('Failed to load settings');
        }
      })
      .catch(error => {
        console.error('Load error:', error);
        setMessage('Network error loading settings');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new window.FileReader();
    reader.onloadend = () => { setLogoUrl(reader.result); setLogoFile(file); };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMessage('');
    try {
      const res = await fetch('http://localhost:3001/api/email-brand', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName, logoUrl, address })
      });
      const data = await res.json();
      setSaving(false);
      if (data.success) {
        setMessage('Saved!');
      } else {
        setMessage(`Error: ${data.error || 'Failed to save'}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaving(false);
      setMessage('Network error. Please try again.');
    }
  };

  return loading ? <div>Loading...</div> : (
    <form onSubmit={handleSave} style={{ maxWidth: 520, margin: '40px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', padding: 32 }}>
      <h2 style={{ fontSize: 26, marginBottom: 18, color: '#181818', fontWeight: 700 }}>Email Branding</h2>
      <label style={{ fontWeight: 600 }}>Brand Name</label>
      <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} style={{ width: '100%', marginBottom: 14, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
      <label style={{ fontWeight: 600 }}>Brand Address</label>
      <input type="text" value={address} onChange={e => setAddress(e.target.value)} style={{ width: '100%', marginBottom: 14, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
      <label style={{ fontWeight: 600 }}>Logo/Image URL or Upload</label>
      <input type="text" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="Paste image URL or upload below" style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
      <input type="file" accept="image/*" onChange={handleLogoFileChange} style={{ marginBottom: 8 }} />
      {logoUrl && <img src={logoUrl} alt="Logo Preview" style={{ height: 48, borderRadius: 6, border: '1px solid #eee', background: '#fafafa', marginBottom: 8 }} />}
      <button type="submit" disabled={saving} style={{ background: '#2ecc40', color: '#fff', fontWeight: 'bold', fontSize: 16, padding: '10px 32px', border: 'none', borderRadius: 6, cursor: 'pointer', letterSpacing: 1 }}>
        {saving ? 'Saving...' : 'Save'}
      </button>
      {message && <div style={{ color: '#2ecc40', fontWeight: 600, marginTop: 12 }}>{message}</div>}
      <div style={{ borderTop: '1px solid #eee', marginTop: 18, paddingTop: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Preview:</div>
        <div style={{ background: '#f4f6f8', borderRadius: 8, padding: 24, textAlign: 'center' }}>
          {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: 48, marginBottom: 8 }} />}
          <h2 style={{ fontSize: 20, margin: '0 0 10px 0' }}>{brandName} Verification</h2>
          <div style={{ color: '#6b7280', fontSize: 12 }}>{address}</div>
        </div>
      </div>
    </form>
  );
}



const Admin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('rates');
  const [fullName, setFullName] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [title, setTitle] = useState('');
  const [classes, setClasses] = useState('');
  const [biography, setBiography] = useState('');
  const [profilePic, setProfilePic] = useState(''); // To store base64 image
  const [message, setMessage] = useState('');
  const [rates, setRates] = useState([]); // State to hold rates
  const [promos, setPromos] = useState([]); // State to hold promos
  const [classList, setClassList] = useState([]); // State to hold actual classes list

  // New state for Add Class Form
  const [newClassName, setNewClassName] = useState('');
  const [newClassDescription, setNewClassDescription] = useState('');
  const [newClassVideo, setNewClassVideo] = useState(''); // 🔥 Keep for preview only
  const [newClassVideoUrl, setNewClassVideoUrl] = useState(''); // 🔥 URL input for saving
  const [newClassVideoFile, setNewClassVideoFile] = useState('');
  const newClassVideoInputRef = useRef(null);
  const [classMessage, setClassMessage] = useState(''); // Message for class form
  const [newClassImage, setNewClassImage] = useState(''); // 🔥 Keep for preview only
  const [newClassImageUrl, setNewClassImageUrl] = useState(''); // 🔥 URL input for saving
  const newClassImageInputRef = useRef(null);

  // New state for Add Rate Form
  const [newRateClassName, setNewRateClassName] = useState('');
  const [newRatePrice, setNewRatePrice] = useState('');
  const [newRateImageUrl, setNewRateImageUrl] = useState(''); // 🔥 ONLY URL input now
  const [newRateInfo, setNewRateInfo] = useState(''); // ADD THIS
  const [rateMessage, setRateMessage] = useState(''); // Message for rate form

  // New state for Add Promo Form
  const [newPromoName, setNewPromoName] = useState('');
  const [newPromoPrice, setNewPromoPrice] = useState('');
  const [newPromoImage, setNewPromoImage] = useState(''); // 🔥 Keep for preview only
  const [newPromoImageUrl, setNewPromoImageUrl] = useState(''); // 🔥 URL input for saving
  const [newPromoInfo, setNewPromoInfo] = useState(''); // ADD THIS
  const [promoMessage, setPromoMessage] = useState(''); // Message for promo form

  // Add these states at the top, after other useState hooks
  const [editingRate, setEditingRate] = useState(null);
  const [editRateImageUrl, setEditRateImageUrl] = useState(''); // 🔥 ONLY URL input for edit
  const [editRateName, setEditRateName] = useState('');
  const [editRatePrice, setEditRatePrice] = useState('');
  const [editRateInfo, setEditRateInfo] = useState(''); // ADD THIS



  // Add promo edit states
  const [editingPromo, setEditingPromo] = useState(null);
  const [editPromoName, setEditPromoName] = useState('');
  const [editPromoPrice, setEditPromoPrice] = useState('');
  const [editPromoImageUrl, setEditPromoImageUrl] = useState(''); // 🔥 ONLY URL input for edit
  const [editPromoInfo, setEditPromoInfo] = useState(''); // ADD THIS



  // Add class edit states
  const [editingClass, setEditingClass] = useState(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassDescription, setEditClassDescription] = useState('');
  const [editClassVideoUrl, setEditClassVideoUrl] = useState(''); // 🔥 ONLY URL input for edit
  const [editClassImageUrl, setEditClassImageUrl] = useState(''); // 🔥 ONLY URL input for edit

  // Add new coach states
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [bio, setBio] = useState("");
  const [password, setPassword] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [belt, setBelt] = useState("");

  const [coaches, setCoaches] = useState([]);
  const [coachesLoading, setCoachesLoading] = useState(true);
  const [coachesError, setCoachesError] = useState("");
  const [editingCoach, setEditingCoach] = useState(null);
  const [editCoachData, setEditCoachData] = useState({});
  const [editCoachSpecialties, setEditCoachSpecialties] = useState("");
  const [editCoachBelt, setEditCoachBelt] = useState("");

  const editCoachImageInputRef = useRef(null);

  const [showCoachPassword, setShowCoachPassword] = useState(false);

  // Add new state for footer editing
  const [footerData, setFooterData] = useState({
    title: '',
    description: '',
    contact: { address: '', phone: '', email: '' },
    social: { facebook: '', instagram: '', youtube: '' }
  });
  const [footerMessage, setFooterMessage] = useState('');

  // Add state for proRecord
  const [proRecord, setProRecord] = useState("");

  // Add state for proRecordWins and proRecordLosses
  const [proRecordWins, setProRecordWins] = useState("");
  const [proRecordLosses, setProRecordLosses] = useState("");

  // Add a regex pattern for pro record (e.g., 10 - 2)
  const proRecordPattern = /^\d+\s*-?\s*\d+$/;

  // Add state for editProRecordWins and editProRecordLosses for the Edit Coach form
  const [editProRecordWins, setEditProRecordWins] = useState("");
  const [editProRecordLosses, setEditProRecordLosses] = useState("");

  // Add toast state
  const [toast, setToast] = useState("");

  // Add state for home content editing
  const [homeContent, setHomeContent] = useState({ title: '', subtitle: '', background: '', classesTitle: '', classesBg: '' });
  const [homeMessage, setHomeMessage] = useState('');

  // At the top, after other useState hooks
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

  const [promoSettings, setPromoSettings] = useState({ heading: '', banner: '' });
  const [promoSettingsMessage, setPromoSettingsMessage] = useState('');

  const [ratesSettings, setRatesSettings] = useState({ heading: '', banner: '' });
  const [ratesSettingsMessage, setRatesSettingsMessage] = useState('');

  const [siteSettings, setSiteSettings] = useState({ logoText: 'SenJitsu' });
  const [siteSettingsMessage, setSiteSettingsMessage] = useState('');

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
    classMembershipQrCodes: {
      'Boxing': '/images/gcashqr.png',
      'Muay Thai': '/images/gcashqr.png',
      'Kali': '/images/gcashqr.png',
      'Jiu Jitsu Adults': '/images/gcashqr.png',
      'Jiu Jitsu Kids': '/images/gcashqr.png',
      'MMA': '/images/gcashqr.png',
      'Judo': '/images/gcashqr.png',
      'Wrestling': '/images/gcashqr.png'
    },
    classPackageQrCodes: {
      'Boxing': '/images/gcashqr.png',
      'Muay Thai': '/images/gcashqr.png',
      'Kali': '/images/gcashqr.png',
      'Jiu Jitsu Adults': '/images/gcashqr.png',
      'Jiu Jitsu Kids': '/images/gcashqr.png',
      'MMA': '/images/gcashqr.png',
      'Judo': '/images/gcashqr.png',
      'Wrestling': '/images/gcashqr.png'
    },
    packagePricing: {
      'Boxing': { sessions: 10, price: 2500 },
      'Muay Thai': { sessions: 10, price: 3000 },
      'Kali': { sessions: 4, price: 1400 },
      'Jiu Jitsu Adults': { sessions: 12, price: 2500 },
      'Jiu Jitsu Kids': { sessions: 4, price: 1600 },
      'MMA': { sessions: 4, price: 1400 },
      'Judo': { sessions: 4, price: 1600 },
      'Wrestling': { sessions: 4, price: 1600 }
    },
    membershipRate: 1000,
    membershipQrCode: '/images/gcashqr.png' 
  });
  const [paymentSettingsMessage, setPaymentSettingsMessage] = useState('');
  const [classQrCodeImages, setClassQrCodeImages] = useState({});
  const [classMembershipQrCodeImages, setClassMembershipQrCodeImages] = useState({});
  const [classPackageQrCodeImages, setClassPackageQrCodeImages] = useState({});
  const [membershipQrCodeImage, setMembershipQrCodeImage] = useState('');
  const classQrCodeInputRefs = useRef({});

  const [editClassImage, setEditClassImage] = useState('');

  // Attendance state
  const [attendance, setAttendance] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const today = new Date();
  today.setHours(0,0,0,0);

  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attendanceHistoryUser, setAttendanceHistoryUser] = useState(null);
  const [phTime, setPhTime] = useState('');
  const [historyFilterDate, setHistoryFilterDate] = useState('');

  const [logoImage, setLogoImage] = useState("");
  const [logoImagePreview, setLogoImagePreview] = useState("");
  const logoImageInputRef = useRef(null);

  const [logoImageRemoved, setLogoImageRemoved] = useState(false);
  const [removeLogoImagePending, setRemoveLogoImagePending] = useState(false);

  // --- Coaches Attendance State ---
  const [coachesAttendance, setCoachesAttendance] = useState({});
  const [coachesAttendanceLoading, setCoachesAttendanceLoading] = useState(false);
  const [coachesAttendanceError, setCoachesAttendanceError] = useState("");
  const [showCoachesAttendanceModal, setShowCoachesAttendanceModal] = useState(false);
  const [coachesAttendanceHistory, setCoachesAttendanceHistory] = useState([]);
  const [coachesAttendanceHistoryCoach, setCoachesAttendanceHistoryCoach] = useState(null);

  // Real-time Philippine time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const phDate = now.toLocaleString('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setPhTime(phDate);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleShowAttendanceHistory = async (user) => {
    setAttendanceHistoryUser(user);
    setShowAttendanceModal(true);
    setAttendanceHistoryCurrentPage(1); // Reset to first page
    try {
      const res = await fetch(`http://localhost:3001/api/attendance/${user._id}`);
      const data = await res.json();
      setAttendanceHistory(data);
    } catch {
      setAttendanceHistory([]);
    }
  };

  // Fetch home content when activeSection is 'home'
  useEffect(() => {
    if (activeSection === 'home') {
      fetch('http://localhost:3001/api/home-content')
        .then(res => res.json())
        .then(data => setHomeContent(data))
        .catch(() => setHomeMessage('Failed to load home content.'));
    }
  }, [activeSection]);

  const handleHomeContentChange = (e) => {
    const { name, value } = e.target;
    setHomeContent(prev => ({ ...prev, [name]: value }));
  };

  const saveHomeContent = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/home-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(homeContent)
      });
      const data = await res.json();
      setHomeMessage(data.message || 'Home content updated!');
    } catch {
      setHomeMessage('Failed to update home content.');
    }
  };

  // Add this useEffect to set active section based on current path
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/admin/home-settings')) {
      setActiveSection('homeSettings');
    } else if (path.includes('/admin/members')) {
      setActiveSection('members');
    } else if (path.includes('/admin/payroll')) {
      setActiveSection('payroll');
    } else if (path.includes('/admin/analytics')) {
      setActiveSection('analytics');
    } else if (path.includes('/admin/coaches-attendance')) {
      setActiveSection('coachesAttendance');
    } else if (path.includes('/admin/coaches')) {
      setActiveSection('coaches');
    } else if (path.includes('/admin/promos')) {
      setActiveSection('promos');
    } else if (path.includes('/admin/classes')) {
      setActiveSection('classes');
    } else if (path.includes('/admin/footer')) {
      setActiveSection('footer');
    } else if (path.includes('/admin/logo')) {
      setActiveSection('logo');
    } else if (path.includes('/admin/contact')) {
      setActiveSection('contact');
    } else if (path.includes('/admin/payment-verification')) {
      setActiveSection('paymentVerification');
    } else if (path.includes('/admin/payment-settings')) {
      setActiveSection('paymentSettings');
    } else {
      setActiveSection('rates');
    }
  }, [location]);

  const fetchCoaches = async () => {
    setCoachesLoading(true);
    setCoachesError("");
    try {
      const response = await fetch('http://localhost:3001/api/coaches');
      if (!response.ok) throw new Error('Failed to fetch coaches');
      const data = await response.json();
      setCoaches(data);
    } catch (error) {
      setCoachesError('Error fetching coaches.');
    } finally {
      setCoachesLoading(false);
    }
  };

  // Fetch rates and promos on component mount
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/rates');
        if (!response.ok) {
          throw new Error('Failed to fetch rates');
        }
        const data = await response.json();
        setRates(data);
      } catch (error) {
        console.error('Error fetching rates:', error);
      }
    };

    const fetchPromos = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/promos');
        if (!response.ok) {
          throw new Error('Failed to fetch promos');
        }
        const data = await response.json();
        setPromos(data);
      } catch (error) {
        console.error('Error fetching promos:', error);
      }
    };

    const fetchClasses = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/classes');
        if (!response.ok) {
          throw new Error('Failed to fetch classes');
        }
        const data = await response.json();
        setClassList(data);
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };

    fetchRates();
    fetchPromos();
    fetchClasses();
    fetchCoaches();
  }, []); // Empty dependency array means this effect runs once on mount

  // Fetch footer data on mount or when activeSection changes to 'footer'
  useEffect(() => {
    if (activeSection === 'footer') {
      fetch('http://localhost:3001/api/footer')
        .then(res => res.json())
        .then(data => setFooterData(data))
        .catch(() => setFooterMessage('Failed to load footer data.'));
    }
  }, [activeSection]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result); // Store base64 string
      };
      reader.readAsDataURL(file);
    } else {
      setProfilePic('');
    }
  };

  const handleAddCoach = async () => {
    try {
      const proRecordString = `${proRecordWins || 0} - ${proRecordLosses || 0}`;
      const proWinsNum = parseInt(proRecordWins) || 0;
      const proLossesNum = parseInt(proRecordLosses) || 0;
      const res = await fetch('http://localhost:3001/api/coaches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          username,
          firstname,
          lastname,
          password,
          biography: bio,
          specialties: specialties.split(',').map(s => s.trim()).filter(Boolean),
          belt,
          profilePic,
          proRecord: proRecordString,
          proWins: proWinsNum,
          proLosses: proLossesNum
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || 'Failed to add coach (backend error).');
        return;
      }
      await fetchCoaches();
      setEmail('');
      setUsername('');
      setFirstname('');
      setLastname('');
      setBio('');
      setPassword('');
      setSpecialties('');
      setBelt('');
      setProfilePic('');
      setProRecordWins('');
      setProRecordLosses('');
      window.dispatchEvent(new Event('coachesUpdated'));
      setMessage('Coach added!');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage('Failed to add coach (network error).');
    }
  };

  const handleAddClass = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClassName,
          description: newClassDescription,
          video: newClassVideoUrl, // 🔥 Use URL instead of base64
          image: newClassImageUrl // 🔥 Use URL instead of base64
        })
      });
      const data = await res.json();
      setClassList([...classList, data]);
      setNewClassName('');
      setNewClassDescription('');
      setNewClassVideoUrl(''); // 🔥 Reset URL
      setNewClassImageUrl(''); // 🔥 Reset URL
      setNewClassVideo(''); // Reset preview
      setNewClassImage(''); // Reset preview
      window.dispatchEvent(new Event('classAdded'));
      setClassMessage('Class added!');
      setTimeout(() => setClassMessage(''), 2000);
    } catch {
      setClassMessage('Failed to add class.');
    }
  };

  const handleAddRate = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRateClassName,
          price: newRatePrice,
          image: newRateImageUrl,
          ratesInfo: newRateInfo,
        })
      });
      const data = await res.json();
      setRates([...rates, data.rate]); // FIX: dapat data.rate lang
      setNewRateClassName('');
      setNewRatePrice('');
      setNewRateImageUrl(''); // 🔥 Clear URL input
      setNewRateInfo('');
      window.dispatchEvent(new Event('ratesUpdated'));
      setToast('Rate added successfully!');
      setTimeout(() => setToast(''), 2000);
    } catch {
      setToast('Failed to add rate.');
      setTimeout(() => setToast(''), 2000);
    }
  };

  // 🔥 Promo image upload handler
  const handlePromoImageUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('promo', file);
      
      const response = await fetch('http://localhost:3001/api/upload/promo', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (data.success) {
        setNewPromoImageUrl(data.imageUrl);
        setPromoMessage('Image uploaded successfully!');
        setTimeout(() => setPromoMessage(''), 2000);
      } else {
        setPromoMessage('Failed to upload image.');
        setTimeout(() => setPromoMessage(''), 2000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setPromoMessage('Failed to upload image.');
      setTimeout(() => setPromoMessage(''), 2000);
    }
  };

  // 🔥 Class image upload handler
  const handleClassImageUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('classImage', file);
      
      const response = await fetch('http://localhost:3001/api/upload/class-image', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (data.success) {
        setNewClassImageUrl(data.imageUrl);
        setClassMessage('Image uploaded successfully!');
        setTimeout(() => setClassMessage(''), 2000);
      } else {
        setClassMessage('Failed to upload image.');
        setTimeout(() => setClassMessage(''), 2000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setClassMessage('Failed to upload image.');
      setTimeout(() => setClassMessage(''), 2000);
    }
  };

  // 🔥 Class video upload handler
  const handleClassVideoUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('classVideo', file);
      
      const response = await fetch('http://localhost:3001/api/upload/class-video', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (data.success) {
        setNewClassVideoUrl(data.videoUrl);
        setClassMessage('Video uploaded successfully!');
        setTimeout(() => setClassMessage(''), 2000);
      } else {
        setClassMessage('Failed to upload video.');
        setTimeout(() => setClassMessage(''), 2000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setClassMessage('Failed to upload video.');
      setTimeout(() => setClassMessage(''), 2000);
    }
  };

  const handleAddPromo = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPromoName,
          price: newPromoPrice,
          image: newPromoImageUrl, // 🔥 Use URL instead of base64
          promoInfo: newPromoInfo,
        })
      });
      const data = await res.json();
      setPromos([...promos, data.promo]);
      setNewPromoName('');
      setNewPromoPrice('');
      setNewPromoImageUrl(''); // 🔥 Reset URL
      setNewPromoInfo('');
      window.dispatchEvent(new Event('promosUpdated'));
      setPromoMessage('Promo added!');
      setTimeout(() => setPromoMessage(''), 2000);
    } catch {
      setPromoMessage('Failed to add promo.');
      setTimeout(() => setPromoMessage(''), 2000);
    }
  };

  const handleDelete = async (type, id) => {
    // Add confirmation dialog for all delete actions
    if (!window.confirm(`Are you sure you want to delete this ${type.slice(0, -1)}?`)) return;
    // Fix: use correct endpoint for classes
    let apiType = type;
    if (type === 'class') apiType = 'classes';
    try {
      await fetch(`http://localhost:3001/api/${apiType}/${id}`, { method: 'DELETE' });
      if (type === 'rates') {
        setRates(rates.filter(rate => rate._id !== id));
        window.dispatchEvent(new Event('ratesUpdated'));
      } else if (type === 'promos' || type === 'promo') {
        setPromos(promos.filter(promo => promo._id !== id));
        window.dispatchEvent(new Event('promosUpdated'));
      } else if (type === 'class') {
        setClassList(classList.filter(cls => cls._id !== id));
        window.dispatchEvent(new Event('classesUpdated'));
      }
      setMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted!`);
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setMessage(`Failed to delete ${type}.`);
    }
  };

  const handleEditRate = (rate) => {
    setEditingRate(rate);
    setEditRateName(rate.name);
    setEditRatePrice(rate.price);
    setEditRateImageUrl(rate.image || ''); // 🔥 Load existing image URL
    setEditRateInfo(rate.ratesInfo || ''); // ADD THIS
  };

  const saveEditRate = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/rates/${editingRate._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editRateName,
          price: editRatePrice,
          image: editRateImageUrl,
          ratesInfo: editRateInfo,
        })
      });
      const data = await res.json();
      if (res.ok && data && data.rate) {
        setRates(rates.map(rate => rate._id === editingRate._id ? data.rate : rate));
        setEditingRate(null);
        window.dispatchEvent(new Event('ratesUpdated'));
        setToast('Rate updated successfully!');
        setTimeout(() => setToast(''), 2000);
      } else {
        setToast('Failed to update rate.');
        setTimeout(() => setToast(''), 2000);
      }
    } catch {
      setToast('Failed to update rate.');
      setTimeout(() => setToast(''), 2000);
    }
  };

  // Add promo edit handlers
  const handleEditPromo = (promo) => {
    setEditingPromo(promo);
    setEditPromoName(promo.name);
    setEditPromoPrice(promo.price);
    setEditPromoImageUrl(promo.image || ''); // 🔥 Load existing image URL
    setEditPromoInfo(promo.promoInfo || ''); // ADD THIS
  };

  const saveEditPromo = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/promos/${editingPromo._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editPromoName,
          price: editPromoPrice,
          image: editPromoImageUrl, // 🔥 Use URL instead of base64
          promoInfo: editPromoInfo,
        })
      });
      const data = await res.json();
      setPromos(promos.map(promo => promo._id === editingPromo._id ? data.promo : promo));
      setEditingPromo(null);
      window.dispatchEvent(new Event('promosUpdated'));
      setPromoMessage('Promo updated!');
      setTimeout(() => setPromoMessage(''), 2000);
    } catch {
      setPromoMessage('Failed to update promo.');
      setTimeout(() => setPromoMessage(''), 2000);
    }
  };

  // Add class edit handlers
  const handleEditClass = (classItem) => {
    setEditingClass(classItem);
    setEditClassName(classItem.name);
    setEditClassDescription(classItem.description || '');
    setEditClassVideoUrl(classItem.video || ''); // 🔥 Load existing video URL
    setEditClassImageUrl(classItem.image || ''); // 🔥 Load existing image URL
  };

  const saveEditClass = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/classes/${editingClass._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editClassName,
          description: editClassDescription,
          video: editClassVideoUrl, // 🔥 Use URL instead of base64
          image: editClassImageUrl // 🔥 Use URL instead of base64
        })
      });
      const data = await res.json();
      setClassList(classList.map(cls => cls._id === editingClass._id ? data : cls));
      setEditingClass(null);
      window.dispatchEvent(new Event('classesUpdated'));
      setMessage('Class updated!');
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setMessage('Failed to update class.');
    }
  };

  const handleDeleteCoach = async (id) => {
    if (!window.confirm('Are you sure you want to delete this coach?')) return;
    try {
      const response = await fetch(`http://localhost:3001/api/coaches/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete coach');
      setCoaches(coaches.filter(coach => coach._id !== id));
      window.dispatchEvent(new Event('coachesUpdated'));
      setMessage('Coach deleted successfully!');
    } catch (err) {
      setMessage('Failed to delete coach.');
    }
  };

  const handleEditCoach = (coach) => {
    setEditingCoach(coach._id);
    setEditCoachData({ ...coach, proRecord: coach.proRecord || '' });
    setEditCoachSpecialties(coach.specialties ? coach.specialties.join(', ') : "");
    setEditCoachBelt(coach.belt || "");
    const [wins, losses] = (coach.proRecord || '').split('-').map(s => s.trim());
    setEditProRecordWins(wins || '');
    setEditProRecordLosses(losses || '');
  };

  const handleEditCoachChange = (e) => {
    const { name, value } = e.target;
    setEditCoachData((prev) => ({ ...prev, [name]: value }));
  };

  const saveEditCoach = async (coachId) => {
    try {
      const proRecordString = `${editProRecordWins || 0} - ${editProRecordLosses || 0}`;
      const proWinsNum = parseInt(editProRecordWins) || 0;
      const proLossesNum = parseInt(editProRecordLosses) || 0;
      const res = await fetch(`http://localhost:3001/api/coaches/${coachId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editCoachData,
          specialties: editCoachSpecialties.split(',').map(s => s.trim()).filter(Boolean),
          belt: editCoachBelt,
          proRecord: proRecordString,
          proWins: proWinsNum,
          proLosses: proLossesNum
        })
      });
      const data = await res.json();
      if (!res.ok || !data || !data.success) {
        setMessage(data?.error || 'Failed to update coach (backend error).');
        return;
      }
      await fetchCoaches();
        setEditingCoach(null);
      window.dispatchEvent(new Event('coachesUpdated'));
      setMessage('Coach updated!');
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setMessage('Failed to update coach.');
    }
  };

  const cancelEditCoach = () => {
    setEditingCoach(null);
    setEditCoachData({});
  };

  const handleFooterChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('contact.')) {
      setFooterData(prev => ({ ...prev, contact: { ...prev.contact, [name.split('.')[1]]: value } }));
    } else if (name.startsWith('social.')) {
      setFooterData(prev => ({ ...prev, social: { ...prev.social, [name.split('.')[1]]: value } }));
    } else {
      setFooterData(prev => ({ ...prev, [name]: value }));
    }
  };

  const saveFooter = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/footer', {
        method: 'PUT', // Use PUT to match backend
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(footerData)
      });
      const data = await res.json();
      setFooterData(data.footer || data); // Use data.footer if present
      window.dispatchEvent(new Event('footerUpdated'));
      setFooterMessage('Footer updated!');
      setTimeout(() => setFooterMessage(''), 2000);
    } catch {
      setFooterMessage('Failed to update footer.');
    }
  };



  // Fetch users when activeSection is 'members'
  useEffect(() => {
    if (activeSection === 'members') {
      setUsersLoading(true);
      setUsersError("");
      fetch('http://localhost:3001/api/users')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch users');
          return res.json();
        })
        .then(data => setUsers(data))
        .catch(err => setUsersError('Error fetching users.'))
        .finally(() => setUsersLoading(false));
    }
  }, [activeSection]);

  // Fetch promo settings on mount and when switching to promos section
  useEffect(() => {
    if (activeSection === 'promos') {
      fetch('http://localhost:3001/api/promo-settings')
        .then(res => res.json())
        .then(data => setPromoSettings(data))
        .catch(() => setPromoSettings({ heading: '', banner: '' }));
    }
  }, [activeSection]);

  const handlePromoSettingsChange = (e) => {
    const { name, value } = e.target;
    setPromoSettings(prev => ({ ...prev, [name]: value }));
  };

  const savePromoSettings = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/promo-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promoSettings)
      });
      const data = await res.json();
      setPromoSettings(data);
      window.dispatchEvent(new Event('promoSettingsUpdated'));
      setPromoSettingsMessage('Settings updated!');
      setTimeout(() => setPromoSettingsMessage(''), 2000);
    } catch {
      setPromoSettingsMessage('Failed to update settings.');
    }
  };

  // Fetch rates settings on mount and when switching to rates section
  useEffect(() => {
    if (activeSection === 'rates') {
      fetch('http://localhost:3001/api/rates-settings')
        .then(res => res.json())
        .then(data => setRatesSettings(data))
        .catch(() => setRatesSettings({ heading: '', banner: '' }));
    }
  }, [activeSection]);

  const handleRatesSettingsChange = (e) => {
    const { name, value } = e.target;
    setRatesSettings(prev => ({ ...prev, [name]: value }));
  };

  const saveRatesSettings = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/rates-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ratesSettings)
      });
      const data = await res.json();
      setRatesSettings(data);
      window.dispatchEvent(new Event('ratesSettingsUpdated'));
      setRatesSettingsMessage('Settings updated!');
      setTimeout(() => setRatesSettingsMessage(''), 2000);
    } catch {
      setRatesSettingsMessage('Failed to update settings.');
    }
  };

  // Fetch site settings on mount and when switching to logo section
  useEffect(() => {
    if (activeSection === 'logo') {
      fetch('http://localhost:3001/api/site-settings')
        .then(res => res.json())
        .then(data => setSiteSettings(data))
        .catch(() => setSiteSettings({ logoText: 'SenJitsu' }));
    }
  }, [activeSection]);

  // Fetch payment settings on mount and when switching to payment settings section
  useEffect(() => {
    if (activeSection === 'paymentSettings') {
      fetch('http://localhost:3001/api/payment-settings')
        .then(res => res.json())
        .then(data => setPaymentSettings(data))
        .catch(() => setPaymentSettings({ 
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
          classMembershipQrCodes: {
            'Boxing': '/images/gcashqr.png',
            'Muay Thai': '/images/gcashqr.png',
            'Kali': '/images/gcashqr.png',
            'Jiu Jitsu Adults': '/images/gcashqr.png',
            'Jiu Jitsu Kids': '/images/gcashqr.png',
            'MMA': '/images/gcashqr.png',
            'Judo': '/images/gcashqr.png',
            'Wrestling': '/images/gcashqr.png'
          },
          classPackageQrCodes: {
            'Boxing': '/images/gcashqr.png',
            'Muay Thai': '/images/gcashqr.png',
            'Kali': '/images/gcashqr.png',
            'Jiu Jitsu Adults': '/images/gcashqr.png',
            'Jiu Jitsu Kids': '/images/gcashqr.png',
            'MMA': '/images/gcashqr.png',
            'Judo': '/images/gcashqr.png',
            'Wrestling': '/images/gcashqr.png'
          },
          packagePricing: {
            'Boxing': { sessions: 10, price: 2500 },
            'Muay Thai': { sessions: 10, price: 3000 },
            'Kali': { sessions: 4, price: 1400 },
            'Jiu Jitsu Adults': { sessions: 12, price: 2500 },
            'Jiu Jitsu Kids': { sessions: 4, price: 1600 },
            'MMA': { sessions: 4, price: 1400 },
            'Judo': { sessions: 4, price: 1600 },
            'Wrestling': { sessions: 4, price: 1600 }
          },
          membershipRate: 1000,
          membershipQrCode: '/images/gcashqr.png' 
        }));
    }
  }, [activeSection]);

  const handleSiteSettingsChange = (e) => {
    const { name, value } = e.target;
    setSiteSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoImage(reader.result);
        setLogoImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setLogoImage("");
      setLogoImagePreview("");
    }
  };

  const saveSiteSettings = async () => {
    try {
      let payload = { ...siteSettings };
      // If both logoText and logoImage are blank, clear the logo
      if (!siteSettings.logoText && !logoImage && !logoImageRemoved) {
        payload.logoText = '';
        payload.logoImage = '';
      } else if (logoImage) {
        payload.logoImage = logoImage;
      } else if (logoImageRemoved) {
        payload.logoImage = '';
      }
      const res = await fetch('http://localhost:3001/api/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setSiteSettings(data);
      if (data.logoImageUrl) {
        setLogoImagePreview(data.logoImageUrl);
        setLogoImage("");
        setLogoImageRemoved(false);
        setRemoveLogoImagePending(false);
      } else if (!data.logoText && !data.logoImageUrl) {
        setLogoImagePreview("");
        setLogoImage("");
        setLogoImageRemoved(false);
        setRemoveLogoImagePending(false);
      } else if (!data.logoImageUrl) {
        setLogoImagePreview("");
        setLogoImage("");
        setLogoImageRemoved(false);
        setRemoveLogoImagePending(false);
      }
      localStorage.setItem('siteLogoText', data.logoText || '');
      window.dispatchEvent(new Event('logoTextUpdated'));
      localStorage.setItem('siteLogoImageUrl', data.logoImageUrl || '');
      window.dispatchEvent(new Event('logoImageUpdated'));
      setSiteSettingsMessage(logoImageRemoved || removeLogoImagePending ? 'Logo image removed!' : 'Logo updated!');
      setTimeout(() => setSiteSettingsMessage(''), 2000);
    } catch {
      setSiteSettingsMessage('Failed to update logo.');
    }
  };

  const handlePaymentSettingsChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('classRates.')) {
      const className = name.replace('classRates.', '');
      setPaymentSettings(prev => ({
        ...prev,
        classRates: {
          ...prev.classRates,
          [className]: parseFloat(value) || 0
        }
      }));
    } else if (name.startsWith('packagePricing.')) {
      const [, className, field] = name.split('.');
      setPaymentSettings(prev => ({
        ...prev,
        packagePricing: {
          ...prev.packagePricing,
          [className]: {
            ...prev.packagePricing[className],
            [field]: field === 'sessions' ? parseInt(value) || 0 : parseFloat(value) || 0
          }
        }
      }));
    } else {
      setPaymentSettings(prev => ({ ...prev, [name]: parseFloat(value) || value }));
    }
  };

  const handleClassQrCodeChange = (className) => (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setClassQrCodeImages(prev => ({
          ...prev,
          [className]: reader.result
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setClassQrCodeImages(prev => {
        const newImages = { ...prev };
        delete newImages[className];
        return newImages;
      });
    }
  };

  const handleClassMembershipQrCodeChange = (className) => (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setClassMembershipQrCodeImages(prev => ({
          ...prev,
          [className]: reader.result
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setClassMembershipQrCodeImages(prev => {
        const newImages = { ...prev };
        delete newImages[className];
        return newImages;
      });
    }
  };

  const handleClassPackageQrCodeChange = (className) => (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setClassPackageQrCodeImages(prev => ({
          ...prev,
          [className]: reader.result
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setClassPackageQrCodeImages(prev => {
        const newImages = { ...prev };
        delete newImages[className];
        return newImages;
      });
    }
  };

  const handleMembershipQrCodeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMembershipQrCodeImage(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setMembershipQrCodeImage('');
    }
  };

  const savePaymentSettings = async () => {
    try {
      console.log('🔍 Saving payment settings...');
      console.log('classQrCodeImages:', classQrCodeImages);
      console.log('classMembershipQrCodeImages:', classMembershipQrCodeImages);
      console.log('classPackageQrCodeImages:', classPackageQrCodeImages);
      console.log('packagePricing:', paymentSettings.packagePricing);
      console.log('membershipQrCodeImage:', membershipQrCodeImage);
      
      const res = await fetch('http://localhost:3001/api/payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          classRates: paymentSettings.classRates,
          membershipRate: paymentSettings.membershipRate,
          packagePricing: paymentSettings.packagePricing,
          classQrCodes: classQrCodeImages,
          classMembershipQrCodes: classMembershipQrCodeImages,
          classPackageQrCodes: classPackageQrCodeImages,
          membershipQrCode: membershipQrCodeImage || undefined 
        })
      });
      const data = await res.json();
      console.log('✅ Payment settings response:', data);
      console.log('✅ Response classMembershipQrCodes:', data.classMembershipQrCodes);
      
      setPaymentSettings(data);
      window.dispatchEvent(new Event('paymentSettingsUpdated'));
      setPaymentSettingsMessage('Payment settings updated!');
      setClassQrCodeImages({}); // Clear all class QR code images after successful upload
      setClassMembershipQrCodeImages({}); // Clear all class membership QR code images after successful upload
      setClassPackageQrCodeImages({}); // Clear all class package QR code images after successful upload
      setMembershipQrCodeImage(''); // Clear membership QR code image after successful upload
      setTimeout(() => setPaymentSettingsMessage(''), 2000);
    } catch (error) {
      console.error('❌ Error saving payment settings:', error);
      setPaymentSettingsMessage('Failed to update payment settings.');
    }
  };

  // Real-time update listeners for all entities
  useEffect(() => {
    // Classes
    const handleClassesUpdated = () => {
      fetch('http://localhost:3001/api/classes')
        .then(res => res.json())
        .then(data => setClassList(data));
    };
    window.addEventListener('classesUpdated', handleClassesUpdated);

    // Rates
    const handleRatesUpdated = () => {
      fetch('http://localhost:3001/api/rates')
        .then(res => res.json())
        .then(data => setRates(data));
    };
    window.addEventListener('ratesUpdated', handleRatesUpdated);

    // Promos
    const handlePromosUpdated = () => {
      fetch('http://localhost:3001/api/promos')
        .then(res => res.json())
        .then(data => setPromos(data));
    };
    window.addEventListener('promosUpdated', handlePromosUpdated);

    // Coaches
    const handleCoachesUpdated = () => {
      fetch('http://localhost:3001/api/coaches')
        .then(res => res.json())
        .then(data => setCoaches(data));
    };
    window.addEventListener('coachesUpdated', handleCoachesUpdated);

    // Cleanup
    return () => {
      window.removeEventListener('classesUpdated', handleClassesUpdated);
      window.removeEventListener('ratesUpdated', handleRatesUpdated);
      window.removeEventListener('promosUpdated', handlePromosUpdated);
      window.removeEventListener('coachesUpdated', handleCoachesUpdated);
    };
  }, []);

  // Fetch today's attendance when members section is active
  useEffect(() => {
    if (activeSection === 'members') {
      setAttendanceLoading(true);
      setAttendanceError("");
      fetch(`http://localhost:3001/api/attendance?date=${today.toISOString()}`)
        .then(res => res.json())
        .then(data => {
          // Map attendance by userId for quick lookup
          const attMap = {};
          data.forEach(a => { attMap[a.userId._id] = a; });
          setAttendance(attMap);
          setAttendanceLoading(false);
        })
        .catch(() => {
          setAttendanceError('Failed to load attendance.');
          setAttendanceLoading(false);
        });
    }
  }, [activeSection, users]);

  const handleMarkAttendance = async (userId, status) => {
    setAttendanceLoading(true);
    setAttendanceError("");
    try {
      // Replace with actual admin name or id if available
      const confirmedBy = 'admin';
      const res = await fetch('http://localhost:3001/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          date: today.toISOString(),
          status,
          confirmedBy
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark attendance');
      setAttendance(prev => ({ ...prev, [userId]: data.attendance }));
    } catch (err) {
      setAttendanceError(err.message);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const filteredAttendanceHistory = historyFilterDate
    ? attendanceHistory.filter(rec => {
        const recDate = new Date(rec.date);
        const filterDate = new Date(historyFilterDate);
        return (
          recDate.getFullYear() === filterDate.getFullYear() &&
          recDate.getMonth() === filterDate.getMonth() &&
          recDate.getDate() === filterDate.getDate()
        );
      })
    : attendanceHistory;

  // --- Add state and logic for contact info at the top ---
  const [contactInfo, setContactInfo] = useState({
    phone: '',
    email: '',
    address: '',
    social: {
      messenger: { label: 'Messenger', url: '' },
      facebook: { label: 'Facebook', url: '' },
      instagram: { label: 'Instagram', url: '' },
      youtube: { label: 'Youtube', url: '' }
    },
    mapEmbedUrl: ''
  });
  const [contactInfoMessage, setContactInfoMessage] = useState('');
  // Fetch contact info when activeSection is 'contact'
  useEffect(() => {
    if (activeSection === 'contact') {
      fetch('http://localhost:3001/api/contact-info')
        .then(res => res.json())
        .then(data => setContactInfo(data))
        .catch(() => setContactInfoMessage('Failed to load contact info.'));
    }
  }, [activeSection]);
  const handleContactInfoChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('social.')) {
      const [, socialKey, subKey] = name.split('.');
      setContactInfo(prev => ({
        ...prev,
        social: {
          ...prev.social,
          [socialKey]: {
            ...prev.social[socialKey],
            [subKey]: value
          }
        }
      }));
    } else {
      setContactInfo(prev => ({ ...prev, [name]: value }));
    }
  };
  const saveContactInfo = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/contact-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactInfo)
      });
      const data = await res.json();
      setContactInfo(data.contactInfo || data);
      setContactInfoMessage('Contact info updated!');
      setTimeout(() => setContactInfoMessage(''), 2000);
      window.dispatchEvent(new Event('contactInfoUpdated'));
    } catch {
      setContactInfoMessage('Failed to update contact info.');
    }
  };
  // --- END contact info logic ---

  // Fetch today's coaches attendance when section is active
  useEffect(() => {
    if (activeSection === 'coachesAttendance') {
      setCoachesAttendanceLoading(true);
      setCoachesAttendanceError("");
      fetch(`http://localhost:3001/api/coaches-attendance?date=${today.toISOString()}`)
        .then(res => res.json())
        .then(data => {
          const attMap = {};
          data.forEach(a => { attMap[a.coachId._id] = a; });
          setCoachesAttendance(attMap);
          setCoachesAttendanceLoading(false);
        })
        .catch(() => {
          setCoachesAttendanceError('Failed to load coaches attendance.');
          setCoachesAttendanceLoading(false);
        });
    }
  }, [activeSection, coaches]);

  const handleMarkCoachesAttendance = async (coachId, status) => {
    setCoachesAttendanceLoading(true);
    setCoachesAttendanceError("");
    try {
      const confirmedBy = 'admin';
      const res = await fetch('http://localhost:3001/api/coaches-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coachId,
          date: today.toISOString(),
          status,
          confirmedBy
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to mark coach attendance');
      setCoachesAttendance(prev => ({ ...prev, [coachId]: data.attendance }));
    } catch (err) {
      setCoachesAttendanceError(err.message);
    } finally {
      setCoachesAttendanceLoading(false);
    }
  };

  const handleShowCoachesAttendanceHistory = async (coach) => {
    setCoachesAttendanceHistoryCoach(coach);
    setShowCoachesAttendanceModal(true);
    try {
      const res = await fetch(`http://localhost:3001/api/coaches-attendance/${coach._id}`);
      const data = await res.json();
      setCoachesAttendanceHistory(data);
    } catch {
      setCoachesAttendanceHistory([]);
    }
  };

  // Auto-refresh classes list on relevant events
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/classes');
        const data = await res.json();
        setClassList(Array.isArray(data) ? data : (data.classList || []));
      } catch {
        // Optionally handle error
      }
    };
    fetchClasses();
    const refreshEvents = ['classAdded', 'classesUpdated', 'classDeleted'];
    refreshEvents.forEach(event => window.addEventListener(event, fetchClasses));
    return () => {
      refreshEvents.forEach(event => window.removeEventListener(event, fetchClasses));
    };
  }, []);

  const [promoToast, setPromoToast] = useState('');

  useEffect(() => {
    const socket = new window.WebSocket('ws://localhost:3001');
    socket.onopen = () => {
        console.log('WebSocket connected!');
    };
    socket.onmessage = (event) => {
        console.log('WebSocket message:', event.data);
        // REMOVE setToast(event.data) to prevent WebSocket banner
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

  // Add state for membership history modal
  const [showMembershipHistoryModal, setShowMembershipHistoryModal] = useState(false);
  const [membershipHistory, setMembershipHistory] = useState([]);
  const [membershipHistoryUser, setMembershipHistoryUser] = useState(null);
  const [membershipHistoryLoading, setMembershipHistoryLoading] = useState(false);
  const [membershipHistoryError, setMembershipHistoryError] = useState("");
  const [membershipHistoryCurrentPage, setMembershipHistoryCurrentPage] = useState(1);
  const MEMBERSHIP_HISTORY_PER_PAGE = 10;

  // Add state for attendance history modal
  const [attendanceHistoryCurrentPage, setAttendanceHistoryCurrentPage] = useState(1);
  const ATTENDANCE_HISTORY_PER_PAGE = 10;

  // Add state for coaches attendance history modal
  const [coachesAttendanceHistoryCurrentPage, setCoachesAttendanceHistoryCurrentPage] = useState(1);
  const COACHES_ATTENDANCE_HISTORY_PER_PAGE = 10;

  // Add state for payment history modal
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentHistoryUser, setPaymentHistoryUser] = useState(null);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [paymentHistoryError, setPaymentHistoryError] = useState("");
  const [paymentHistoryCurrentPage, setPaymentHistoryCurrentPage] = useState(1);
  const PAYMENT_HISTORY_PER_PAGE = 10;

  // Add state for members pagination
  const [membersCurrentPage, setMembersCurrentPage] = useState(1);
  const MEMBERS_PER_PAGE = 10;

  // Add state for coaches attendance pagination
  const [coachesAttendanceCurrentPage, setCoachesAttendanceCurrentPage] = useState(1);
  const COACHES_ATTENDANCE_PER_PAGE = 10;

  // Membership expiration management state
  const [membershipExpirationSummary, setMembershipExpirationSummary] = useState({});
  const [expirationSummaryLoading, setExpirationSummaryLoading] = useState(false);
  const [checkingExpiration, setCheckingExpiration] = useState(false);
  const [expirationMessage, setExpirationMessage] = useState("");
  const [testUserId, setTestUserId] = useState("");
  const [testNotificationType, setTestNotificationType] = useState("3day");
  const [sendingTestNotification, setSendingTestNotification] = useState(false);

  // Handler to show membership history
  const handleShowMembershipHistory = async (user) => {
    setMembershipHistoryUser(user);
    setShowMembershipHistoryModal(true);
    setMembershipHistoryLoading(true);
    setMembershipHistoryError("");
    setMembershipHistoryCurrentPage(1); // Reset to first page
    try {
      // Prefer userId, fallback to email, and include archived
      const res = await fetch(`http://localhost:3001/api/membership-applications?userId=${user._id || ''}&email=${user.email || ''}&includeArchived=true`);
      const data = await res.json();
      if (data.success && data.applications) {
        setMembershipHistory(data.applications);
      } else {
        setMembershipHistory([]);
        setMembershipHistoryError('No membership history found.');
      }
    } catch (err) {
      setMembershipHistory([]);
      setMembershipHistoryError('Failed to fetch membership history.');
    } finally {
      setMembershipHistoryLoading(false);
    }
  };

  // Handler to show payment history
  const handleShowPaymentHistory = async (user) => {
    setPaymentHistoryUser(user);
    setShowPaymentHistoryModal(true);
    setPaymentHistoryLoading(true);
    setPaymentHistoryError("");
    setPaymentHistoryCurrentPage(1); // Reset to first page
    try {
      // Use the dedicated payment history endpoint for this user
      const cleanUsername = user.username ? user.username.replace('@', '') : '';
      
      const response = await fetch(`http://localhost:3001/api/users/${cleanUsername}/payment-history`);
      const data = await response.json();
      
      if (data.success && data.paymentHistory) {
        if (data.paymentHistory.length > 0) {
          setPaymentHistory(data.paymentHistory);
        } else {
          setPaymentHistory([]);
          setPaymentHistoryError('No payment history found for this user.');
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
            setPaymentHistory(userPayments);
          } else {
            setPaymentHistory([]);
            setPaymentHistoryError('No payment history found for this user.');
          }
        } else {
          setPaymentHistory([]);
          setPaymentHistoryError('No payments found in database.');
        }
      }
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setPaymentHistory([]);
      setPaymentHistoryError('Failed to fetch payment history.');
    } finally {
      setPaymentHistoryLoading(false);
    }
  };

  // Membership expiration management functions
  const fetchMembershipExpirationSummary = async () => {
    setExpirationSummaryLoading(true);
    setExpirationMessage("");
    try {
      const res = await fetch('http://localhost:3001/api/membership-expiration-summary');
      const data = await res.json();
      if (data.success) {
        setMembershipExpirationSummary(data.summary);
      } else {
        setExpirationMessage('Failed to fetch expiration summary.');
      }
    } catch (error) {
      setExpirationMessage('Error fetching expiration summary.');
    } finally {
      setExpirationSummaryLoading(false);
    }
  };

  const handleCheckExpiringMemberships = async () => {
    setCheckingExpiration(true);
    setExpirationMessage("");
    try {
      const res = await fetch('http://localhost:3001/api/check-expiring-memberships', {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setExpirationMessage(`✅ Expiration check completed! ${data.notificationsSent} notifications sent.`);
        // Refresh the summary after checking
        fetchMembershipExpirationSummary();
      } else {
        setExpirationMessage('❌ Failed to check expiring memberships.');
      }
    } catch (error) {
      setExpirationMessage('❌ Error checking expiring memberships.');
    } finally {
      setCheckingExpiration(false);
    }
  };

  const handleSendTestNotification = async () => {
    if (!testUserId.trim()) {
      setExpirationMessage("⚠️ Please enter a user ID/username to test.");
      return;
    }

    setSendingTestNotification(true);
    setExpirationMessage("");
    try {
      const res = await fetch('http://localhost:3001/api/test-membership-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUserId.trim(),
          notificationType: testNotificationType
        })
      });
      const data = await res.json();
      if (data.success) {
        setExpirationMessage(`✅ Test notification sent to ${testUserId}!`);
        setTestUserId("");
      } else {
        setExpirationMessage(`❌ Failed to send test notification: ${data.error}`);
      }
    } catch (error) {
      setExpirationMessage('❌ Error sending test notification.');
    } finally {
      setSendingTestNotification(false);
    }
  };

  // Fetch expiration summary when section becomes active
  useEffect(() => {
    if (activeSection === 'membershipExpiration') {
      fetchMembershipExpirationSummary();
    }
  }, [activeSection]);

  // Payment Verification State
  const [pendingBookings, setPendingBookings] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [pendingMemberships, setPendingMemberships] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Image Modal State
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage('');
  };

  // Fetch pending payments from new payments collection
  useEffect(() => {
    if (activeSection === 'paymentVerification') {
      setLoadingPayments(true);
      setPaymentError('');
      
      // Fetch from new payments collection
      fetch('http://localhost:3001/api/admin/payments?status=for approval')
        .then(res => res.json())
        .then((paymentsRes) => {
          setPendingPayments(paymentsRes.success ? paymentsRes.payments : []);
          setLoadingPayments(false);
        })
        .catch(() => {
          setPaymentError('Failed to load payment data.');
          setLoadingPayments(false);
        });
    }
  }, [activeSection]);

  // Payment Verification State (like membership applications)
  const [actionLoading, setActionLoading] = useState('');

  // Approve/Reject Payment (same pattern as membership applications)
  const handlePaymentAction = async (paymentId, action) => {
    setActionLoading(paymentId + action);
    try {
      const res = await fetch(`http://localhost:3001/api/admin/payments/${paymentId}/${action}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        // Show success message
        if (action === 'approve') {
          alert('Payment approved successfully! 🎉\n\n✅ User has been notified\n✅ Coach has been notified about the new booking');
          
          // 🔥 TRIGGER EVENT: Notify frontend to refresh user bookings
          const payment = pendingPayments.find(p => p._id === paymentId);
          if (payment && payment.userId) {
            const refreshEvent = new CustomEvent('paymentApproved', {
              detail: { 
                username: payment.userId,
                paymentId: paymentId,
                isPackage: payment.isPackage 
              }
            });
            window.dispatchEvent(refreshEvent);
            console.log('📡 Dispatched payment approval event for user:', payment.userId);
          }
        } else if (action === 'reject') {
          alert('Payment rejected successfully.\n\n✅ User has been notified to resubmit payment proof');
        }
        
        // Remove the payment from pending list since it's no longer pending
        setPendingPayments(payments => payments.filter(payment => payment && payment._id && payment._id !== paymentId));
      } else {
        alert(data.error || 'Action failed.');
      }
    } catch (err) {
      alert('Action failed.');
    } finally {
      setActionLoading('');
    }
  };

  // Keep old booking handlers for backward compatibility (if needed)
  const handleBookingAction = async (bookingId, status) => {
    const admin = JSON.parse(localStorage.getItem('user'));
    if (!admin || !admin._id) return;
    setLoadingPayments(true);
    await fetch('http://localhost:3001/api/book/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, adminId: admin._id, status })
    });
    // Refresh
    const res = await fetch('http://localhost:3001/api/bookings?paymentStatus=pending');
    const data = await res.json();
    setPendingBookings(data.success ? data.bookings : []);
    setLoadingPayments(false);
  };

  // Approve/Reject Membership
  const handleMembershipAction = async (id, action) => {
    setLoadingPayments(true);
    await fetch(`http://localhost:3001/api/membership-application/${id}/${action}`, { method: 'POST' });
    // Refresh
    const res = await fetch('http://localhost:3001/api/membership-applications');
    const data = await res.json();
    setPendingMemberships(data.success ? data.applications.filter(app => app.status === 'pending') : []);
    setLoadingPayments(false);
  };

  return (
    <div className="admin-container">
      {/* Admin Sidebar */}
      <div className="admin-sidebar">
        <div className="sidebar-header">
          <h2>Admin Panel</h2>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`sidebar-nav-item ${activeSection === 'rates' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('rates');
              navigate('/admin');
            }}
          >
            Rates
          </button>
          <button 
            className={`sidebar-nav-item ${activeSection === 'promos' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('promos');
              navigate('/admin/promos');
            }}
          >
            Promos
          </button>
          <button 
            className={`sidebar-nav-item ${activeSection === 'coaches' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('coaches');
              navigate('/admin/coaches');
            }}
          >
            Coaches
          </button>
          {/* BAGONG BUTTON DITO */}
          <button 
            className={`sidebar-nav-item ${activeSection === 'paymentVerification' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('paymentVerification');
              navigate('/admin/payment-verification');
            }}
          >
            Payment Verification
          </button>
          <button 
            className={`sidebar-nav-item ${activeSection === 'coachesAttendance' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('coachesAttendance');
              navigate('/admin/coaches-attendance');
            }}
          >
            Coaches Attendance
          </button>
          <button 
            className={`sidebar-nav-item ${activeSection === 'members' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('members');
              navigate('/admin/members');
            }}
          >
            ALL MEMBERS
          </button>
          {/* Membership Applications Button */}
          <button 
            className={`sidebar-nav-item ${activeSection === 'membershipApplications' ? 'active' : ''}`}
            onClick={() => setActiveSection('membershipApplications')}
          >
            Membership Applications
          </button>
          {/* Membership Expiration Management Button */}
          <button 
            className={`sidebar-nav-item ${activeSection === 'membershipExpiration' ? 'active' : ''}`}
            onClick={() => setActiveSection('membershipExpiration')}
          >
            Membership Expiration
          </button>
          <button 
            className={`sidebar-nav-item ${activeSection === 'payroll' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('payroll');
              navigate('/admin/payroll');
            }}
          >
            Payroll
          </button>
          <button 
            className={`sidebar-nav-item ${activeSection === 'analytics' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('analytics');
              navigate('/admin/analytics');
            }}
          >
            <FaChartLine style={{ marginRight: 8 }} />
            Financial Analytics
          </button>
          <button 
            className={`sidebar-nav-item ${activeSection === 'classes' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('classes');
              navigate('/admin/classes');
            }}
          >
            Classes
          </button>
          <button 
            className={`sidebar-nav-item ${activeSection === 'footer' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('footer');
              navigate('/admin/footer');
            }}
          >
            Footer
          </button>
          <button 
            className={`sidebar-nav-item ${activeSection === 'logo' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('logo');
              navigate('/admin/logo');
            }}
          >
            Logo
          </button>
          {/* CONTACT BUTTON DITO */}
          <button 
            className={`sidebar-nav-item ${activeSection === 'contact' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('contact');
              navigate('/admin/contact');
            }}
          >
            Contact
          </button>
          <button 
            className={`sidebar-nav-item ${activeSection === 'homeSettings' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('homeSettings');
              navigate('/admin/home-settings');
            }}
          >
            HOME SETTINGS
          </button>
          <button 
            className={`sidebar-nav-item ${activeSection === 'paymentSettings' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('paymentSettings');
              navigate('/admin/payment-settings');
            }}
          >
            Payment Settings
          </button>
          <button 
            className={`sidebar-nav-item ${activeSection === 'emailTemplate' ? 'active' : ''}`}
            onClick={() => setActiveSection('emailTemplate')}
          >
            Email Template
          </button>
          <button 
            className={`sidebar-nav-item ${activeSection === 'bookingEmailTemplate' ? 'active' : ''}`}
            onClick={() => setActiveSection('bookingEmailTemplate')}
          >
            Booking Email Template
          </button>
          <button 
            className={`sidebar-nav-item ${activeSection === 'emailBrand' ? 'active' : ''}`}
            onClick={() => setActiveSection('emailBrand')}
          >
            Email Branding
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="admin-main">
        {/* Admin Hero Section */}
        <section className="admin-hero" style={{
          background: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/images/cage22.png') center/cover no-repeat`,
        }}>
          <div className="admin-header">
            <h1>ADMIN DASHBOARD</h1>
          </div>
          <p>Edit & add prices, schedules, classes, promos and coaches information</p>
        </section>

        {/* Main Content */}
        <main className="admin-main-content">
          <Link to="/" className="return-home">
            <span className="arrow-back">←</span>
            RETURN HOME
          </Link>
          
          {/* Show different sections based on activeSection */}
          {activeSection === 'paymentVerification' && (
            <section className="payment-verification-section">
              <div className="section-header">
                <div className="section-bar"></div>
                <h2>PAYMENT VERIFICATION</h2>
              </div>
              {loadingPayments ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#888', fontSize: 20 }}>Loading...</div>
              ) : paymentError ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'red', fontSize: 18 }}>{paymentError}</div>
              ) : (
                <div style={{ padding: 20 }}>
                  <table className="admin-table" style={{ width: '100%', background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>User</th>
                        <th>Class/Type</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Payment Proof</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* New payments from payments collection - only show for approval */}
                      {pendingPayments.filter(payment => payment.status === 'for approval').map(payment => (
                        <tr key={payment._id} style={{ background: payment.status === 'verified' ? '#eaffea' : payment.status === 'rejected' ? '#ffeaea' : '#fff' }}>
                          <td>{payment.isPackage ? 'Package Booking' : 'Booking'}</td>
                          <td>{payment.userName || 'N/A'}</td>
                          <td>
                            {payment.isPackage ? (
                              <div>
                                <strong>{payment.packageType} Package</strong>
                                <br />
                                <small>{payment.packageSessions} sessions</small>
                              </div>
                            ) : (
                              payment.className || 'Boxing'
                            )}
                          </td>
                          <td>
                            {payment.isPackage ? (
                              <div>
                                <strong>Package Booking</strong>
                                <br />
                                <small>{payment.packageBookings?.length || 0} sessions selected</small>
                              </div>
                            ) : (
                              `${new Date(payment.date).toLocaleDateString()} at ${payment.time}`
                            )}
                          </td>
                          <td>
                            {payment.isPackage ? (
                              `₱${payment.packagePrice}`
                            ) : payment.hasMembershipDiscount ? (
                              <div>
                                <div style={{ color: '#888', fontSize: 12, textDecoration: 'line-through' }}>
                                  ₱{payment.originalAmount}
                                </div>
                                <div style={{ color: '#2ecc40', fontSize: 11, fontWeight: 'bold' }}>
                                  -₱{payment.membershipDiscount} (Member)
                                </div>
                                <div style={{ fontWeight: 'bold', color: '#2ecc40' }}>
                                  ₱{payment.amount}
                                </div>
                                <div style={{ color: '#666', fontSize: 10, fontStyle: 'italic' }}>
                                  QR: {payment.qrCodeType === 'membership' ? 'Member QR' : 'Class QR'}
                                </div>
                              </div>
                            ) : (
                              `₱${payment.amount}`
                            )}
                          </td>
                          <td style={{ 
                            fontWeight: 600, 
                            color: payment.status === 'verified' ? '#2ecc40' : payment.status === 'rejected' ? '#e74c3c' : '#f39c12' 
                          }}>
                            {payment.status === 'for approval' ? 'For Approval' : 
                             payment.status === 'verified' ? 'Verified' : 
                             payment.status === 'rejected' ? 'Rejected' : payment.status}
                          </td>
                          <td>
                            {payment.paymentProof ? (
                              <img 
                                src={payment.paymentProof} 
                                alt="Payment Proof" 
                                style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee', cursor: 'pointer' }} 
                                onClick={() => handleImageClick(payment.paymentProof)}
                              />
                            ) : 'No proof'}
                            {payment.isPackage && payment.packageBookings && (
                              <div style={{ marginTop: 8, fontSize: 12 }}>
                                <details>
                                  <summary style={{ cursor: 'pointer', color: '#2ecc40' }}>
                                    View Package Details
                                  </summary>
                                  <div style={{ marginTop: 4 }}>
                                    {payment.packageBookings.map((booking, idx) => (
                                      <div key={idx} style={{ fontSize: 11, color: '#666' }}>
                                        {booking.coachName}: {new Date(booking.date).toLocaleDateString()} at {booking.time}
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              </div>
                            )}
                          </td>
                          <td>
                            {payment.status === 'for approval' ? (
                              <>
                                <button 
                                  onClick={() => handlePaymentAction(payment._id, 'approve')} 
                                  disabled={actionLoading === payment._id + 'approve'} 
                                  style={{ 
                                    background: '#2ecc40', 
                                    color: '#fff', 
                                    border: 'none', 
                                    borderRadius: 5, 
                                    padding: '7px 18px', 
                                    fontWeight: 600, 
                                    marginRight: 8, 
                                    cursor: 'pointer' 
                                  }}
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handlePaymentAction(payment._id, 'reject')} 
                                  disabled={actionLoading === payment._id + 'reject'} 
                                  style={{ 
                                    background: '#e74c3c', 
                                    color: '#fff', 
                                    border: 'none', 
                                    borderRadius: 5, 
                                    padding: '7px 18px', 
                                    fontWeight: 600, 
                                    cursor: 'pointer' 
                                  }}
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span style={{ color: '#888' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {/* Legacy bookings (if any) */}
                      {pendingBookings.map(booking => (
                        <tr key={`booking-${booking._id}`}>
                          <td>Booking (Legacy)</td>
                          <td>{booking.clientName || booking.userId || 'N/A'}</td>
                          <td>{booking.className || booking.class || 'N/A'}</td>
                          <td>{booking.date}</td>
                          <td>{booking.amount ? `₱${booking.amount}` : 'N/A'}</td>
                          <td>
                            {booking.paymentProof ? (
                              <img 
                                src={booking.paymentProof} 
                                alt="Proof" 
                                style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee', cursor: 'pointer' }} 
                                onClick={() => handleImageClick(booking.paymentProof)}
                              />
                            ) : 'No proof'}
                          </td>
                          <td>
                            <button style={{ background: '#2ecc40', color: '#fff', marginRight: 8, border: 'none', borderRadius: 4, padding: '6px 14px', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleBookingAction(booking._id, 'verified')}>Approve</button>
                            <button style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleBookingAction(booking._id, 'rejected')}>Reject</button>
                          </td>
                        </tr>
                      ))}
                      {(pendingPayments.filter(payment => payment.status === 'for approval').length === 0 && pendingBookings.length === 0) && (
                        <tr><td colSpan={8} style={{ textAlign: 'center', color: '#888', fontSize: 18 }}>No pending payments.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {activeSection === 'rates' && (
            <section className="rates-section">
              <div className="section-header">
                <div className="section-bar"></div>
                <h2>RATES</h2>
              </div>
              {/* RATES CARDS AT THE TOP */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '32px',
                maxWidth: 1100,
                margin: '0 auto 40px auto',
                padding: '0 10px',
                justifyContent: 'center',
                alignItems: 'stretch',
              }}>
                {rates.length === 0 && <div>No rates found.</div>}
                {rates.map((rate, idx) => (
                  editingRate && editingRate._id === rate._id ? (
                    <div key={rate._id || idx} className="edit-rate-form edit-card" style={{ background: '#f8fff8', border: '1.5px solid #2ecc40', borderRadius: 14, boxShadow: '0 2px 12px rgba(44,204,64,0.08)', padding: 18, marginBottom: 8 }}>
                        <h3 style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 12, fontFamily: 'Courier New, Courier, monospace', textAlign: 'center' }}>Edit Rate</h3>
                        <input
                          type="text"
                          value={editRateName}
                          onChange={e => setEditRateName(e.target.value)}
                          placeholder="Class Name"
                          className="edit-input"
                          style={{ width: '100%', marginBottom: 8, borderRadius: 6, border: '1px solid #ccc', padding: 6, fontSize: 15 }}
                        />
                        <input
                          type="number"
                          value={editRatePrice}
                          onChange={e => setEditRatePrice(e.target.value)}
                          placeholder="Price"
                          className="edit-input"
                          style={{ width: '100%', marginBottom: 8, borderRadius: 6, border: '1px solid #ccc', padding: 6, fontSize: 15 }}
                        />
                        {/* 🔥 URL Input for Edit (ONLY OPTION) */}
                        <div style={{ position: 'relative', marginBottom: 12 }}>
                          <FaLink style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                            <input
                            type="url" 
                            placeholder="Paste image URL here (imgur.com, postimages.org, etc. - Google Drive not supported)" 
                            value={editRateImageUrl} 
                            onChange={e => setEditRateImageUrl(e.target.value)} 
                            style={{ paddingLeft: 40, width: '100%', borderRadius: 6, border: '2px solid #1ee43b', padding: '10px 10px 10px 40px' }} 
                            />

                          </div>
                                                  {editRateImageUrl && (
                          <img 
                            src={editRateImageUrl} 
                            alt="Rate Preview" 
                            style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 6, marginBottom: 8, background: '#f8f8f8' }}
                            onError={(e) => {
                              console.error('Image failed to load:', editRateImageUrl);
                              e.target.style.display = 'none';
                            }}
                          />
                        )}
                        <textarea
                          placeholder="Rates Info (Schedule, Membership, etc.)"
                          value={editRateInfo}
                          onChange={e => setEditRateInfo(e.target.value)}
                          style={{ width: '100%', minHeight: 60, marginBottom: 10, borderRadius: 6, border: '1px solid #ccc', padding: 8, fontSize: 15 }}
                        />
                        <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'center', marginTop: 8 }}>
                          <button className="save-edit-rate-btn" onClick={saveEditRate} style={{ background: '#145a32', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}>Save</button>
                          <button className="cancel-edit-rate-btn" onClick={() => setEditingRate(null)} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}>Cancel</button>
                        </div>
                        {rateMessage && <p className="admin-message">{rateMessage}</p>}
                    </div>
                  ) : (
                    <div key={rate._id || idx} className="rate-card" style={{
                      background: '#fff',
                      borderRadius: 14,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                      padding: '18px 12px 12px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minHeight: 260,
                      minWidth: 0,
                      maxWidth: 200,
                      width: '100%',
                      overflow: 'hidden',
                      margin: '0 auto',
                    }}>
                      <img src={rate.image || '/images/placeholder.jpg'} alt={rate.name} style={{ width: '100%', height: 60, objectFit: 'contain', marginBottom: 10, borderRadius: 6, background: '#f8f8f8' }} />
                        <div style={{ fontWeight: 'bold', fontSize: 22, letterSpacing: 2, margin: '10px 0 8px 0', fontFamily: 'Courier New, Courier, monospace', textAlign: 'center' }}>{rate.name}</div>
                        <div style={{ color: '#fff', background: '#145a32', borderRadius: 8, padding: '6px 22px', fontWeight: 'bold', fontSize: 18, marginBottom: 12, letterSpacing: 2, fontFamily: 'Courier New, Courier, monospace' }}>
                          ₱{rate.price}
                        </div>
                        <button onClick={() => handleEditRate(rate)} style={{ background: '#145a32', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, marginBottom: 8, cursor: 'pointer' }}>EDIT</button>
                        <button onClick={() => handleDelete('rates', rate._id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}>DELETE</button>
                  </div>
                  )
                ))}
              </div>
              {/* FORMS BELOW */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 24,
                margin: '18px 0 32px 0',
                alignItems: 'stretch',
                justifyContent: 'flex-start',
              }}>
                <div style={{
                  background: 'linear-gradient(90deg, #eaffea 0%, #fff 100%)',
                  borderRadius: 10,
                  maxWidth: 400,
                  width: '100%',
                  padding: 18,
                  boxShadow: '0 2px 12px rgba(44,204,64,0.08)',
                  border: '1px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  position: 'relative',
                  flex: '1 1 340px',
                  minWidth: 320,
                  minHeight: 320,
                  height: '100%',
                }}>
                  <div style={{ width: 5, height: '100%', background: '#2ecc40', borderRadius: 4, marginRight: 16, minHeight: 90 }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ color: '#2ecc40', fontSize: 20, marginRight: 8 }}>💸</span>
                      <span style={{ fontWeight: 700, fontSize: 18, color: '#181818', letterSpacing: 0.5, fontFamily: 'Inter, Arial, sans-serif' }}>Edit Rates Heading & Banner</span>
                    </div>
                    <label style={{ fontWeight: 500, marginBottom: 2, display: 'block', color: '#145a32', fontSize: 14 }}>Heading</label>
                    <input
                      type="text"
                      name="heading"
                      value={ratesSettings.heading}
                      onChange={handleRatesSettingsChange}
                      placeholder="Rates Heading"
                      style={{ width: '100%', marginBottom: 10, padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 15, fontFamily: 'Inter, Arial, sans-serif' }}
                    />
                    <label style={{ fontWeight: 500, marginBottom: 2, display: 'block', color: '#145a32', fontSize: 14 }}>Banner Text</label>
                    <textarea
                      name="banner"
                      value={ratesSettings.banner}
                      onChange={handleRatesSettingsChange}
                      placeholder="Rates Banner Text"
                      style={{ width: '100%', minHeight: 48, marginBottom: 10, padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 15, fontFamily: 'Inter, Arial, sans-serif', resize: 'vertical' }}
                    />
                    <button onClick={saveRatesSettings} style={{ background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 20, padding: '7px 22px', fontWeight: 600, fontSize: 15, transition: 'background 0.2s', cursor: 'pointer', marginTop: 2, boxShadow: '0 1px 4px rgba(44,204,64,0.08)' }}
                      onMouseOver={e => e.target.style.background = '#145a32'}
                      onMouseOut={e => e.target.style.background = '#2ecc40'}
                    >Save</button>
                    {ratesSettingsMessage && <span style={{ marginLeft: 12, color: '#145a32', fontWeight: 500, fontSize: 14 }}>{ratesSettingsMessage}</span>}
                  </div>
                </div>
                <div style={{ flex: '1 1 340px', minWidth: 320, minHeight: 320, height: '100%', display: 'flex', alignItems: 'stretch' }}>
                  <div className="add-rate-form animated-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                    <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FaMoneyBillWave color="#1ee43b" size={28} /> Add New Rate
                    </h3>
                    <div style={{ width: '100%', marginBottom: 16, display: 'flex', gap: 12 }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <FaMoneyBillWave style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                        <input type="text" placeholder="Class Name" value={newRateClassName} onChange={e => setNewRateClassName(e.target.value)} style={{ paddingLeft: 40, width: '100%' }} />
                      </div>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <FaMoneyBillWave style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                        <input type="number" placeholder="Price" value={newRatePrice} onChange={e => setNewRatePrice(e.target.value)} style={{ paddingLeft: 40, width: '100%' }} />
                      </div>
                    </div>
                    {/* 🔥 URL Input for Image (ONLY OPTION) */}
                    <div style={{ position: 'relative', marginBottom: 12 }}>
                      <FaLink style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                      <input 
                        type="url" 
                        placeholder="Paste image URL here (imgur.com, postimages.org, etc. - Google Drive not supported)" 
                        value={newRateImageUrl} 
                        onChange={e => setNewRateImageUrl(e.target.value)} 
                        style={{ paddingLeft: 40, width: '100%', borderRadius: 6, border: '2px solid #1ee43b', padding: '10px 10px 10px 40px' }} 
                      />
                  </div>
                                         {newRateImageUrl && (
                       <img 
                         src={newRateImageUrl} 
                         alt="Rate Preview" 
                         style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 6, marginBottom: 10, background: '#f8f8f8' }}
                         onError={(e) => {
                           console.error('Image failed to load:', newRateImageUrl);
                           e.target.style.display = 'none';
                         }}
                       />
                    )}
                    <textarea
                      placeholder="Rates Info (Schedule, Membership, etc.)"
                      value={newRateInfo}
                      onChange={e => setNewRateInfo(e.target.value)}
                      style={{ width: '100%', minHeight: 60, marginBottom: 10, borderRadius: 6, border: '1px solid #ccc', padding: 8, fontSize: 15 }}
                    />
                    <button className="add-rate-btn" onClick={handleAddRate} style={{ marginTop: 8, width: '100%' }}>ADD RATE</button>
                {rateMessage && <p className="admin-message">{rateMessage}</p>}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'promos' && (
            <section className="promos-section">
              <div className="section-header">
                <div className="section-bar"></div>
                <h2>PROMOS</h2>
              </div>
              {/* PROMO CARDS AT THE TOP */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '32px',
                maxWidth: 1100,
                margin: '0 auto 40px auto',
                padding: '0 10px',
                justifyContent: 'center',
                alignItems: 'stretch',
              }}>
                {promos.map((promo, idx) => (
                  editingPromo && editingPromo._id === promo._id ? (
                    <div key={promo._id || idx} className="edit-promo-form edit-card" style={{ background: '#f8fff8', border: '1.5px solid #2ecc40', borderRadius: 14, boxShadow: '0 2px 12px rgba(44,204,64,0.08)', padding: 18, marginBottom: 8 }}>
                      <h3 style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 12, fontFamily: 'Courier New, Courier, monospace', textAlign: 'center' }}>Edit Promo</h3>
                      <input
                        type="text"
                        value={editPromoName}
                        onChange={e => setEditPromoName(e.target.value)}
                        placeholder="Promo Name"
                        className="edit-input"
                        style={{ width: '100%', marginBottom: 8, borderRadius: 6, border: '1px solid #ccc', padding: 6, fontSize: 15 }}
                      />
                      <input
                        type="number"
                        value={editPromoPrice}
                        onChange={e => setEditPromoPrice(e.target.value)}
                        placeholder="Price"
                        className="edit-input"
                        style={{ width: '100%', marginBottom: 8, borderRadius: 6, border: '1px solid #ccc', padding: 6, fontSize: 15 }}
                      />
                      {/* 🔥 URL Input for Edit Promo Image */}
                      <div style={{ position: 'relative', width: '100%', marginBottom: 10 }}>
                        <FaImage style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none', fontSize: 16 }} />
                        <input 
                          type="text" 
                          placeholder="Promo Image URL" 
                          value={editPromoImageUrl} 
                          onChange={e => setEditPromoImageUrl(e.target.value)} 
                          style={{ paddingLeft: 40, width: '100%', padding: '6px 6px 6px 40px', borderRadius: 6, border: '1px solid #ccc', fontSize: 15 }} 
                        />
                      </div>
                      
                      {/* 🔥 Preview Image */}
                      {editPromoImageUrl && (
                        <img 
                          src={editPromoImageUrl} 
                          alt="Promo Preview" 
                          style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 6, marginBottom: 8, background: '#f8f8f8' }} 
                        />
                      )}
                      <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'center', marginTop: 8 }}>
                        <button className="save-edit-promo-btn" onClick={saveEditPromo} style={{ background: '#145a32', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}>Save</button>
                        <button className="cancel-edit-promo-btn" onClick={() => setEditingPromo(null)} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}>Cancel</button>
                      </div>
                      {promoMessage && <p className="admin-message">{promoMessage}</p>}
                      <textarea
                        placeholder="Promo Info (Schedule, Rates, etc.)"
                        value={editPromoInfo}
                        onChange={e => setEditPromoInfo(e.target.value)}
                        style={{ width: '100%', minHeight: 60, marginBottom: 10, borderRadius: 6, border: '1px solid #ccc', padding: 8, fontSize: 15 }}
                      />
                    </div>
                  ) : (
                    <div key={promo._id || idx} className="rate-card" style={{
                      background: '#fff',
                      borderRadius: 14,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                      padding: '18px 12px 12px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minHeight: 260,
                      minWidth: 0,
                      maxWidth: 200,
                      width: '100%',
                      overflow: 'hidden',
                      margin: '0 auto',
                    }}>
                      <img src={promo.image || '/images/placeholder.jpg'} alt={promo.name} style={{ width: '100%', height: 60, objectFit: 'contain', marginBottom: 10, borderRadius: 6, background: '#f8f8f8' }} />
                      <div style={{ fontWeight: 'bold', fontSize: 22, letterSpacing: 2, margin: '10px 0 8px 0', fontFamily: 'Courier New, Courier, monospace', textAlign: 'center' }}>{promo.name}</div>
                         <div style={{ color: '#fff', background: '#145a32', borderRadius: 8, padding: '6px 22px', fontWeight: 'bold', fontSize: 18, marginBottom: 12, letterSpacing: 2, fontFamily: 'Courier New, Courier, monospace' }}>
                           ₱{promo.price}
                         </div>
                      <button onClick={() => handleEditPromo(promo)} style={{ background: '#145a32', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, marginBottom: 8, cursor: 'pointer' }}>EDIT</button>
                      <button onClick={() => handleDelete('promos', promo._id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}>DELETE</button>
                   </div>
                  )
                 ))}
              </div>
              {/* FORMS BELOW */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 24,
                margin: '18px 0 32px 0',
                alignItems: 'stretch',
                justifyContent: 'flex-start',
              }}>
                <div style={{
                  background: 'linear-gradient(90deg, #eaffea 0%, #fff 100%)',
                  borderRadius: 10,
                  maxWidth: 400,
                  width: '100%',
                  padding: 18,
                  boxShadow: '0 2px 12px rgba(44,204,64,0.08)',
                  border: '1px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  position: 'relative',
                  flex: '1 1 340px',
                  minWidth: 320,
                  minHeight: 320,
                  height: '100%',
                  marginTop: 32,
                }}>
                  <div style={{ width: 5, height: '100%', background: '#2ecc40', borderRadius: 4, marginRight: 16, minHeight: 90 }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ color: '#2ecc40', fontSize: 20, marginRight: 8 }}>🎁</span>
                      <span style={{ fontWeight: 700, fontSize: 18, color: '#181818', letterSpacing: 0.5, fontFamily: 'Inter, Arial, sans-serif' }}>Edit Promo Heading & Banner</span>
                    </div>
                    <label style={{ fontWeight: 500, marginBottom: 2, display: 'block', color: '#145a32', fontSize: 14 }}>Heading</label>
                    <input
                      type="text"
                      name="heading"
                      value={promoSettings.heading}
                      onChange={handlePromoSettingsChange}
                      placeholder="Promo Heading"
                      style={{ width: '100%', marginBottom: 10, padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 15, fontFamily: 'Inter, Arial, sans-serif' }}
                    />
                    <label style={{ fontWeight: 500, marginBottom: 2, display: 'block', color: '#145a32', fontSize: 14 }}>Banner Text</label>
                    <textarea
                      name="banner"
                      value={promoSettings.banner}
                      onChange={handlePromoSettingsChange}
                      placeholder="Promo Banner Text"
                      style={{ width: '100%', minHeight: 48, marginBottom: 10, padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 15, fontFamily: 'Inter, Arial, sans-serif', resize: 'vertical' }}
                    />
                    <button onClick={savePromoSettings} style={{ background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 20, padding: '7px 22px', fontWeight: 600, fontSize: 15, transition: 'background 0.2s', cursor: 'pointer', marginTop: 2, boxShadow: '0 1px 4px rgba(44,204,64,0.08)' }}
                      onMouseOver={e => e.target.style.background = '#145a32'}
                      onMouseOut={e => e.target.style.background = '#2ecc40'}
                    >Save</button>
                    {promoSettingsMessage && <span style={{ marginLeft: 12, color: '#145a32', fontWeight: 500, fontSize: 14 }}>{promoSettingsMessage}</span>}
                  </div>
                </div>
                <div style={{ flex: '1 1 340px', minWidth: 320, minHeight: 320, height: '100%', display: 'flex', alignItems: 'stretch' }}>
                  <div className="add-promo-form animated-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                    <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FaGift color="#1ee43b" size={28} /> Add New Promo
                    </h3>
                    <div style={{ width: '100%', marginBottom: 16, display: 'flex', gap: 12 }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <FaGift style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                        <input type="text" placeholder="Promo Name" value={newPromoName} onChange={e => setNewPromoName(e.target.value)} style={{ paddingLeft: 40, width: '100%' }} />
                      </div>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <FaMoneyBillWave style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                        <input type="number" placeholder="Price" value={newPromoPrice} onChange={e => setNewPromoPrice(e.target.value)} style={{ paddingLeft: 40, width: '100%' }} />
                      </div>
                    </div>
                    {/* 🔥 URL Input for Promo Image */}
                    <div style={{ position: 'relative', width: '100%', marginBottom: 10 }}>
                      <FaImage style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                      <input 
                        type="text" 
                        placeholder="Promo Image URL" 
                        value={newPromoImageUrl} 
                        onChange={e => setNewPromoImageUrl(e.target.value)} 
                        style={{ paddingLeft: 40, width: '100%', padding: '8px 8px 8px 40px', borderRadius: 6, border: '1px solid #ccc', fontSize: 15 }} 
                      />
                    </div>
                    
                    {/* 🔥 File Upload for Promo Image */}
                    <label className="upload-box" style={{ width: '100%', marginBottom: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 32, color: '#1ee43b' }}>+</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              // Preview for user feedback
                              const reader = new FileReader();
                              reader.onloadend = () => setNewPromoImage(reader.result);
                              reader.readAsDataURL(file);
                              // Upload file and get URL
                              handlePromoImageUpload(file);
                            } else {
                              setNewPromoImage('');
                              setNewPromoImageUrl('');
                            }
                          }} 
                          style={{ display: 'none' }} 
                        />
                        <span style={{ color: '#888', fontSize: '0.95rem', marginTop: 4 }}>Or upload promo image</span>
                      </div>
                    </label>
                    
                    {/* 🔥 Preview Image */}
                    {(newPromoImage || newPromoImageUrl) && (
                      <img 
                        src={newPromoImage || newPromoImageUrl} 
                        alt="Promo Preview" 
                        style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 6, marginBottom: 10, background: '#f8f8f8' }} 
                      />
                    )}
                    <textarea
                      placeholder="Promo Info (Schedule, Rates, etc.)"
                      value={newPromoInfo}
                      onChange={e => setNewPromoInfo(e.target.value)}
                      style={{ width: '100%', minHeight: 60, marginBottom: 10, borderRadius: 6, border: '1px solid #ccc', padding: 8, fontSize: 15 }}
                    />
                    <button className="add-promo-btn" onClick={handleAddPromo} style={{ marginTop: 8, width: '100%' }}>ADD PROMO</button>
                {promoMessage && <p className="admin-message">{promoMessage}</p>}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'coaches' && (
            <section className="coaches-section">
              <div className="section-header" style={{ paddingTop: '40px' }}>
                <div className="section-bar"></div>
                <h2 className="admin-section-title" style={{
                  fontFamily: 'Nico Moji, Arial Rounded MT Bold, Arial, sans-serif',
                  fontSize: '2.5rem',
                  color: '#181818',
                  fontWeight: 'bold',
                  letterSpacing: '3px',
                  margin: '0 0 24px 0',
                  borderLeft: '6px solid #2ecc40',
                  paddingLeft: '10px',
                  textTransform: 'uppercase',
                  background: 'none',
                  boxShadow: 'none'
                }}>COACHES</h2>
              </div>
              <div className="coaches-grid">
                {coachesLoading && <div>Loading coaches...</div>}
                {coachesError && <div style={{ color: 'red' }}>{coachesError}</div>}
                {!coachesLoading && !coachesError && coaches.length === 0 && <div>No coaches found.</div>}
                {!coachesLoading && !coachesError && coaches.map(coach => (
                  editingCoach === coach._id ? (
                    <div key={coach._id} className="edit-coach-form edit-card">
                      <h3>Edit Coach</h3>
                      <input type="text" name="firstname" value={editCoachData.firstname} onChange={handleEditCoachChange} placeholder="First Name" className="edit-input" />
                      <input type="text" name="lastname" value={editCoachData.lastname} onChange={handleEditCoachChange} placeholder="Last Name" className="edit-input" />
                      <input type="text" name="username" value={editCoachData.username} onChange={handleEditCoachChange} placeholder="Username" className="edit-input" />
                      <input type="email" name="email" value={editCoachData.email} onChange={handleEditCoachChange} placeholder="Email" className="edit-input" />
                      <textarea
                        name="biography"
                        value={editCoachData.biography}
                        onChange={handleEditCoachChange}
                        placeholder="Biography"
                        className="edit-input"
                        rows={6}
                        style={{ width: '100%', marginBottom: 12 }}
                      />
                      <input type="text" name="specialties" placeholder="Classes/Specialties (comma separated, e.g. Muay Thai, BJJ)" value={editCoachSpecialties} onChange={e => setEditCoachSpecialties(e.target.value)} className="edit-input" />
                      <select name="belt" value={editCoachBelt} onChange={e => setEditCoachBelt(e.target.value)} className="edit-input" style={{ marginBottom: 12, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}>
                        <option value="">Select Belt</option>
                        <option value="Blue">Blue</option>
                        <option value="Purple">Purple</option>
                        <option value="Brown">Brown</option>
                        <option value="Black">Black</option>
                      </select>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="number" min="0" name="editProRecordWins" placeholder="Wins" value={editProRecordWins} onChange={e => setEditProRecordWins(e.target.value)} className="edit-input" style={{ width: 80 }} />
                        <span style={{ fontWeight: 'bold' }}>-</span>
                        <input type="number" min="0" name="editProRecordLosses" placeholder="Losses" value={editProRecordLosses} onChange={e => setEditProRecordLosses(e.target.value)} className="edit-input" style={{ width: 80 }} />
                        <span style={{ fontSize: 13, color: '#888', marginLeft: 8 }}>(Pro Record: wins - losses)</span>
                      </div>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <input
                          type={showCoachPassword ? 'text' : 'password'}
                          name="password"
                          value={editCoachData.password}
                          onChange={handleEditCoachChange}
                          placeholder="Password (leave blank to keep current)"
                          className="edit-input"
                          style={{ width: '100%', paddingRight: 36, boxSizing: 'border-box' }}
                        />
                        <span
                          onClick={() => setShowCoachPassword(v => !v)}
                          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888', fontSize: 18 }}
                          title={showCoachPassword ? 'Hide password' : 'Show password'}
                        >
                          {showCoachPassword ? <FaEyeSlash color="#181818" /> : <FaEye color="#181818" />}
                        </span>
                      </div>
                      <div className="profile-upload">
                        <div className="upload-placeholder">
                          {editCoachData.profilePic ? (
                            <img src={editCoachData.profilePic} alt="Profile Preview" style={{ width: '100%', height: 60, objectFit: 'cover' }} />
                          ) : (
                            <span>+</span>
                          )}
                        </div>
                        <button type="button" onClick={() => editCoachImageInputRef.current && editCoachImageInputRef.current.click()} style={{ marginTop: 8, marginBottom: 4 }}>Change Picture</button>
                        <input
                          ref={editCoachImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditCoachData(prev => ({ ...prev, profilePic: reader.result }));
                              };
                              reader.readAsDataURL(file);
                            } else {
                              setEditCoachData(prev => ({ ...prev, profilePic: '' }));
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                        <p>Upload profile picture (Optional)</p>
                      </div>
                      <div className="edit-btn-row">
                        <button className="save-edit-coach-btn edit-save-btn" onClick={() => saveEditCoach(coach._id)}>Save</button>
                        <button className="cancel-edit-coach-btn edit-cancel-btn" onClick={cancelEditCoach}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div key={coach._id} className="rate-card" style={{
                      background: '#fff',
                      borderRadius: 14,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                      padding: '18px 12px 12px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minHeight: 260,
                      minWidth: 0,
                      maxWidth: 200,
                      width: '100%',
                      overflow: 'hidden',
                      margin: '0 auto',
                    }}>
                      <img src={coach.profilePic || '/images/placeholder.jpg'} alt={coach.firstname + ' ' + coach.lastname} style={{ width: '100%', height: 60, objectFit: 'contain', marginBottom: 10, borderRadius: 6, background: '#f8f8f8' }} />
                      <div style={{ fontWeight: 'bold', fontSize: 22, letterSpacing: 2, margin: '10px 0 8px 0', fontFamily: 'Courier New, Courier, monospace', textAlign: 'center' }}>{coach.firstname} {coach.lastname}</div>
                      <div style={{ fontFamily: 'Courier New, Courier, monospace', fontSize: 15, marginBottom: 4 }}>{coach.username}</div>
                      <div style={{ fontFamily: 'Courier New, Courier, monospace', fontSize: 14, marginBottom: 4 }}>{coach.email}</div>
                      <button className="edit-button" onClick={() => handleEditCoach(coach)} style={{ background: '#145a32', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, marginBottom: 8, cursor: 'pointer' }}>EDIT</button>
                      <button className="delete-button" onClick={() => handleDeleteCoach(coach._id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}>REMOVE</button>
                    </div>
                  )
                ))}
              </div>

              {/* Add Coach Form */}
              <div className="add-coach-form animated-card">
                <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FaUserAlt color="#1ee43b" size={28} /> Add New Coach
                </h3>
                <div style={{ width: '100%', marginBottom: 16, display: 'flex', gap: 12 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <FaEnvelope style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ paddingLeft: 40, width: '100%' }} />
                  </div>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <FaUser style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                    <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{ paddingLeft: 40, width: '100%' }} />
                  </div>
                </div>
                <div style={{ width: '100%', marginBottom: 16, display: 'flex', gap: 12 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <FaUser style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                    <input type="text" placeholder="First Name" value={firstname} onChange={e => setFirstname(e.target.value)} style={{ paddingLeft: 40, width: '100%' }} />
                  </div>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <FaUser style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                    <input type="text" placeholder="Last Name" value={lastname} onChange={e => setLastname(e.target.value)} style={{ paddingLeft: 40, width: '100%' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', marginBottom: 16 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <FaTrophy style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                    <input type="number" min="0" placeholder="Wins" value={proRecordWins} onChange={e => setProRecordWins(e.target.value)} style={{ borderRadius: 6, border: '1px solid #ccc', padding: '8px 8px 8px 40px', width: '100%' }} />
                  </div>
                  <span style={{ fontWeight: 'bold' }}>-</span>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <FaTrophy style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#e43b1e', pointerEvents: 'none' }} />
                    <input type="number" min="0" placeholder="Losses" value={proRecordLosses} onChange={e => setProRecordLosses(e.target.value)} style={{ borderRadius: 6, border: '1px solid #ccc', padding: '8px 8px 8px 40px', width: '100%' }} />
                  </div>
                  <span style={{ fontSize: 13, color: '#888', marginLeft: 8 }}>(Pro Record: wins - losses)</span>
                </div>
                <div style={{ position: 'relative', width: '100%', marginBottom: 16 }}>
                  <FaLock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                  <input
                    type={showCoachPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ width: '100%', paddingLeft: 40, paddingRight: 36, boxSizing: 'border-box' }}
                  />
                  <span
                    onClick={() => setShowCoachPassword(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888', fontSize: 18 }}
                    title={showCoachPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCoachPassword ? <FaEyeSlash color="#181818" /> : <FaEye color="#181818" />}
                  </span>
                </div>
                <textarea placeholder="Biography" value={bio} onChange={e => setBio(e.target.value)} style={{ marginBottom: 16 }}></textarea>
                <input type="text" placeholder="Classes/Specialties (comma separated, e.g. Muay Thai, BJJ)" value={specialties} onChange={e => setSpecialties(e.target.value)} style={{ marginBottom: 16 }} />
                <select value={belt} onChange={e => setBelt(e.target.value)} style={{ marginBottom: 16, padding: 8, borderRadius: 6, border: '1px solid #ccc', width: '100%' }}>
                  <option value="">Select Belt</option>
                  <option value="Blue">Blue</option>
                  <option value="Purple">Purple</option>
                  <option value="Brown">Brown</option>
                  <option value="Black">Black</option>
                </select>
                <label className="upload-box" style={{ width: '100%', marginBottom: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 32, color: '#1ee43b' }}>+</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                    <span style={{ color: '#888', fontSize: '0.95rem', marginTop: 4 }}>Upload coaches profile picture</span>
                  </div>
                </label>
                {profilePic && (
                  <img src={profilePic} alt="Profile Preview" style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 6, marginBottom: 10, background: '#f8f8f8' }} />
                )}
                <button className="add-coach-btn" onClick={handleAddCoach} style={{ marginTop: 8, width: '100%' }}>ADD COACH</button>
              </div>
              {message && <p className="admin-message">{message}</p>}
            </section>
          )}

          {activeSection === 'payroll' && (
            <>
              <div className="section-header" style={{ paddingTop: '40px' }}>
                <div className="section-bar"></div>
                <h2 className="admin-section-title" style={{
                  fontFamily: 'Nico Moji, Arial Rounded MT Bold, Arial, sans-serif',
                  fontSize: '2.5rem',
                  color: '#181818',
                  fontWeight: 'bold',
                  letterSpacing: '3px',
                  margin: '0 0 24px 0',
                  borderLeft: '6px solid #2ecc40',
                  paddingLeft: '10px',
                  textTransform: 'uppercase',
                  background: 'none',
                  boxShadow: 'none'
                }}>PAYROLL</h2>
              </div>
              <section className="payroll-section">
                <Payroll />
              </section>
            </>
          )}

          {activeSection === 'analytics' && (
            <>
              <div className="section-header" style={{ paddingTop: '40px' }}>
                <div className="section-bar"></div>
                <h2 className="admin-section-title" style={{
                  fontFamily: 'Nico Moji, Arial Rounded MT Bold, Arial, sans-serif',
                  fontSize: '2.5rem',
                  color: '#181818',
                  fontWeight: 'bold',
                  letterSpacing: '3px',
                  margin: '0 0 24px 0',
                  borderLeft: '6px solid #2ecc40',
                  paddingLeft: '10px',
                  textTransform: 'uppercase',
                  background: 'none',
                  boxShadow: 'none'
                }}>FINANCIAL ANALYTICS</h2>
              </div>
              <section className="analytics-section">
                <FinancialAnalyticsDashboard />
              </section>
            </>
          )}

          {activeSection === 'footer' && (
            <section className="footer-section animated-card" style={{ maxWidth: 520, margin: '0 auto', background: '#fff', borderRadius: 12, padding: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <h2 style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <FaRegEdit color="#1ee43b" size={28} /> Edit Footer
              </h2>
              <form style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 32px 24px 32px' }} onSubmit={e => { e.preventDefault(); saveFooter(); }}>
                <div style={{ position: 'relative' }}>
                  <FaHeading style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                  <input type="text" name="title" value={footerData.title} onChange={handleFooterChange} placeholder="Title" style={{ borderRadius: 6, border: '1px solid #ccc', padding: '8px 8px 8px 40px', width: '100%' }} />
                </div>
                <div style={{ position: 'relative' }}>
                  <FaAlignLeft style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                  <input type="text" name="description" value={footerData.description} onChange={handleFooterChange} placeholder="Description" style={{ borderRadius: 6, border: '1px solid #ccc', padding: '8px 8px 8px 40px', width: '100%' }} />
                </div>
                <div style={{ position: 'relative' }}>
                  <FaMapMarkerAlt style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                  <input type="text" name="contact.address" value={footerData.contact.address} onChange={handleFooterChange} placeholder="Address" style={{ borderRadius: 6, border: '1px solid #ccc', padding: '8px 8px 8px 40px', width: '100%' }} />
                </div>
                <div style={{ position: 'relative' }}>
                  <FaPhoneAlt style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                  <input type="text" name="contact.phone" value={footerData.contact.phone} onChange={handleFooterChange} placeholder="Phone" style={{ borderRadius: 6, border: '1px solid #ccc', padding: '8px 8px 8px 40px', width: '100%' }} />
                </div>
                <div style={{ position: 'relative' }}>
                  <FaEnvelope style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                  <input type="text" name="contact.email" value={footerData.contact.email} onChange={handleFooterChange} placeholder="Email" style={{ borderRadius: 6, border: '1px solid #ccc', padding: '8px 8px 8px 40px', width: '100%' }} />
                </div>
                <div style={{ position: 'relative' }}>
                  <FaFacebook style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                  <input type="text" name="social.facebook" value={footerData.social.facebook} onChange={handleFooterChange} placeholder="Facebook" style={{ borderRadius: 6, border: '1px solid #ccc', padding: '8px 8px 8px 40px', width: '100%' }} />
                </div>
                <div style={{ position: 'relative' }}>
                  <FaInstagram style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                  <input type="text" name="social.instagram" value={footerData.social.instagram} onChange={handleFooterChange} placeholder="Instagram" style={{ borderRadius: 6, border: '1px solid #ccc', padding: '8px 8px 8px 40px', width: '100%' }} />
                </div>
                <div style={{ position: 'relative' }}>
                  <FaYoutube style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                  <input type="text" name="social.youtube" value={footerData.social.youtube} onChange={handleFooterChange} placeholder="YouTube" style={{ borderRadius: 6, border: '1px solid #ccc', padding: '8px 8px 8px 40px', width: '100%' }} />
                </div>
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <button type="submit" style={{ background: '#145a32', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontWeight: 'bold', fontSize: 16, cursor: 'pointer', width: '100%' }}>Save Footer</button>
                </div>
                {footerMessage && <p className="admin-message" style={{ textAlign: 'center', color: '#145a32', marginTop: 8 }}>{footerMessage}</p>}
              </form>
            </section>
          )}

          {activeSection === 'home' && (
            <section className="home-section" style={{ maxWidth: 600, margin: '0 auto', background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <h2 style={{ marginBottom: 24 }}>Edit Home Page</h2>
              <form style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} onSubmit={e => { e.preventDefault(); saveHomeContent(); }}>
                <label style={{ gridColumn: '1/2', alignSelf: 'center' }}>Title</label>
                <input type="text" name="title" value={homeContent.title} onChange={handleHomeContentChange} style={{ borderRadius: 6, border: '1px solid #ccc', padding: 8 }} />
                <label style={{ gridColumn: '1/2', alignSelf: 'center' }}>Subtitle</label>
                <input type="text" name="subtitle" value={homeContent.subtitle} onChange={handleHomeContentChange} style={{ borderRadius: 6, border: '1px solid #ccc', padding: 8 }} />
                <label style={{ gridColumn: '1/2', alignSelf: 'center' }}>Classes Title</label>
                <input type="text" name="classesTitle" value={homeContent.classesTitle} onChange={handleHomeContentChange} style={{ borderRadius: 6, border: '1px solid #ccc', padding: 8 }} />
                <label style={{ gridColumn: '1/2', alignSelf: 'center' }}>Classes Background URL</label>
                <input type="text" name="classesBg" value={homeContent.classesBg} onChange={handleHomeContentChange} style={{ borderRadius: 6, border: '1px solid #ccc', padding: 8 }} />
                <button type="submit" style={{ gridColumn: '1/3', marginTop: 16, background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 6, padding: 12, fontWeight: 'bold', fontSize: 16 }}>Save</button>
              </form>
              {homeMessage && <div style={{ marginTop: 16, color: '#2ecc40', fontWeight: 'bold' }}>{homeMessage}</div>}
            </section>
          )}

          {activeSection === 'classes' && (
            <section className="classes-section">
              <div className="section-header">
                <h2>CLASSES</h2>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '32px',
                maxWidth: 1100,
                margin: '0 auto 40px auto',
                padding: '0 10px',
                justifyContent: 'center',
                alignItems: 'stretch',
              }}>
                {classList.map((classItem, idx) => (
                  editingClass && editingClass._id === classItem._id ? (
                    <div key={classItem._id || idx} className="edit-class-form edit-card">
                      <h3>Edit Class</h3>
                      <input
                        type="text"
                        value={editClassName}
                        onChange={e => setEditClassName(e.target.value)}
                        placeholder="Class Name"
                        className="edit-input"
                      />
                      {/* 🔥 URL Input for Edit Class Video */}
                      <div style={{ position: 'relative', width: '100%', marginBottom: 10 }}>
                        <FaFileVideo style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none', fontSize: 16 }} />
                        <input 
                          type="text" 
                          placeholder="Class Video URL" 
                          value={editClassVideoUrl} 
                          onChange={e => setEditClassVideoUrl(e.target.value)} 
                          style={{ paddingLeft: 40, width: '100%', padding: '6px 6px 6px 40px', borderRadius: 6, border: '1px solid #ccc', fontSize: 15 }} 
                        />
                      </div>
                      
                      {/* 🔥 Preview Video - Smart Display */}
                      {editClassVideoUrl && (
                        editClassVideoUrl.includes('facebook.com') || editClassVideoUrl.includes('fb.watch') ? (
                          <iframe 
                            src={editClassVideoUrl}
                            width="100%" 
                            height="150"
                            style={{ border: 0, borderRadius: 6, marginBottom: 8 }}
                            frameBorder="0" 
                            allowFullScreen={true}
                            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                          />
                        ) : editClassVideoUrl.includes('youtube.com') || editClassVideoUrl.includes('youtu.be') ? (
                          <iframe 
                            src={editClassVideoUrl.replace('watch?v=', 'embed/')}
                            width="100%" 
                            height="150"
                            style={{ border: 0, borderRadius: 6, marginBottom: 8 }}
                            frameBorder="0" 
                            allowFullScreen={true}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          />
                        ) : (
                          <video 
                            src={editClassVideoUrl} 
                            controls 
                            style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 6, marginBottom: 8, background: '#f8f8f8' }} 
                          />
                        )
                      )}
                      <textarea
                        value={editClassDescription}
                        onChange={e => setEditClassDescription(e.target.value)}
                        placeholder="Class Details"
                        className="edit-input"
                        rows={4}
                      />
                      {/* 🔥 URL Input for Edit Class Image */}
                      <div style={{ position: 'relative', width: '100%', marginBottom: 10 }}>
                        <FaFileImage style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none', fontSize: 16 }} />
                        <input 
                          type="text" 
                          placeholder="Class Image URL" 
                          value={editClassImageUrl} 
                          onChange={e => setEditClassImageUrl(e.target.value)} 
                          style={{ paddingLeft: 40, width: '100%', padding: '6px 6px 6px 40px', borderRadius: 6, border: '1px solid #ccc', fontSize: 15 }} 
                        />
                      </div>
                      
                      {/* 🔥 Preview Image */}
                      {editClassImageUrl && (
                        <img 
                          src={editClassImageUrl} 
                          alt="Class Preview" 
                          style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 6, marginBottom: 8, background: '#f8f8f8' }} 
                        />
                      )}
                      <div className="edit-btn-row">
                        <button className="save-edit-class-btn edit-save-btn" onClick={saveEditClass}>Save</button>
                        <button className="cancel-edit-class-btn edit-cancel-btn" onClick={() => setEditingClass(null)}>Cancel</button>
                      </div>
                      {classMessage && <p className="admin-message">{classMessage}</p>}
                    </div>
                  ) : (
                    <div key={classItem._id || idx} className="rate-card" style={{
                      background: '#fff',
                      borderRadius: 14,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                      padding: '18px 12px 12px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minHeight: 260,
                      minWidth: 0,
                      maxWidth: 200,
                      width: '100%',
                      overflow: 'hidden',
                      margin: '0 auto',
                    }}>
                      {classItem.image ? (
                        <img src={classItem.image} alt={classItem.name} style={{ width: '100%', height: 60, objectFit: 'cover', marginBottom: 10, borderRadius: 6, background: '#f8f8f8' }} />
                      ) : (
                        <div style={{ width: '100%', height: 60, background: '#f8f8f8', marginBottom: 10, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 24 }}>No Image</div>
                      )}
                      <div style={{ fontWeight: 'bold', fontSize: 22, letterSpacing: 2, margin: '10px 0 8px 0', fontFamily: 'Courier New, Courier, monospace', textAlign: 'center' }}>{classItem.name}</div>
                      <div style={{ fontSize: 14, marginBottom: 12, textAlign: 'center' }}>{classItem.description}</div>
                      <button onClick={() => handleEditClass(classItem)} style={{ background: '#145a32', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, marginBottom: 8, cursor: 'pointer' }}>EDIT</button>
                      <button onClick={() => handleDelete('class', classItem._id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}>DELETE</button>
                    </div>
                  )
                ))}
              </div>

              {/* Add Class Form */}
              <div className="add-class-form animated-card">
                <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FaChalkboardTeacher color="#1ee43b" size={28} /> Add New Class
                </h3>
                <div style={{ width: '100%', marginBottom: 16 }}>
                  <div style={{ position: 'relative', marginBottom: 16 }}>
                    <FaChalkboardTeacher style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                    <input type="text" placeholder="Class Name" value={newClassName} onChange={e => setNewClassName(e.target.value)} style={{ paddingLeft: 40, width: '100%' }} />
                  </div>
                  {/* 🔥 URL Input for Class Video */}
                  <div style={{ position: 'relative', width: '100%', marginBottom: 10 }}>
                    <FaFileVideo style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                    <input 
                      type="text" 
                      placeholder="Class Video URL" 
                      value={newClassVideoUrl} 
                      onChange={e => setNewClassVideoUrl(e.target.value)} 
                      style={{ paddingLeft: 40, width: '100%', padding: '8px 8px 8px 40px', borderRadius: 6, border: '1px solid #ccc', fontSize: 15 }} 
                    />
                  </div>
                  
                  {/* 🔥 File Upload for Class Video */}
                  <label className="upload-box" style={{ width: '100%', marginBottom: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <FaFileVideo size={28} color="#1ee43b" />
                      <input
                        ref={newClassVideoInputRef}
                        type="file"
                        accept="video/*"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            // Preview for user feedback
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setNewClassVideoFile(reader.result);
                              setNewClassVideo(reader.result);
                            };
                            reader.readAsDataURL(file);
                            // Upload file and get URL
                            handleClassVideoUpload(file);
                          } else {
                            setNewClassVideoFile('');
                            setNewClassVideo('');
                            setNewClassVideoUrl('');
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      <span style={{ color: '#888', fontSize: '0.95rem', marginTop: 4 }}>Or upload class intro video</span>
                    </div>
                  </label>
                  
                  {/* 🔥 Preview Video - Smart Display */}
                  {(newClassVideoFile || newClassVideoUrl) && (
                    (newClassVideoUrl && (newClassVideoUrl.includes('facebook.com') || newClassVideoUrl.includes('fb.watch'))) ? (
                      <iframe 
                        src={newClassVideoUrl}
                        width="100%" 
                        height="150"
                        style={{ border: 0, borderRadius: 6, marginBottom: 10 }}
                        frameBorder="0" 
                        allowFullScreen={true}
                        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                      />
                    ) : (newClassVideoUrl && (newClassVideoUrl.includes('youtube.com') || newClassVideoUrl.includes('youtu.be'))) ? (
                      <iframe 
                        src={newClassVideoUrl.replace('watch?v=', 'embed/')}
                        width="100%" 
                        height="150"
                        style={{ border: 0, borderRadius: 6, marginBottom: 10 }}
                        frameBorder="0" 
                        allowFullScreen={true}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      />
                    ) : (
                      <video 
                        src={newClassVideoFile || newClassVideoUrl} 
                        controls 
                        style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 6, marginBottom: 10, background: '#f8f8f8' }} 
                      />
                    )
                  )}
                  <div style={{ position: 'relative', marginBottom: 16 }}>
                    <FaAlignLeft style={{ position: 'absolute', left: 12, top: '18px', color: '#1ee43b', pointerEvents: 'none' }} />
                    <textarea placeholder="Class Details" value={newClassDescription} onChange={e => setNewClassDescription(e.target.value)} rows={4} style={{ paddingLeft: 40, width: '100%' }} />
                  </div>
                  {/* 🔥 URL Input for Class Image */}
                  <div style={{ position: 'relative', width: '100%', marginBottom: 10 }}>
                    <FaFileImage style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#1ee43b', pointerEvents: 'none' }} />
                    <input 
                      type="text" 
                      placeholder="Class Image URL" 
                      value={newClassImageUrl} 
                      onChange={e => setNewClassImageUrl(e.target.value)} 
                      style={{ paddingLeft: 40, width: '100%', padding: '8px 8px 8px 40px', borderRadius: 6, border: '1px solid #ccc', fontSize: 15 }} 
                    />
                  </div>
                  
                  {/* 🔥 File Upload for Class Image */}
                  <label className="upload-box" style={{ width: '100%', marginBottom: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <FaFileImage size={28} color="#1ee43b" />
                      <input
                        ref={newClassImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            // Preview for user feedback
                            const reader = new FileReader();
                            reader.onloadend = () => setNewClassImage(reader.result);
                            reader.readAsDataURL(file);
                            // Upload file and get URL
                            handleClassImageUpload(file);
                          } else {
                            setNewClassImage('');
                            setNewClassImageUrl('');
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      <span style={{ color: '#888', fontSize: '0.95rem', marginTop: 4 }}>Or upload class image</span>
                    </div>
                  </label>
                  
                  {/* 🔥 Preview Image */}
                  {(newClassImage || newClassImageUrl) && (
                    <img 
                      src={newClassImage || newClassImageUrl} 
                      alt="Class Preview" 
                      style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 6, marginBottom: 10, background: '#f8f8f8' }} 
                    />
                  )}
                </div>
                <button className="add-class-btn" onClick={handleAddClass} style={{ marginTop: 8, width: '100%' }}>ADD CLASS</button>
                {classMessage && <p className="admin-message">{classMessage}</p>}
              </div>
            </section>
          )}

          {activeSection === 'members' && (
            <section className="members-section">
              <div className="section-header" style={{ paddingTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="section-bar"></div>
                  <h2 className="admin-section-title" style={{
                    fontFamily: 'Nico Moji, Arial Rounded MT Bold, Arial, sans-serif',
                    fontSize: '2.5rem',
                    color: '#181818',
                    fontWeight: 'bold',
                    letterSpacing: '3px',
                    margin: '0 0 24px 0',
                    borderLeft: '6px solid #2ecc40',
                    paddingLeft: '10px',
                    textTransform: 'uppercase',
                    background: 'none',
                    boxShadow: 'none'
                  }}>ALL MEMBERS</h2>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: 18, color: '#2ecc40', marginRight: 24, marginTop: 8, minWidth: 320, textAlign: 'right' }}>
                  {phTime}
                </div>
              </div>
              <div style={{ margin: '24px 0', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                  <thead>
                    <tr style={{ background: '#f8f8f8' }}>
                      <th style={{ padding: 12, fontWeight: 'bold', fontSize: 16 }}>Name</th>
                      <th style={{ padding: 12, fontWeight: 'bold', fontSize: 16 }}>Username</th>
                      <th style={{ padding: 12, fontWeight: 'bold', fontSize: 16 }}>Email</th>
                      <th style={{ padding: 12, fontWeight: 'bold', fontSize: 16 }}>Attendance</th>
                      <th style={{ padding: 12, fontWeight: 'bold', fontSize: 16 }}>Action</th>
                      <th style={{ padding: 12, fontWeight: 'bold', fontSize: 16 }}>History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading && (
                      <tr><td colSpan={6}>Loading users...</td></tr>
                    )}
                    {usersError && (
                      <tr><td colSpan={6} style={{ color: 'red' }}>{usersError}</td></tr>
                    )}
                    {!usersLoading && !usersError && users.filter(user => !user.isAdmin).length === 0 && (
                      <tr><td colSpan={6}>No users found.</td></tr>
                    )}
                    {!usersLoading && !usersError && (() => {
                      const filteredUsers = users.filter(user => !user.isAdmin);
                      const startIndex = (membersCurrentPage - 1) * MEMBERS_PER_PAGE;
                      const endIndex = startIndex + MEMBERS_PER_PAGE;
                      const currentPageUsers = filteredUsers.slice(startIndex, endIndex);
                      
                      return currentPageUsers.map(user => {
                      const att = attendance[user._id];
                      let statusText = 'Unmarked';
                      let statusColor = '#888';
                      let statusIcon = null;
                      if (att) {
                        if (att.status === 'present') {
                          statusText = 'Present';
                          statusColor = '#2ecc40';
                          statusIcon = <FaCheckCircle color={statusColor} style={{ marginRight: 6 }} />;
                        } else if (att.status === 'absent') {
                          statusText = 'Absent';
                          statusColor = '#e74c3c';
                          statusIcon = <FaTimesCircle color={statusColor} style={{ marginRight: 6 }} />;
                        }
                      }
                      return (
                        <tr key={user._id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: 10 }}>{user.firstname} {user.lastname}</td>
                          <td style={{ padding: 10 }}>{user.username}</td>
                          <td style={{ padding: 10 }}>{user.email}</td>
                          <td style={{ padding: 10, color: statusColor, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                            {statusIcon}{statusText}
                          </td>
                          <td style={{ padding: 10 }}>
                            <button
                              style={{ background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, marginRight: 8, cursor: att ? 'not-allowed' : 'pointer', opacity: att ? 0.6 : 1 }}
                              disabled={attendanceLoading || !!att}
                              onClick={() => handleMarkAttendance(user._id, 'present')}
                            >Mark Present</button>
                            <button
                              style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, cursor: att ? 'not-allowed' : 'pointer', opacity: att ? 0.6 : 1 }}
                              disabled={attendanceLoading || !!att}
                              onClick={() => handleMarkAttendance(user._id, 'absent')}
                            >Mark Absent</button>
                          </td>
                          <td style={{ padding: 10 }}>
                            <button
                              style={{ background: '#145a32', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer', marginRight: 8 }}
                              onClick={() => handleShowAttendanceHistory(user)}
                            >View Attendance History</button>
                            <button
                              style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer', marginRight: 8 }}
                              onClick={() => handleShowMembershipHistory(user)}
                            >Membership History</button>
                            <button
                              style={{ background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}
                              onClick={() => handleShowPaymentHistory(user)}
                            >Payment History</button>
                          </td>
                        </tr>
                      );
                      });
                    })()}
                  </tbody>
                </table>
                {attendanceError && <div style={{ color: 'red', marginTop: 12 }}>{attendanceError}</div>}
                
                {/* Members Pagination Controls */}
                {!usersLoading && !usersError && (() => {
                  const filteredUsers = users.filter(user => !user.isAdmin);
                  return filteredUsers.length > MEMBERS_PER_PAGE && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      marginTop: 20, 
                      gap: 10 
                    }}>
                      <button
                        onClick={() => setMembersCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={membersCurrentPage === 1}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 4,
                          background: membersCurrentPage === 1 ? '#f5f5f5' : '#fff',
                          color: membersCurrentPage === 1 ? '#999' : '#333',
                          cursor: membersCurrentPage === 1 ? 'not-allowed' : 'pointer',
                          fontSize: 14
                        }}
                      >
                        Previous
                      </button>
                      
                      <span style={{ 
                        padding: '8px 16px', 
                        fontSize: 14, 
                        color: '#666',
                        background: '#f8f9fa',
                        borderRadius: 4,
                        border: '1px solid #e9ecef'
                      }}>
                        Page {membersCurrentPage} of {Math.ceil(filteredUsers.length / MEMBERS_PER_PAGE)}
                      </span>
                      
                      <button
                        onClick={() => setMembersCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredUsers.length / MEMBERS_PER_PAGE)))}
                        disabled={membersCurrentPage >= Math.ceil(filteredUsers.length / MEMBERS_PER_PAGE)}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: 4,
                          background: membersCurrentPage >= Math.ceil(filteredUsers.length / MEMBERS_PER_PAGE) ? '#f5f5f5' : '#fff',
                          color: membersCurrentPage >= Math.ceil(filteredUsers.length / MEMBERS_PER_PAGE) ? '#999' : '#333',
                          cursor: membersCurrentPage >= Math.ceil(filteredUsers.length / MEMBERS_PER_PAGE) ? 'not-allowed' : 'pointer',
                          fontSize: 14
                        }}
                      >
                        Next
                      </button>
                    </div>
                  );
                })()}
                
                {/* Show items count */}
                {!usersLoading && !usersError && (() => {
                  const filteredUsers = users.filter(user => !user.isAdmin);
                  return filteredUsers.length > 0 && (
                    <div style={{ 
                      textAlign: 'center', 
                      marginTop: 10, 
                      fontSize: 14, 
                      color: '#666' 
                    }}>
                      Showing {Math.min((membersCurrentPage - 1) * MEMBERS_PER_PAGE + 1, filteredUsers.length)} - {Math.min(membersCurrentPage * MEMBERS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} members
                    </div>
                  );
                })()}
              </div>
              {/* Attendance History Modal */}
              {showAttendanceModal && attendanceHistoryUser && (
                <Modal open={true} onClose={() => { setShowAttendanceModal(false); setHistoryFilterDate(''); setAttendanceHistoryCurrentPage(1); }}>
                  <div style={{ minWidth: 350, maxWidth: 600 }}>
                    <h3 style={{ color: '#2ecc40', marginBottom: 18, textAlign: 'center' }}>Attendance History for {attendanceHistoryUser.firstname} {attendanceHistoryUser.lastname}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, justifyContent: 'flex-end' }}>
                      <input
                        type="date"
                        value={historyFilterDate}
                        onChange={e => setHistoryFilterDate(e.target.value)}
                        style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 15 }}
                      />
                      {historyFilterDate && (
                        <button
                          onClick={() => setHistoryFilterDate('')}
                          style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 'bold', fontSize: 14, cursor: 'pointer' }}
                        >Clear Filter</button>
                      )}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                      <thead>
                        <tr style={{ background: '#f8f8f8' }}>
                          <th style={{ padding: 8, fontWeight: 'bold', fontSize: 15 }}>Date</th>
                          <th style={{ padding: 8, fontWeight: 'bold', fontSize: 15 }}>Time</th>
                          <th style={{ padding: 8, fontWeight: 'bold', fontSize: 15 }}>Status</th>
                          <th style={{ padding: 8, fontWeight: 'bold', fontSize: 15 }}>Confirmed By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAttendanceHistory.length === 0 && (
                          <tr><td colSpan={4} style={{ textAlign: 'center', color: '#888' }}>No attendance records found.</td></tr>
                        )}
                        {(() => {
                          const startIndex = (attendanceHistoryCurrentPage - 1) * ATTENDANCE_HISTORY_PER_PAGE;
                          const endIndex = startIndex + ATTENDANCE_HISTORY_PER_PAGE;
                          const currentPageAttendance = filteredAttendanceHistory.slice(startIndex, endIndex);
                          
                          return currentPageAttendance.map((rec, idx) => {
                            const dateObj = new Date(rec.date);
                            const timeObj = new Date(rec.timestamp);
                            const phDate = dateObj.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' });
                            const phTime = timeObj.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            return (
                              <tr key={idx}>
                                <td style={{ padding: 8 }}>{phDate}</td>
                                <td style={{ padding: 8 }}>{phTime}</td>
                                <td style={{ padding: 8, color: rec.status === 'present' ? '#2ecc40' : '#e74c3c', fontWeight: 'bold' }}>{rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}</td>
                                <td style={{ padding: 8 }}>{rec.confirmedBy}</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                    
                    {/* Pagination Controls */}
                    {filteredAttendanceHistory.length > ATTENDANCE_HISTORY_PER_PAGE && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        marginTop: 20, 
                        gap: 10 
                      }}>
                        <button
                          onClick={() => setAttendanceHistoryCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={attendanceHistoryCurrentPage === 1}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: 4,
                            background: attendanceHistoryCurrentPage === 1 ? '#f5f5f5' : '#fff',
                            color: attendanceHistoryCurrentPage === 1 ? '#999' : '#333',
                            cursor: attendanceHistoryCurrentPage === 1 ? 'not-allowed' : 'pointer',
                            fontSize: 14
                          }}
                        >
                          Previous
                        </button>
                        
                        <span style={{ 
                          padding: '8px 16px', 
                          fontSize: 14, 
                          color: '#666',
                          background: '#f8f9fa',
                          borderRadius: 4,
                          border: '1px solid #e9ecef'
                        }}>
                          Page {attendanceHistoryCurrentPage} of {Math.ceil(filteredAttendanceHistory.length / ATTENDANCE_HISTORY_PER_PAGE)}
                        </span>
                        
                        <button
                          onClick={() => setAttendanceHistoryCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredAttendanceHistory.length / ATTENDANCE_HISTORY_PER_PAGE)))}
                          disabled={attendanceHistoryCurrentPage >= Math.ceil(filteredAttendanceHistory.length / ATTENDANCE_HISTORY_PER_PAGE)}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: 4,
                            background: attendanceHistoryCurrentPage >= Math.ceil(filteredAttendanceHistory.length / ATTENDANCE_HISTORY_PER_PAGE) ? '#f5f5f5' : '#fff',
                            color: attendanceHistoryCurrentPage >= Math.ceil(filteredAttendanceHistory.length / ATTENDANCE_HISTORY_PER_PAGE) ? '#999' : '#333',
                            cursor: attendanceHistoryCurrentPage >= Math.ceil(filteredAttendanceHistory.length / ATTENDANCE_HISTORY_PER_PAGE) ? 'not-allowed' : 'pointer',
                            fontSize: 14
                          }}
                        >
                          Next
                        </button>
                      </div>
                    )}
                    
                    {/* Show total count and close button */}
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 15
                    }}>
                      <div style={{ 
                        fontSize: 12, 
                        color: '#666' 
                      }}>
                        Showing {Math.min((attendanceHistoryCurrentPage - 1) * ATTENDANCE_HISTORY_PER_PAGE + 1, filteredAttendanceHistory.length)} - {Math.min(attendanceHistoryCurrentPage * ATTENDANCE_HISTORY_PER_PAGE, filteredAttendanceHistory.length)} of {filteredAttendanceHistory.length} records
                      </div>
                      <button
                        onClick={() => { setShowAttendanceModal(false); setHistoryFilterDate(''); setAttendanceHistoryCurrentPage(1); }}
                        style={{
                          background: '#e74c3c',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: 30,
                          height: 30,
                          fontSize: 16,
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Close"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </Modal>
              )}
              {/* Membership History Modal */}
              {showMembershipHistoryModal && membershipHistoryUser && (
                <Modal open={true} onClose={() => { setShowMembershipHistoryModal(false); setMembershipHistoryUser(null); setMembershipHistory([]); setMembershipHistoryCurrentPage(1); }}>
                  <div style={{ minWidth: 350, maxWidth: 600 }}>
                    <h3 style={{ color: '#2196f3', marginBottom: 18, textAlign: 'center' }}>Membership History for {membershipHistoryUser.firstname} {membershipHistoryUser.lastname}</h3>
                    {membershipHistoryLoading ? (
                      <div>Loading...</div>
                    ) : membershipHistoryError ? (
                      <div style={{ color: 'red' }}>{membershipHistoryError}</div>
                    ) : (
                      <>
                        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                          <thead>
                            <tr style={{ background: '#f8f8f8' }}>
                              <th style={{ padding: 8, fontWeight: 'bold', fontSize: 15 }}>Date Submitted</th>
                              <th style={{ padding: 8, fontWeight: 'bold', fontSize: 15 }}>Status</th>
                              <th style={{ padding: 8, fontWeight: 'bold', fontSize: 15 }}>Start Date</th>
                              <th style={{ padding: 8, fontWeight: 'bold', fontSize: 15 }}>End Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {membershipHistory.length === 0 && (
                              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#888' }}>No membership records found.</td></tr>
                            )}
                            {(() => {
                              const startIndex = (membershipHistoryCurrentPage - 1) * MEMBERSHIP_HISTORY_PER_PAGE;
                              const endIndex = startIndex + MEMBERSHIP_HISTORY_PER_PAGE;
                              const currentPageMembership = membershipHistory.slice(startIndex, endIndex);
                              
                              return currentPageMembership.map((rec, idx) => {
                                let statusLabel = rec.status ? rec.status.charAt(0).toUpperCase() + rec.status.slice(1) : '-';
                                // If approved and expired, show 'Finished'
                                if (
                                  rec.status &&
                                  rec.status.toLowerCase() === 'approved' &&
                                  rec.expirationDate &&
                                  new Date(rec.expirationDate) < new Date()
                                ) {
                                  statusLabel = 'Finished';
                                }
                                return (
                                  <tr key={rec._id || idx}>
                                    <td style={{ padding: 8 }}>{rec.date ? new Date(rec.date).toLocaleString() : '-'}</td>
                                    <td style={{ padding: 8, color: statusLabel === 'Approved' ? '#2ecc40' : statusLabel === 'Rejected' ? '#e74c3c' : statusLabel === 'Finished' ? '#888' : '#f39c12', fontWeight: 'bold' }}>{statusLabel}</td>
                                    <td style={{ padding: 8 }}>{rec.startDate ? new Date(rec.startDate).toLocaleDateString() : '-'}</td>
                                    <td style={{ padding: 8 }}>{rec.expirationDate ? new Date(rec.expirationDate).toLocaleDateString() : '-'}</td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                        
                        {/* Pagination Controls */}
                        {membershipHistory.length > MEMBERSHIP_HISTORY_PER_PAGE && (
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            marginTop: 20, 
                            gap: 10 
                          }}>
                            <button
                              onClick={() => setMembershipHistoryCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={membershipHistoryCurrentPage === 1}
                              style={{
                                padding: '8px 12px',
                                border: '1px solid #ddd',
                                borderRadius: 4,
                                background: membershipHistoryCurrentPage === 1 ? '#f5f5f5' : '#fff',
                                color: membershipHistoryCurrentPage === 1 ? '#999' : '#333',
                                cursor: membershipHistoryCurrentPage === 1 ? 'not-allowed' : 'pointer',
                                fontSize: 14
                              }}
                            >
                              Previous
                            </button>
                            
                            <span style={{ 
                              padding: '8px 16px', 
                              fontSize: 14, 
                              color: '#666',
                              background: '#f8f9fa',
                              borderRadius: 4,
                              border: '1px solid #e9ecef'
                            }}>
                              Page {membershipHistoryCurrentPage} of {Math.ceil(membershipHistory.length / MEMBERSHIP_HISTORY_PER_PAGE)}
                            </span>
                            
                            <button
                              onClick={() => setMembershipHistoryCurrentPage(prev => Math.min(prev + 1, Math.ceil(membershipHistory.length / MEMBERSHIP_HISTORY_PER_PAGE)))}
                              disabled={membershipHistoryCurrentPage >= Math.ceil(membershipHistory.length / MEMBERSHIP_HISTORY_PER_PAGE)}
                              style={{
                                padding: '8px 12px',
                                border: '1px solid #ddd',
                                borderRadius: 4,
                                background: membershipHistoryCurrentPage >= Math.ceil(membershipHistory.length / MEMBERSHIP_HISTORY_PER_PAGE) ? '#f5f5f5' : '#fff',
                                color: membershipHistoryCurrentPage >= Math.ceil(membershipHistory.length / MEMBERSHIP_HISTORY_PER_PAGE) ? '#999' : '#333',
                                cursor: membershipHistoryCurrentPage >= Math.ceil(membershipHistory.length / MEMBERSHIP_HISTORY_PER_PAGE) ? 'not-allowed' : 'pointer',
                                fontSize: 14
                              }}
                            >
                              Next
                            </button>
                          </div>
                        )}
                        
                        {/* Show total count and close button */}
                        <div style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: 15
                        }}>
                          <div style={{ 
                            fontSize: 12, 
                            color: '#666' 
                          }}>
                            Showing {Math.min((membershipHistoryCurrentPage - 1) * MEMBERSHIP_HISTORY_PER_PAGE + 1, membershipHistory.length)} - {Math.min(membershipHistoryCurrentPage * MEMBERSHIP_HISTORY_PER_PAGE, membershipHistory.length)} of {membershipHistory.length} records
                          </div>
                          <button
                            onClick={() => { setShowMembershipHistoryModal(false); setMembershipHistoryUser(null); setMembershipHistory([]); setMembershipHistoryCurrentPage(1); }}
                            style={{
                              background: '#e74c3c',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: 30,
                              height: 30,
                              fontSize: 16,
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Close"
                          >
                            ×
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </Modal>
              )}
              {/* Payment History Modal */}
              {showPaymentHistoryModal && paymentHistoryUser && (
                <Modal open={true} onClose={() => { setShowPaymentHistoryModal(false); setPaymentHistoryUser(null); setPaymentHistory([]); setPaymentHistoryCurrentPage(1); }}>
                  <div style={{ minWidth: 300, maxWidth: 500 }}>
                    <h3 style={{ color: '#2196f3', marginBottom: 18, textAlign: 'center' }}>Payment History for {paymentHistoryUser.firstname} {paymentHistoryUser.lastname}</h3>
                    {paymentHistoryLoading ? (
                      <div>Loading...</div>
                    ) : paymentHistoryError ? (
                      <div style={{ color: 'red' }}>{paymentHistoryError}</div>
                    ) : (
                      <>
                        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                          <thead>
                            <tr style={{ background: '#f8f8f8' }}>
                              <th style={{ padding: 8, fontWeight: 'bold', fontSize: 15 }}>Date</th>
                              <th style={{ padding: 8, fontWeight: 'bold', fontSize: 15 }}>Time</th>
                              <th style={{ padding: 8, fontWeight: 'bold', fontSize: 15 }}>Amount</th>
                              <th style={{ padding: 8, fontWeight: 'bold', fontSize: 15 }}>Status</th>
                              <th style={{ padding: 8, fontWeight: 'bold', fontSize: 15 }}>Class</th>
                              <th style={{ padding: 8, fontWeight: 'bold', fontSize: 15 }}>Coach</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paymentHistory.length === 0 && (
                              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>No payment records found.</td></tr>
                            )}
                            {(() => {
                              const startIndex = (paymentHistoryCurrentPage - 1) * PAYMENT_HISTORY_PER_PAGE;
                              const endIndex = startIndex + PAYMENT_HISTORY_PER_PAGE;
                              const currentPagePayments = paymentHistory.slice(startIndex, endIndex);
                              
                              return currentPagePayments.map((rec, idx) => {
                                const dateObj = new Date(rec.date);
                                const phDate = dateObj.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' });
                                return (
                                  <tr key={rec._id || idx}>
                                    <td style={{ padding: 8 }}>{phDate}</td>
                                    <td style={{ padding: 8 }}>{rec.time || 'N/A'}</td>
                                    <td style={{ padding: 8 }}>{rec.amount ? `₱${rec.amount}` : 'N/A'}</td>
                                    <td style={{ padding: 8, color: rec.status === 'verified' ? '#2ecc40' : rec.status === 'rejected' ? '#e74c3c' : '#f39c12', fontWeight: 'bold' }}>
                                      {rec.status ? rec.status.charAt(0).toUpperCase() + rec.status.slice(1) : 'Pending'}
                                    </td>
                                    <td style={{ padding: 8 }}>{rec.className || 'N/A'}</td>
                                    <td style={{ padding: 8 }}>{rec.coachName || rec.coachId || 'N/A'}</td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                        
                        {/* Pagination Controls */}
                        {paymentHistory.length > PAYMENT_HISTORY_PER_PAGE && (
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            marginTop: 20, 
                            gap: 10 
                          }}>
                            <button
                              onClick={() => setPaymentHistoryCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={paymentHistoryCurrentPage === 1}
                              style={{
                                padding: '8px 12px',
                                border: '1px solid #ddd',
                                borderRadius: 4,
                                background: paymentHistoryCurrentPage === 1 ? '#f5f5f5' : '#fff',
                                color: paymentHistoryCurrentPage === 1 ? '#999' : '#333',
                                cursor: paymentHistoryCurrentPage === 1 ? 'not-allowed' : 'pointer',
                                fontSize: 14
                              }}
                            >
                              Previous
                            </button>
                            
                            <span style={{ 
                              padding: '8px 16px', 
                              fontSize: 14, 
                              color: '#666',
                              background: '#f8f9fa',
                              borderRadius: 4,
                              border: '1px solid #e9ecef'
                            }}>
                              Page {paymentHistoryCurrentPage} of {Math.ceil(paymentHistory.length / PAYMENT_HISTORY_PER_PAGE)}
                            </span>
                            
                            <button
                              onClick={() => setPaymentHistoryCurrentPage(prev => Math.min(prev + 1, Math.ceil(paymentHistory.length / PAYMENT_HISTORY_PER_PAGE)))}
                              disabled={paymentHistoryCurrentPage >= Math.ceil(paymentHistory.length / PAYMENT_HISTORY_PER_PAGE)}
                              style={{
                                padding: '8px 12px',
                                border: '1px solid #ddd',
                                borderRadius: 4,
                                background: paymentHistoryCurrentPage >= Math.ceil(paymentHistory.length / PAYMENT_HISTORY_PER_PAGE) ? '#f5f5f5' : '#fff',
                                color: paymentHistoryCurrentPage >= Math.ceil(paymentHistory.length / PAYMENT_HISTORY_PER_PAGE) ? '#999' : '#333',
                                cursor: paymentHistoryCurrentPage >= Math.ceil(paymentHistory.length / PAYMENT_HISTORY_PER_PAGE) ? 'not-allowed' : 'pointer',
                                fontSize: 14
                              }}
                            >
                              Next
                            </button>
                          </div>
                        )}
                        
                        {/* Show total count and close button */}
                        <div style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: 15
                        }}>
                          <div style={{ 
                            fontSize: 12, 
                            color: '#666' 
                          }}>
                            Showing {Math.min((paymentHistoryCurrentPage - 1) * PAYMENT_HISTORY_PER_PAGE + 1, paymentHistory.length)} - {Math.min(paymentHistoryCurrentPage * PAYMENT_HISTORY_PER_PAGE, paymentHistory.length)} of {paymentHistory.length} payments
                          </div>
                          <button
                            onClick={() => { setShowPaymentHistoryModal(false); setPaymentHistoryUser(null); setPaymentHistory([]); setPaymentHistoryCurrentPage(1); }}
                            style={{
                              background: '#e74c3c',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: 30,
                              height: 30,
                              fontSize: 16,
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Close"
                          >
                            ×
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </Modal>
              )}
            </section>
          )}

          {activeSection === 'logo' && (
            <section className="logo-section">
              <div className="section-header">
                <div className="section-bar"></div>
                <h2>LOGO</h2>
              </div>
              <div style={{
                margin: '32px auto',
                background: '#fff',
                padding: 24,
                borderRadius: 12,
                maxWidth: 400,
                boxShadow: '0 4px 24px rgba(44, 204, 64, 0.10)',
                border: '1.5px solid #e0e0e0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}>
                <h3 style={{ marginBottom: 18, color: '#181818', fontWeight: 700, letterSpacing: 1 }}>Edit Logo Text</h3>
                <input
                  type="text"
                  name="logoText"
                  value={siteSettings.logoText}
                  onChange={handleSiteSettingsChange}
                  placeholder="Logo Text"
                  style={{ width: '100%', marginBottom: 14, padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 16, textAlign: 'center', fontWeight: 700, letterSpacing: 2 }}
                />
                <div style={{ margin: '18px 0', width: '100%', textAlign: 'center' }}>
                  <h4 style={{ marginBottom: 8 }}>Logo Image</h4>
                  <div style={{ marginBottom: 10 }}>
                    <button type="button" onClick={() => logoImageInputRef.current && logoImageInputRef.current.click()} style={{ background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer', marginRight: 8 }}>Choose Image</button>
                    <input
                      ref={logoImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoImageChange}
                      style={{ display: 'none' }}
                    />
                    {(logoImagePreview || siteSettings.logoImageUrl) && (
                      <button type="button" 
                        onClick={() => { setLogoImage(''); setLogoImagePreview(''); setLogoImageRemoved(true); setRemoveLogoImagePending(true); }} 
                        style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}
                        disabled={!logoImagePreview && !siteSettings.logoImageUrl}
                      >Remove Logo Image</button>
                    )}
                  </div>
                  {(logoImagePreview || siteSettings.logoImageUrl) && (
                    <img src={logoImagePreview || siteSettings.logoImageUrl} alt="Logo Preview" style={{ height: 60, margin: '0 auto', display: 'block', objectFit: 'contain', background: '#f8f8f8', borderRadius: 6 }} />
                  )}
                  {removeLogoImagePending && (
                    <div style={{ color: '#e74c3c', marginTop: 8, fontWeight: 'bold' }}>Logo image will be removed after saving.</div>
                  )}
                </div>
                <button onClick={saveSiteSettings} style={{ background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 32px', fontWeight: 'bold', fontSize: 17, transition: 'background 0.2s', cursor: 'pointer', marginTop: 4 }}
                  onMouseOver={e => e.target.style.background = '#145a32'}
                  onMouseOut={e => e.target.style.background = '#2ecc40'}
                >Save</button>
                {siteSettingsMessage && <span style={{ marginLeft: 16, color: '#145a32' }}>{siteSettingsMessage}</span>}
              </div>
            </section>
          )}

          {activeSection === 'contact' && (
            <section className="contact-section animated-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh', background: 'none', boxShadow: 'none', padding: 0 }}>
              <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 4px 32px rgba(44,204,64,0.13)', padding: '40px 36px 36px 36px', maxWidth: 420, width: '100%', margin: '0 auto', border: '2px solid #2ecc40', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box' }}>
                <h2 style={{ marginBottom: 28, fontWeight: 700, fontSize: 28, color: '#181818', letterSpacing: 1, textAlign: 'center', fontFamily: 'Inter, Arial, sans-serif', maxWidth: '100%' }}>
                  Edit Contact Page
                </h2>
                <form style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', maxWidth: '100%' }} onSubmit={e => { e.preventDefault(); saveContactInfo(); }}>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '100%' }}>
                    <FaPhoneAlt style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#2ecc40', fontSize: 18, pointerEvents: 'none', zIndex: 2 }} />
                    <input type="text" name="phone" value={contactInfo.phone} onChange={handleContactInfoChange} placeholder="Phone" style={{ borderRadius: 8, border: '1.5px solid #2ecc40', padding: '13px 16px 13px 44px', fontSize: 16, background: '#f8fff8', color: '#181818', outline: 'none', transition: 'border 0.2s', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '100%' }}>
                    <FaEnvelope style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#2ecc40', fontSize: 18, pointerEvents: 'none', zIndex: 2 }} />
                    <input type="text" name="email" value={contactInfo.email} onChange={handleContactInfoChange} placeholder="Email" style={{ borderRadius: 8, border: '1.5px solid #2ecc40', padding: '13px 16px 13px 44px', fontSize: 16, background: '#f8fff8', color: '#181818', outline: 'none', transition: 'border 0.2s', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '100%', display: 'flex', gap: 8 }}>
                    <FaFacebookMessenger style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#2ecc40', fontSize: 20, pointerEvents: 'none', zIndex: 2 }} />
                    <input type="text" name="social.messenger.label" value={contactInfo.social.messenger.label} onChange={handleContactInfoChange} placeholder="Messenger Label" style={{ borderRadius: 8, border: '1.5px solid #2ecc40', padding: '13px 8px 13px 44px', fontSize: 16, background: '#f8fff8', color: '#181818', outline: 'none', width: '40%', maxWidth: '40%', boxSizing: 'border-box' }} />
                    <input type="text" name="social.messenger.url" value={contactInfo.social.messenger.url} onChange={handleContactInfoChange} placeholder="Messenger Link" style={{ borderRadius: 8, border: '1.5px solid #2ecc40', padding: '13px 8px', fontSize: 16, background: '#f8fff8', color: '#181818', outline: 'none', width: '60%', maxWidth: '60%', boxSizing: 'border-box', marginLeft: 4 }} />
                  </div>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '100%', display: 'flex', gap: 8 }}>
                    <FaFacebook style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#2ecc40', fontSize: 20, pointerEvents: 'none', zIndex: 2 }} />
                    <input type="text" name="social.facebook.label" value={contactInfo.social.facebook.label} onChange={handleContactInfoChange} placeholder="Facebook Label" style={{ borderRadius: 8, border: '1.5px solid #2ecc40', padding: '13px 8px 13px 44px', fontSize: 16, background: '#f8fff8', color: '#181818', outline: 'none', width: '40%', maxWidth: '40%', boxSizing: 'border-box' }} />
                    <input type="text" name="social.facebook.url" value={contactInfo.social.facebook.url} onChange={handleContactInfoChange} placeholder="Facebook Link" style={{ borderRadius: 8, border: '1.5px solid #2ecc40', padding: '13px 8px', fontSize: 16, background: '#f8fff8', color: '#181818', outline: 'none', width: '60%', maxWidth: '60%', boxSizing: 'border-box', marginLeft: 4 }} />
                  </div>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '100%', display: 'flex', gap: 8 }}>
                    <FaInstagram style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#2ecc40', fontSize: 20, pointerEvents: 'none', zIndex: 2 }} />
                    <input type="text" name="social.instagram.label" value={contactInfo.social.instagram.label} onChange={handleContactInfoChange} placeholder="Instagram Label" style={{ borderRadius: 8, border: '1.5px solid #2ecc40', padding: '13px 8px 13px 44px', fontSize: 16, background: '#f8fff8', color: '#181818', outline: 'none', width: '40%', maxWidth: '40%', boxSizing: 'border-box' }} />
                    <input type="text" name="social.instagram.url" value={contactInfo.social.instagram.url} onChange={handleContactInfoChange} placeholder="Instagram Link" style={{ borderRadius: 8, border: '1.5px solid #2ecc40', padding: '13px 8px', fontSize: 16, background: '#f8fff8', color: '#181818', outline: 'none', width: '60%', maxWidth: '60%', boxSizing: 'border-box', marginLeft: 4 }} />
                  </div>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '100%', display: 'flex', gap: 8 }}>
                    <FaYoutube style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#2ecc40', fontSize: 20, pointerEvents: 'none', zIndex: 2 }} />
                    <input type="text" name="social.youtube.label" value={contactInfo.social.youtube.label} onChange={handleContactInfoChange} placeholder="Youtube Label" style={{ borderRadius: 8, border: '1.5px solid #2ecc40', padding: '13px 8px 13px 44px', fontSize: 16, background: '#f8fff8', color: '#181818', outline: 'none', width: '40%', maxWidth: '40%', boxSizing: 'border-box' }} />
                    <input type="text" name="social.youtube.url" value={contactInfo.social.youtube.url} onChange={handleContactInfoChange} placeholder="YouTube Link" style={{ borderRadius: 8, border: '1.5px solid #2ecc40', padding: '13px 8px', fontSize: 16, background: '#f8fff8', color: '#181818', outline: 'none', width: '60%', maxWidth: '60%', boxSizing: 'border-box', marginLeft: 4 }} />
                  </div>
                  <input type="text" name="mapEmbedUrl" value={contactInfo.mapEmbedUrl} onChange={handleContactInfoChange} placeholder="Google Map Embed URL" style={{ borderRadius: 8, border: '1.5px solid #2ecc40', padding: '13px 16px', fontSize: 16, background: '#f8fff8', color: '#181818', outline: 'none', transition: 'border 0.2s', width: '100%' }} />
                  <button type="submit" style={{ background: 'linear-gradient(90deg, #2ecc40 60%, #27ae60 100%)', color: '#fff', border: 'none', borderRadius: 8, padding: '15px 0', fontWeight: 'bold', fontSize: 18, letterSpacing: 2, cursor: 'pointer', width: '100%', marginTop: 10, boxShadow: '0 2px 8px rgba(44,204,64,0.10)' }}>Save Contact Info</button>
                  {contactInfoMessage && <p className="admin-message" style={{ textAlign: 'center', color: '#145a32', marginTop: 8 }}>{contactInfoMessage}</p>}
                </form>
              </div>
            </section>
          )}

          {activeSection === 'coachesAttendance' && (
            <section className="coaches-attendance-section">
              <div className="section-header" style={{ paddingTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="section-bar"></div>
                  <h2 className="admin-section-title" style={{
                    fontFamily: 'Nico Moji, Arial Rounded MT Bold, Arial, sans-serif',
                    fontSize: '2.5rem',
                    color: '#181818',
                    fontWeight: 'bold',
                    letterSpacing: '3px',
                    margin: '0 0 24px 0',
                    borderLeft: '6px solid #2ecc40',
                    paddingLeft: '10px',
                    textTransform: 'uppercase',
                    background: 'none',
                    boxShadow: 'none'
                  }}>COACHES ATTENDANCE</h2>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: 18, color: '#2ecc40', marginRight: 24, marginTop: 8, minWidth: 320, textAlign: 'right' }}>
                  {phTime}
                </div>
              </div>
              <div style={{ margin: '24px 0', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                  <thead>
                    <tr style={{ background: '#f8f8f8' }}>
                      <th style={{ padding: 12, fontWeight: 'bold', fontSize: 16 }}>Name</th>
                      <th style={{ padding: 12, fontWeight: 'bold', fontSize: 16 }}>Username</th>
                      <th style={{ padding: 12, fontWeight: 'bold', fontSize: 16 }}>Email</th>
                      <th style={{ padding: 12, fontWeight: 'bold', fontSize: 16 }}>Attendance</th>
                      <th style={{ padding: 12, fontWeight: 'bold', fontSize: 16 }}>Action</th>
                      <th style={{ padding: 12, fontWeight: 'bold', fontSize: 16 }}>History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coachesLoading && (
                      <tr><td colSpan={6}>Loading coaches...</td></tr>
                    )}
                    {coachesError && (
                      <tr><td colSpan={6} style={{ color: 'red' }}>{coachesError}</td></tr>
                    )}
                    {!coachesLoading && !coachesError && coaches.length === 0 && (
                      <tr><td colSpan={6}>No coaches found.</td></tr>
                    )}
                    {!coachesLoading && !coachesError && (() => {
                      const startIndex = (coachesAttendanceCurrentPage - 1) * COACHES_ATTENDANCE_PER_PAGE;
                      const endIndex = startIndex + COACHES_ATTENDANCE_PER_PAGE;
                      const currentPageCoaches = coaches.slice(startIndex, endIndex);
                      
                      return currentPageCoaches.map(coach => {
                      const att = coachesAttendance[coach._id];
                      let statusText = 'Unmarked';
                      let statusColor = '#888';
                      let statusIcon = null;
                      if (att) {
                        if (att.status === 'present') {
                          statusText = 'Present';
                          statusColor = '#2ecc40';
                          statusIcon = <FaCheckCircle color={statusColor} style={{ marginRight: 6 }} />;
                        } else if (att.status === 'absent') {
                          statusText = 'Absent';
                          statusColor = '#e74c3c';
                          statusIcon = <FaTimesCircle color={statusColor} style={{ marginRight: 6 }} />;
                        }
                      }
                      return (
                        <tr key={coach._id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: 10 }}>{coach.firstname} {coach.lastname}</td>
                          <td style={{ padding: 10 }}>@{coach.username}</td>
                          <td style={{ padding: 10 }}>{coach.email}</td>
                          <td style={{ padding: 10, color: statusColor, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                            {statusIcon}{statusText}
                          </td>
                          <td style={{ padding: 10 }}>
                            <button
                              style={{ background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, marginRight: 8, cursor: att ? 'not-allowed' : 'pointer', opacity: att ? 0.6 : 1 }}
                              disabled={coachesAttendanceLoading || !!att}
                              onClick={() => handleMarkCoachesAttendance(coach._id, 'present')}
                            >Mark Present</button>
                            <button
                              style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, cursor: att ? 'not-allowed' : 'pointer', opacity: att ? 0.6 : 1 }}
                              disabled={coachesAttendanceLoading || !!att}
                              onClick={() => handleMarkCoachesAttendance(coach._id, 'absent')}
                            >Mark Absent</button>
                          </td>
                          <td style={{ padding: 10 }}>
                            <button
                              style={{ background: '#145a32', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}
                              onClick={() => handleShowCoachesAttendanceHistory(coach)}
                            >View AttendanceHistory</button>
                          </td>
                        </tr>
                      );
                      });
                    })()}
                  </tbody>
                </table>
                {coachesAttendanceError && <div style={{ color: 'red', marginTop: 12 }}>{coachesAttendanceError}</div>}
                
                {/* Coaches Attendance Pagination Controls */}
                {!coachesLoading && !coachesError && coaches.length > COACHES_ATTENDANCE_PER_PAGE && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    marginTop: 20, 
                    gap: 10 
                  }}>
                    <button
                      onClick={() => setCoachesAttendanceCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={coachesAttendanceCurrentPage === 1}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        background: coachesAttendanceCurrentPage === 1 ? '#f5f5f5' : '#fff',
                        color: coachesAttendanceCurrentPage === 1 ? '#999' : '#333',
                        cursor: coachesAttendanceCurrentPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: 14
                      }}
                    >
                      Previous
                    </button>
                    
                    <span style={{ 
                      padding: '8px 16px', 
                      fontSize: 14, 
                      color: '#666',
                      background: '#f8f9fa',
                      borderRadius: 4,
                      border: '1px solid #e9ecef'
                    }}>
                      Page {coachesAttendanceCurrentPage} of {Math.ceil(coaches.length / COACHES_ATTENDANCE_PER_PAGE)}
                    </span>
                    
                    <button
                      onClick={() => setCoachesAttendanceCurrentPage(prev => Math.min(prev + 1, Math.ceil(coaches.length / COACHES_ATTENDANCE_PER_PAGE)))}
                      disabled={coachesAttendanceCurrentPage >= Math.ceil(coaches.length / COACHES_ATTENDANCE_PER_PAGE)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        background: coachesAttendanceCurrentPage >= Math.ceil(coaches.length / COACHES_ATTENDANCE_PER_PAGE) ? '#f5f5f5' : '#fff',
                        color: coachesAttendanceCurrentPage >= Math.ceil(coaches.length / COACHES_ATTENDANCE_PER_PAGE) ? '#999' : '#333',
                        cursor: coachesAttendanceCurrentPage >= Math.ceil(coaches.length / COACHES_ATTENDANCE_PER_PAGE) ? 'not-allowed' : 'pointer',
                        fontSize: 14
                      }}
                    >
                      Next
                    </button>
                  </div>
                )}
                
                {/* Show coaches count */}
                {!coachesLoading && !coachesError && coaches.length > 0 && (
                  <div style={{ 
                    textAlign: 'center', 
                    marginTop: 10, 
                    fontSize: 14, 
                    color: '#666' 
                  }}>
                    Showing {Math.min((coachesAttendanceCurrentPage - 1) * COACHES_ATTENDANCE_PER_PAGE + 1, coaches.length)} - {Math.min(coachesAttendanceCurrentPage * COACHES_ATTENDANCE_PER_PAGE, coaches.length)} of {coaches.length} coaches
                  </div>
                )}
              </div>
              {/* Attendance History Modal (for coaches) */}
              {showCoachesAttendanceModal && coachesAttendanceHistoryCoach && (
                <Modal open={true} onClose={() => { setShowCoachesAttendanceModal(false); setHistoryFilterDate(''); setCoachesAttendanceHistoryCurrentPage(1); }}>
                  <div style={{ minWidth: 350, maxWidth: 600 }}>
                    <h3 style={{ color: '#2ecc40', marginBottom: 18, textAlign: 'center' }}>Attendance History for {coachesAttendanceHistoryCoach.firstname} {coachesAttendanceHistoryCoach.lastname}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, justifyContent: 'flex-end' }}>
                      <input
                        type="date"
                        value={historyFilterDate}
                        onChange={e => setHistoryFilterDate(e.target.value)}
                        style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 15 }}
                      />
                      {historyFilterDate && (
                        <button
                          onClick={() => setHistoryFilterDate('')}
                          style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 'bold', fontSize: 14, cursor: 'pointer' }}
                        >Clear Filter</button>
                      )}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                      <thead>
                        <tr style={{ background: '#f8f8f8' }}>
                          <th style={{ padding: 8, fontWeight: 'bold', fontSize: 15 }}>Date</th>
                          <th style={{ padding: 8, fontWeight: 'bold', fontSize: 15 }}>Time</th>
                          <th style={{ padding: 8, fontWeight: 'bold', fontSize: 15 }}>Status</th>
                          <th style={{ padding: 8, fontWeight: 'bold', fontSize: 15 }}>Confirmed By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(historyFilterDate
                          ? coachesAttendanceHistory.filter(rec => {
                              const recDate = new Date(rec.date);
                              const filterDate = new Date(historyFilterDate);
                              return (
                                recDate.getFullYear() === filterDate.getFullYear() &&
                                recDate.getMonth() === filterDate.getMonth() &&
                                recDate.getDate() === filterDate.getDate()
                              );
                            })
                          : coachesAttendanceHistory
                        ).length === 0 && (
                          <tr><td colSpan={4} style={{ textAlign: 'center', color: '#888' }}>No attendance records found.</td></tr>
                        )}
                        {(() => {
                          const filteredCoachesAttendanceHistory = historyFilterDate
                            ? coachesAttendanceHistory.filter(rec => {
                                const recDate = new Date(rec.date);
                                const filterDate = new Date(historyFilterDate);
                                return (
                                  recDate.getFullYear() === filterDate.getFullYear() &&
                                  recDate.getMonth() === filterDate.getMonth() &&
                                  recDate.getDate() === filterDate.getDate()
                                );
                              })
                            : coachesAttendanceHistory;
                          
                          const startIndex = (coachesAttendanceHistoryCurrentPage - 1) * COACHES_ATTENDANCE_HISTORY_PER_PAGE;
                          const endIndex = startIndex + COACHES_ATTENDANCE_HISTORY_PER_PAGE;
                          const currentPageCoachesAttendance = filteredCoachesAttendanceHistory.slice(startIndex, endIndex);
                          
                          return currentPageCoachesAttendance.map((rec, idx) => {
                            const dateObj = new Date(rec.date);
                            const timeObj = new Date(rec.timestamp);
                            const phDate = dateObj.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' });
                            const phTime = timeObj.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            return (
                              <tr key={idx}>
                                <td style={{ padding: 8 }}>{phDate}</td>
                                <td style={{ padding: 8 }}>{phTime}</td>
                                <td style={{ padding: 8, color: rec.status === 'present' ? '#2ecc40' : '#e74c3c', fontWeight: 'bold' }}>{rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}</td>
                                <td style={{ padding: 8 }}>{rec.confirmedBy}</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                    
                    {/* Pagination Controls */}
                    {(() => {
                      const filteredCoachesAttendanceHistory = historyFilterDate
                        ? coachesAttendanceHistory.filter(rec => {
                            const recDate = new Date(rec.date);
                            const filterDate = new Date(historyFilterDate);
                            return (
                              recDate.getFullYear() === filterDate.getFullYear() &&
                              recDate.getMonth() === filterDate.getMonth() &&
                              recDate.getDate() === filterDate.getDate()
                            );
                          })
                        : coachesAttendanceHistory;
                      
                      return filteredCoachesAttendanceHistory.length > COACHES_ATTENDANCE_HISTORY_PER_PAGE && (
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center', 
                          marginTop: 20, 
                          gap: 10 
                        }}>
                          <button
                            onClick={() => setCoachesAttendanceHistoryCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={coachesAttendanceHistoryCurrentPage === 1}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid #ddd',
                              borderRadius: 4,
                              background: coachesAttendanceHistoryCurrentPage === 1 ? '#f5f5f5' : '#fff',
                              color: coachesAttendanceHistoryCurrentPage === 1 ? '#999' : '#333',
                              cursor: coachesAttendanceHistoryCurrentPage === 1 ? 'not-allowed' : 'pointer',
                              fontSize: 14
                            }}
                          >
                            Previous
                          </button>
                          
                          <span style={{ 
                            padding: '8px 16px', 
                            fontSize: 14, 
                            color: '#666',
                            background: '#f8f9fa',
                            borderRadius: 4,
                            border: '1px solid #e9ecef'
                          }}>
                            Page {coachesAttendanceHistoryCurrentPage} of {Math.ceil(filteredCoachesAttendanceHistory.length / COACHES_ATTENDANCE_HISTORY_PER_PAGE)}
                          </span>
                          
                          <button
                            onClick={() => setCoachesAttendanceHistoryCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredCoachesAttendanceHistory.length / COACHES_ATTENDANCE_HISTORY_PER_PAGE)))}
                            disabled={coachesAttendanceHistoryCurrentPage >= Math.ceil(filteredCoachesAttendanceHistory.length / COACHES_ATTENDANCE_HISTORY_PER_PAGE)}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid #ddd',
                              borderRadius: 4,
                              background: coachesAttendanceHistoryCurrentPage >= Math.ceil(filteredCoachesAttendanceHistory.length / COACHES_ATTENDANCE_HISTORY_PER_PAGE) ? '#f5f5f5' : '#fff',
                              color: coachesAttendanceHistoryCurrentPage >= Math.ceil(filteredCoachesAttendanceHistory.length / COACHES_ATTENDANCE_HISTORY_PER_PAGE) ? '#999' : '#333',
                              cursor: coachesAttendanceHistoryCurrentPage >= Math.ceil(filteredCoachesAttendanceHistory.length / COACHES_ATTENDANCE_HISTORY_PER_PAGE) ? 'not-allowed' : 'pointer',
                              fontSize: 14
                            }}
                          >
                            Next
                          </button>
                        </div>
                      );
                    })()}
                    
                    {/* Show total count and close button */}
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 15
                    }}>
                      <div style={{ 
                        fontSize: 12, 
                        color: '#666' 
                      }}>
                        {(() => {
                          const filteredCoachesAttendanceHistory = historyFilterDate
                            ? coachesAttendanceHistory.filter(rec => {
                                const recDate = new Date(rec.date);
                                const filterDate = new Date(historyFilterDate);
                                return (
                                  recDate.getFullYear() === filterDate.getFullYear() &&
                                  recDate.getMonth() === filterDate.getMonth() &&
                                  recDate.getDate() === filterDate.getDate()
                                );
                              })
                            : coachesAttendanceHistory;
                          
                          return `Showing ${Math.min((coachesAttendanceHistoryCurrentPage - 1) * COACHES_ATTENDANCE_HISTORY_PER_PAGE + 1, filteredCoachesAttendanceHistory.length)} - ${Math.min(coachesAttendanceHistoryCurrentPage * COACHES_ATTENDANCE_HISTORY_PER_PAGE, filteredCoachesAttendanceHistory.length)} of ${filteredCoachesAttendanceHistory.length} records`;
                        })()}
                      </div>
                      <button
                        onClick={() => { setShowCoachesAttendanceModal(false); setHistoryFilterDate(''); setCoachesAttendanceHistoryCurrentPage(1); }}
                        style={{
                          background: '#e74c3c',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: 30,
                          height: 30,
                          fontSize: 16,
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Close"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </Modal>
              )}
            </section>
          )}

          {activeSection === 'homeSettings' && (
            <section className="home-settings-section">
              <HomeSettings />
            </section>
          )}

          {activeSection === 'paymentSettings' && (
            <section className="payment-settings-section">
              <div className="section-header">
                <div className="section-bar"></div>
                <h2>PAYMENT SETTINGS</h2>
              </div>
              <div style={{
                margin: '32px auto',
                background: '#fff',
                padding: 32,
                borderRadius: 16,
                maxWidth: 800,
                boxShadow: '0 4px 24px rgba(44, 204, 64, 0.10)',
                border: '1.5px solid #e0e0e0',
              }}>
                <h3 style={{ marginBottom: 24, color: '#181818', fontWeight: 700, letterSpacing: 1, textAlign: 'center' }}>Configure Payment Settings</h3>
                
                {/* Class Rates & QR Codes Section */}
                <div style={{ marginBottom: 32 }}>
                  <h4 style={{ marginBottom: 16, color: '#145a32', fontWeight: 600, fontSize: 18 }}>Class Booking Settings</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    {Object.keys(paymentSettings.classRates).map(className => (
                      <div key={className} style={{ background: '#f8fff8', padding: 16, borderRadius: 8, border: '1px solid #e0e0e0' }}>
                        <h5 style={{ margin: '0 0 12px 0', color: '#145a32', fontWeight: 600, fontSize: 16 }}>{className}</h5>
                        
                        {/* Rate Input */}
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ fontWeight: 500, marginBottom: 4, display: 'block', color: '#145a32', fontSize: 14 }}>
                            Rate (₱)
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ marginRight: 4, color: '#145a32', fontWeight: 'bold' }}>₱</span>
                            <input
                              type="number"
                              name={`classRates.${className}`}
                              value={paymentSettings.classRates[className]}
                              onChange={handlePaymentSettingsChange}
                              style={{ 
                                width: '100%', 
                                padding: 8, 
                                borderRadius: 6, 
                                border: '1.5px solid #2ecc40', 
                                fontSize: 14, 
                                background: '#fff',
                                color: '#181818',
                                outline: 'none'
                              }}
                            />
                          </div>
                        </div>

                        {/* Current QR Code */}
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ fontWeight: 500, marginBottom: 4, display: 'block', color: '#145a32', fontSize: 14 }}>
                            Current QR Code
                          </label>
                          <div style={{ textAlign: 'center', marginBottom: 8 }}>
                            <img 
                              src={paymentSettings.classQrCodes?.[className] || '/images/gcashqr.png'} 
                              alt={`${className} QR Code`} 
                              style={{ 
                                width: 120, 
                                height: 120, 
                                objectFit: 'contain', 
                                borderRadius: 6, 
                                border: '1px solid #ddd',
                                background: '#fff',
                                cursor: 'pointer'
                              }} 
                              onClick={() => handleImageClick(paymentSettings.classQrCodes?.[className] || '/images/gcashqr.png')}
                              title="Click to view full size"
                            />
                          </div>
                        </div>

                        {/* Upload New QR Code */}
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ fontWeight: 500, marginBottom: 4, display: 'block', color: '#145a32', fontSize: 14 }}>
                            Upload New Regular QR Code
                          </label>
                          <input
                            ref={el => classQrCodeInputRefs.current[className] = el}
                            type="file"
                            accept="image/*"
                            onChange={handleClassQrCodeChange(className)}
                            style={{ 
                              width: '100%', 
                              padding: 6, 
                              borderRadius: 6, 
                              border: '1.5px solid #2ecc40', 
                              fontSize: 12, 
                              background: '#fff'
                            }}
                          />
                          {classQrCodeImages[className] && (
                            <div style={{ marginTop: 8, textAlign: 'center' }}>
                              <p style={{ marginBottom: 4, color: '#145a32', fontWeight: 500, fontSize: 12 }}>Preview:</p>
                              <img 
                                src={classQrCodeImages[className]} 
                                alt="QR Code Preview" 
                                style={{ 
                                  width: 80, 
                                  height: 80, 
                                  objectFit: 'contain', 
                                  borderRadius: 6, 
                                  border: '1px solid #ddd'
                                }} 
                              />
                            </div>
                          )}
                        </div>

                        {/* Current Member QR Code */}
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ fontWeight: 500, marginBottom: 4, display: 'block', color: '#2ecc40', fontSize: 14 }}>
                            Current Member QR Code (₱100 Discount)
                          </label>
                          <div style={{ textAlign: 'center', marginBottom: 8 }}>
                            <img 
                              src={paymentSettings.classMembershipQrCodes?.[className] || '/images/gcashqr.png'} 
                              alt={`${className} Member QR Code`} 
                              style={{ 
                                width: 100, 
                                height: 100, 
                                objectFit: 'contain', 
                                borderRadius: 6, 
                                border: '2px solid #2ecc40',
                                background: '#fff',
                                cursor: 'pointer'
                              }} 
                              onClick={() => handleImageClick(paymentSettings.classMembershipQrCodes?.[className] || '/images/gcashqr.png')}
                              title="Click to view full size"
                            />
                          </div>
                        </div>

                        {/* Upload New Member QR Code */}
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ fontWeight: 500, marginBottom: 4, display: 'block', color: '#2ecc40', fontSize: 14 }}>
                            Upload New Member QR Code
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleClassMembershipQrCodeChange(className)}
                            style={{ 
                              width: '100%', 
                              padding: 6, 
                              borderRadius: 6, 
                              border: '1.5px solid #2ecc40', 
                              fontSize: 12, 
                              background: '#fff'
                            }}
                          />
                          {classMembershipQrCodeImages[className] && (
                            <div style={{ marginTop: 8, textAlign: 'center' }}>
                              <p style={{ marginBottom: 4, color: '#2ecc40', fontWeight: 500, fontSize: 12 }}>Member QR Preview:</p>
                              <img 
                                src={classMembershipQrCodeImages[className]} 
                                alt="Member QR Code Preview" 
                                style={{ 
                                  width: 80, 
                                  height: 80, 
                                  objectFit: 'contain', 
                                  borderRadius: 6, 
                                  border: '2px solid #2ecc40'
                                }} 
                              />
                            </div>
                          )}
                        </div>

                        {/* Current Package QR Code */}
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ fontWeight: 500, marginBottom: 4, display: 'block', color: '#f39c12', fontSize: 14 }}>
                            Current Package QR Code (Member Exclusive)
                          </label>
                          <div style={{ textAlign: 'center', marginBottom: 8 }}>
                            <img 
                              src={paymentSettings.classPackageQrCodes?.[className] || '/images/gcashqr.png'} 
                              alt={`${className} Package QR Code`} 
                              style={{ 
                                width: 100, 
                                height: 100, 
                                objectFit: 'contain', 
                                borderRadius: 6, 
                                border: '2px solid #f39c12',
                                background: '#fff',
                                cursor: 'pointer'
                              }} 
                              onClick={() => handleImageClick(paymentSettings.classPackageQrCodes?.[className] || '/images/gcashqr.png')}
                              title="Click to view full size"
                            />
                          </div>
                        </div>

                        {/* Upload New Package QR Code */}
                        <div>
                          <label style={{ fontWeight: 500, marginBottom: 4, display: 'block', color: '#f39c12', fontSize: 14 }}>
                            Upload New Package QR Code
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleClassPackageQrCodeChange(className)}
                            style={{ 
                              width: '100%', 
                              padding: 6, 
                              borderRadius: 6, 
                              border: '1.5px solid #f39c12', 
                              fontSize: 12, 
                              background: '#fff'
                            }}
                          />
                          {classPackageQrCodeImages[className] && (
                            <div style={{ marginTop: 8, textAlign: 'center' }}>
                              <p style={{ marginBottom: 4, color: '#f39c12', fontWeight: 500, fontSize: 12 }}>Package QR Preview:</p>
                              <img 
                                src={classPackageQrCodeImages[className]} 
                                alt="Package QR Code Preview" 
                                style={{ 
                                  width: 80, 
                                  height: 80, 
                                  objectFit: 'contain', 
                                  borderRadius: 6, 
                                  border: '2px solid #f39c12'
                                }} 
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Package Pricing Section */}
                <div style={{ marginBottom: 32 }}>
                  <h4 style={{ marginBottom: 16, color: '#f39c12', fontWeight: 600, fontSize: 18 }}>Package Pricing Settings (Member Exclusive)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    {Object.keys(paymentSettings.packagePricing || paymentSettings.classRates || {}).map(className => (
                      <div key={className} style={{ background: '#fff9f0', padding: 16, borderRadius: 8, border: '2px solid #f39c12' }}>
                        <h5 style={{ margin: '0 0 12px 0', color: '#f39c12', fontWeight: 600, fontSize: 16 }}>{className} Package</h5>
                        
                        {/* Sessions Input */}
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ fontWeight: 500, marginBottom: 4, display: 'block', color: '#f39c12', fontSize: 14 }}>
                            Number of Sessions
                          </label>
                          <input
                            type="number"
                            name={`packagePricing.${className}.sessions`}
                            value={paymentSettings.packagePricing?.[className]?.sessions || 0}
                            onChange={handlePaymentSettingsChange}
                            min="1"
                            style={{ 
                              width: '100%', 
                              padding: 8, 
                              borderRadius: 6, 
                              border: '1.5px solid #f39c12', 
                              fontSize: 14, 
                              background: '#fff',
                              color: '#181818',
                              outline: 'none'
                            }}
                          />
                        </div>

                        {/* Price Input */}
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ fontWeight: 500, marginBottom: 4, display: 'block', color: '#f39c12', fontSize: 14 }}>
                            Package Price (₱)
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ marginRight: 4, color: '#f39c12', fontWeight: 'bold' }}>₱</span>
                            <input
                              type="number"
                              name={`packagePricing.${className}.price`}
                              value={paymentSettings.packagePricing?.[className]?.price || 0}
                              onChange={handlePaymentSettingsChange}
                              min="0"
                              step="0.01"
                              style={{ 
                                width: '100%', 
                                padding: 8, 
                                borderRadius: 6, 
                                border: '1.5px solid #f39c12', 
                                fontSize: 14, 
                                background: '#fff',
                                color: '#181818',
                                outline: 'none'
                              }}
                            />
                          </div>
                        </div>

                        {/* Savings Calculator */}
                        {paymentSettings.classRates?.[className] && paymentSettings.packagePricing?.[className] && (
                          <div style={{ 
                            background: '#fff', 
                            padding: 8, 
                            borderRadius: 6, 
                            border: '1px solid #f39c12',
                            fontSize: 12,
                            color: '#666'
                          }}>
                            <div>Individual: ₱{paymentSettings.classRates[className]} × {paymentSettings.packagePricing[className].sessions} = ₱{(paymentSettings.classRates[className] * paymentSettings.packagePricing[className].sessions).toLocaleString()}</div>
                            <div>Package: ₱{paymentSettings.packagePricing[className].price?.toLocaleString()}</div>
                            <div style={{ fontWeight: 'bold', color: '#27ae60' }}>
                              Savings: ₱{Math.max(0, (paymentSettings.classRates[className] * paymentSettings.packagePricing[className].sessions) - paymentSettings.packagePricing[className].price).toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Membership Settings Section */}
                <div style={{ marginBottom: 32 }}>
                  <h4 style={{ marginBottom: 16, color: '#145a32', fontWeight: 600, fontSize: 18 }}>Membership Settings</h4>
                  <div style={{ background: '#f8fff8', padding: 16, borderRadius: 8, border: '1px solid #e0e0e0', maxWidth: 350 }}>
                    <h5 style={{ margin: '0 0 8px 0', color: '#145a32', fontWeight: 600, fontSize: 16 }}>Monthly Membership</h5>
                    <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: 12, fontStyle: 'italic' }}>
                      This QR code will be used for membership applications and member discounts
                    </p>
                    
                    {/* Rate Input */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontWeight: 500, marginBottom: 4, display: 'block', color: '#145a32', fontSize: 14 }}>
                        Rate (₱)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: 4, color: '#145a32', fontWeight: 'bold' }}>₱</span>
                        <input
                          type="number"
                          name="membershipRate"
                          value={paymentSettings.membershipRate}
                          onChange={handlePaymentSettingsChange}
                          style={{ 
                            width: '100%', 
                            padding: 8, 
                            borderRadius: 6, 
                            border: '1.5px solid #2ecc40', 
                            fontSize: 14, 
                            background: '#fff',
                            color: '#181818',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    {/* Current QR Code */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontWeight: 500, marginBottom: 4, display: 'block', color: '#145a32', fontSize: 14 }}>
                        Current QR Code
                      </label>
                      <div style={{ textAlign: 'center', marginBottom: 8 }}>
                        <img 
                          src={paymentSettings.membershipQrCode || '/images/gcashqr.png'} 
                          alt="Membership QR Code" 
                          style={{ 
                            width: 120, 
                            height: 120, 
                            objectFit: 'contain', 
                            borderRadius: 6, 
                            border: '1px solid #ddd',
                            background: '#fff',
                            cursor: 'pointer'
                          }} 
                          onClick={() => handleImageClick(paymentSettings.membershipQrCode || '/images/gcashqr.png')}
                          title="Click to view full size"
                        />
                      </div>
                    </div>

                    {/* Upload New QR Code */}
                    <div>
                      <label style={{ fontWeight: 500, marginBottom: 4, display: 'block', color: '#145a32', fontSize: 14 }}>
                        Upload New QR Code
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMembershipQrCodeChange}
                        style={{ 
                          width: '100%', 
                          padding: 6, 
                          borderRadius: 6, 
                          border: '1.5px solid #2ecc40', 
                          fontSize: 12, 
                          background: '#fff'
                        }}
                      />
                      {membershipQrCodeImage && (
                        <div style={{ marginTop: 8, textAlign: 'center' }}>
                          <p style={{ marginBottom: 4, color: '#145a32', fontWeight: 500, fontSize: 12 }}>Preview:</p>
                          <img 
                            src={membershipQrCodeImage} 
                            alt="QR Code Preview" 
                            style={{ 
                              width: 80, 
                              height: 80, 
                              objectFit: 'contain', 
                              borderRadius: 6, 
                              border: '1px solid #ddd'
                            }} 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>



                <div style={{ textAlign: 'center' }}>
                  <button 
                    onClick={savePaymentSettings} 
                    style={{ 
                      background: '#2ecc40', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: 8, 
                      padding: '12px 32px', 
                      fontWeight: 'bold', 
                      fontSize: 16, 
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={e => e.target.style.background = '#145a32'}
                    onMouseOut={e => e.target.style.background = '#2ecc40'}
                  >
                    Save Payment Settings
                  </button>
                  {paymentSettingsMessage && (
                    <p style={{ marginTop: 16, color: '#145a32', fontWeight: 500, textAlign: 'center' }}>
                      {paymentSettingsMessage}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Membership Applications Section */}
          {activeSection === 'membershipApplications' && (
            <section className="members-section">
              <div className="section-header" style={{ paddingTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="section-bar"></div>
                  <h2 className="admin-section-title" style={{
                    fontFamily: 'Nico Moji, Arial Rounded MT Bold, Arial, sans-serif',
                    fontSize: '2.5rem',
                    color: '#181818',
                    fontWeight: 'bold',
                    letterSpacing: '3px',
                    margin: '0 0 24px 0',
                    borderLeft: '6px solid #2ecc40',
                    paddingLeft: '10px',
                    textTransform: 'uppercase',
                    background: 'none',
                    boxShadow: 'none'
                  }}>MEMBERSHIP APPLICATIONS</h2>
                </div>
              </div>
              <MembershipApplicationsPanel />
            </section>
          )}

          {/* Membership Expiration Management Section */}
          {activeSection === 'membershipExpiration' && (
            <section className="membership-expiration-section">
              <div className="section-header" style={{ paddingTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="section-bar"></div>
                  <h2 className="admin-section-title" style={{
                    fontFamily: 'Nico Moji, Arial Rounded MT Bold, Arial, sans-serif',
                    fontSize: '2.5rem',
                    color: '#181818',
                    fontWeight: 'bold',
                    letterSpacing: '3px',
                    margin: '0 0 24px 0',
                    borderLeft: '6px solid #2ecc40',
                    paddingLeft: '10px',
                    textTransform: 'uppercase',
                    background: 'none',
                    boxShadow: 'none'
                  }}>MEMBERSHIP EXPIRATION</h2>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: 18, color: '#2ecc40', marginRight: 24, marginTop: 8, minWidth: 320, textAlign: 'right' }}>
                  {phTime}
                </div>
              </div>

              <div style={{ margin: '32px auto', maxWidth: 1200, padding: '0 20px' }}>
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24, marginBottom: 32 }}>
                  {expirationSummaryLoading ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#888', fontSize: 18 }}>
                      Loading summary...
                    </div>
                  ) : (
                    <>
                      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '2px solid #2ecc40' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontSize: 32, marginRight: 12 }}>✅</span>
                          <div>
                            <h3 style={{ margin: 0, color: '#2ecc40', fontSize: 20, fontWeight: 'bold' }}>Active Memberships</h3>
                          </div>
                        </div>
                        <div style={{ fontSize: 36, fontWeight: 'bold', color: '#145a32' }}>
                          {membershipExpirationSummary.totalActive || 0}
                        </div>
                      </div>

                      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '2px solid #f39c12' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontSize: 32, marginRight: 12 }}>⏰</span>
                          <div>
                            <h3 style={{ margin: 0, color: '#f39c12', fontSize: 20, fontWeight: 'bold' }}>Expiring in 3 Days</h3>
                          </div>
                        </div>
                        <div style={{ fontSize: 36, fontWeight: 'bold', color: '#e67e22' }}>
                          {membershipExpirationSummary.expiringIn3Days || 0}
                        </div>
                      </div>

                      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '2px solid #e74c3c' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontSize: 32, marginRight: 12 }}>🚨</span>
                          <div>
                            <h3 style={{ margin: 0, color: '#e74c3c', fontSize: 20, fontWeight: 'bold' }}>Expiring Today</h3>
                          </div>
                        </div>
                        <div style={{ fontSize: 36, fontWeight: 'bold', color: '#c0392b' }}>
                          {membershipExpirationSummary.expiringToday || 0}
                        </div>
                      </div>

                      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '2px solid #9b59b6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontSize: 32, marginRight: 12 }}>📅</span>
                          <div>
                            <h3 style={{ margin: 0, color: '#9b59b6', fontSize: 20, fontWeight: 'bold' }}>Expiring in 1 Week</h3>
                          </div>
                        </div>
                        <div style={{ fontSize: 36, fontWeight: 'bold', color: '#8e44ad' }}>
                          {membershipExpirationSummary.expiringIn1Week || 0}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Control Panel */}
                <div style={{ 
                  background: 'linear-gradient(135deg, #f8fff8 0%, #eaffea 100%)', 
                  borderRadius: 16, 
                  padding: 32, 
                  boxShadow: '0 4px 24px rgba(44, 204, 64, 0.10)', 
                  border: '2px solid #2ecc40' 
                }}>
                  <h3 style={{ color: '#145a32', marginBottom: 24, fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>
                    🔧 Membership Expiration Management
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                    {/* Manual Check Section */}
                    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <h4 style={{ color: '#145a32', marginBottom: 16, fontSize: 18 }}>📋 Manual Check</h4>
                      <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
                        Run a manual check for expiring memberships and send notifications to users.
                      </p>
                      <button
                        onClick={handleCheckExpiringMemberships}
                        disabled={checkingExpiration}
                        style={{
                          background: checkingExpiration ? '#95a5a6' : '#2ecc40',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '12px 24px',
                          fontWeight: 'bold',
                          fontSize: 16,
                          cursor: checkingExpiration ? 'not-allowed' : 'pointer',
                          width: '100%',
                          transition: 'background 0.2s'
                        }}
                      >
                        {checkingExpiration ? 'Checking...' : '🔍 Check Expiring Memberships'}
                      </button>
                    </div>

                    {/* Test Notifications Section */}
                    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <h4 style={{ color: '#145a32', marginBottom: 16, fontSize: 18 }}>🧪 Test Notifications</h4>
                      <p style={{ color: '#666', marginBottom: 12, fontSize: 14 }}>
                        Send test notifications to a specific user.
                      </p>
                      
                      <input
                        type="text"
                        placeholder="Enter username or user ID"
                        value={testUserId}
                        onChange={(e) => setTestUserId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: 10,
                          borderRadius: 6,
                          border: '1px solid #ddd',
                          marginBottom: 12,
                          fontSize: 14
                        }}
                      />
                      
                      <select
                        value={testNotificationType}
                        onChange={(e) => setTestNotificationType(e.target.value)}
                        style={{
                          width: '100%',
                          padding: 10,
                          borderRadius: 6,
                          border: '1px solid #ddd',
                          marginBottom: 12,
                          fontSize: 14,
                          background: '#fff'
                        }}
                      >
                        <option value="3day">3-Day Reminder</option>
                        <option value="1day">1-Day Reminder</option>
                        <option value="expired">Expiration Notice</option>
                      </select>
                      
                      <button
                        onClick={handleSendTestNotification}
                        disabled={sendingTestNotification}
                        style={{
                          background: sendingTestNotification ? '#95a5a6' : '#f39c12',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '12px 24px',
                          fontWeight: 'bold',
                          fontSize: 16,
                          cursor: sendingTestNotification ? 'not-allowed' : 'pointer',
                          width: '100%',
                          transition: 'background 0.2s'
                        }}
                      >
                        {sendingTestNotification ? 'Sending...' : '📤 Send Test Notification'}
                      </button>
                    </div>

                    {/* Refresh Summary Section */}
                    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <h4 style={{ color: '#145a32', marginBottom: 16, fontSize: 18 }}>🔄 Refresh Summary</h4>
                      <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
                        Update the membership expiration summary with latest data.
                      </p>
                      <button
                        onClick={fetchMembershipExpirationSummary}
                        disabled={expirationSummaryLoading}
                        style={{
                          background: expirationSummaryLoading ? '#95a5a6' : '#3498db',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '12px 24px',
                          fontWeight: 'bold',
                          fontSize: 16,
                          cursor: expirationSummaryLoading ? 'not-allowed' : 'pointer',
                          width: '100%',
                          transition: 'background 0.2s'
                        }}
                      >
                        {expirationSummaryLoading ? 'Refreshing...' : '🔄 Refresh Summary'}
                      </button>
                    </div>
                  </div>

                  {/* Status Message */}
                  {expirationMessage && (
                    <div style={{
                      marginTop: 20,
                      padding: 16,
                      borderRadius: 8,
                      background: expirationMessage.includes('❌') ? '#fff5f5' : '#f0fff4',
                      border: `1px solid ${expirationMessage.includes('❌') ? '#fed7d7' : '#c6f6d5'}`,
                      color: expirationMessage.includes('❌') ? '#c53030' : '#2f855a',
                      fontWeight: 'bold',
                      fontSize: 14,
                      textAlign: 'center'
                    }}>
                      {expirationMessage}
                    </div>
                  )}

                  {/* Info Section */}
                  <div style={{
                    marginTop: 24,
                    padding: 16,
                    borderRadius: 8,
                    background: '#f7fafc',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h5 style={{ color: '#2d3748', marginBottom: 8, fontSize: 16 }}>ℹ️ System Information</h5>
                    <ul style={{ color: '#4a5568', fontSize: 14, margin: 0, paddingLeft: 20 }}>
                      <li>Automatic expiration checks run every hour</li>
                      <li>3-day reminders are sent once per membership</li>
                      <li>1-day reminders are sent once per membership</li>
                      <li>Expiration notices are sent on the day of expiration</li>
                      <li>Users receive notifications in their notification panel</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Email Template Section */}
          {activeSection === 'emailTemplate' && (
            <section className="email-template-section">
              <EmailTemplateEditor />
            </section>
          )}

          {/* Booking Email Template Section */}
          {activeSection === 'bookingEmailTemplate' && (
            <section className="booking-email-template-section">
              <BookingEmailTemplateEditor />
            </section>
          )}

          {/* Email Branding Section */}
          {activeSection === 'emailBrand' && (
            <section className="email-brand-section">
              <EmailBrandEditor />
            </section>
          )}
        </main>
      </div>

      {/* Image Modal */}
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
              alt="Payment Proof" 
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

      {toast && (
        <div style={{ position: 'fixed', top: 30, left: '50%', transform: 'translateX(-50%)', background: '#145a32', color: '#fff', padding: '12px 32px', borderRadius: 8, fontWeight: 'bold', fontSize: 18, zIndex: 9999, boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
          {toast}
        </div>
      )}
    </div>
  );
};

export default Admin; 
