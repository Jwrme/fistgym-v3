import React, { useState, useRef, useEffect } from 'react';

const HomeSettings = () => {
  const [homeTitle, setHomeTitle] = useState('');
  const [homeSubtitle, setHomeSubtitle] = useState('');
  const [fistGymTitle, setFistGymTitle] = useState('');
  const [fistGymDesc, setFistGymDesc] = useState('');
  const [fistGymCTA, setFistGymCTA] = useState('');
  const [fistGymImg, setFistGymImg] = useState('');
  const [previewImg, setPreviewImg] = useState('');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef();

  useEffect(() => {
    fetch('http://localhost:3001/api/home-content')
      .then(res => res.json())
      .then(data => {
        setHomeTitle(data.title || '');
        setHomeSubtitle(data.subtitle || '');
        setFistGymTitle(data.fistGymTitle || '');
        setFistGymDesc(data.fistGymDesc || '');
        setFistGymCTA(data.fistGymCTA || '');
        setFistGymImg(data.fistGymImg || '');
        setPreviewImg(data.fistGymImg || '');
      });
  }, []);

  const handleImageChange = e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImg(reader.result);
        setFistGymImg(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      title: homeTitle,
      subtitle: homeSubtitle,
      fistGymTitle,
      fistGymDesc,
      fistGymCTA,
      fistGymImg: previewImg // send base64 if changed, or URL if unchanged
    };
    try {
      const res = await fetch('http://localhost:3001/api/home-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setMessage(data.message || 'Settings saved!');
      setTimeout(() => setMessage(''), 2000);
      if (data.homeContent && data.homeContent.fistGymImg) {
        setPreviewImg(data.homeContent.fistGymImg);
        setFistGymImg(data.homeContent.fistGymImg);
      }
    } catch {
      setMessage('Failed to save settings.');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh', width: '100%' }}>
      <div style={{
        background: '#fff',
        borderRadius: 18,
        boxShadow: '0 4px 32px rgba(44,204,64,0.13)',
        padding: '40px 36px 36px 0',
        maxWidth: 520,
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'stretch',
        position: 'relative',
      }}>
        <div style={{ width: 8, background: '#2ecc40', borderRadius: '18px 0 0 18px', marginRight: 32, minHeight: 320 }}></div>
        <form onSubmit={handleSave} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h2 style={{ marginBottom: 18, fontWeight: 700, fontSize: 28, color: '#181818', letterSpacing: 1, textAlign: 'left', fontFamily: 'Inter, Arial, sans-serif', maxWidth: '100%' }}>
            Home Page Settings
          </h2>
          <label style={{ fontWeight: 500, color: '#145a32', fontSize: 15 }}>Home Title</label>
          <input type="text" value={homeTitle} onChange={e => setHomeTitle(e.target.value)} placeholder="Home page title" style={{ borderRadius: 8, border: '1.5px solid #2ecc40', padding: '13px 16px', fontSize: 16, background: '#f8fff8', color: '#181818', outline: 'none', transition: 'border 0.2s' }} />
          <label style={{ fontWeight: 500, color: '#145a32', fontSize: 15 }}>Home Subtitle</label>
          <input type="text" value={homeSubtitle} onChange={e => setHomeSubtitle(e.target.value)} placeholder="Home page subtitle" style={{ borderRadius: 8, border: '1.5px solid #2ecc40', padding: '13px 16px', fontSize: 16, background: '#f8fff8', color: '#181818', outline: 'none', transition: 'border 0.2s' }} />
          <label style={{ fontWeight: 500, color: '#145a32', fontSize: 15 }}>FIST Gym Section Title</label>
          <input type="text" value={fistGymTitle} onChange={e => setFistGymTitle(e.target.value)} placeholder="FIST Gym section title" style={{ borderRadius: 8, border: '1.5px solid #2ecc40', padding: '13px 16px', fontSize: 16, background: '#f8fff8', color: '#181818', outline: 'none', transition: 'border 0.2s' }} />
          <label style={{ fontWeight: 500, color: '#145a32', fontSize: 15 }}>FIST Gym Section Description</label>
          <textarea value={fistGymDesc} onChange={e => setFistGymDesc(e.target.value)} placeholder="FIST Gym section description" rows={3} style={{ borderRadius: 8, border: '1.5px solid #2ecc40', padding: '13px 16px', fontSize: 16, background: '#f8fff8', color: '#181818', outline: 'none', transition: 'border 0.2s', resize: 'vertical' }} />
          <label style={{ fontWeight: 500, color: '#145a32', fontSize: 15 }}>FIST Gym Section CTA</label>
          <input type="text" value={fistGymCTA} onChange={e => setFistGymCTA(e.target.value)} placeholder="FIST Gym section call-to-action" style={{ borderRadius: 8, border: '1.5px solid #2ecc40', padding: '13px 16px', fontSize: 16, background: '#f8fff8', color: '#181818', outline: 'none', transition: 'border 0.2s' }} />
          <label style={{ fontWeight: 500, color: '#145a32', fontSize: 15 }}>FIST Gym Section Image</label>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            {previewImg && (
              <img src={previewImg} alt="FIST Gym Preview" style={{ width: 180, height: 'auto', borderRadius: 12, marginBottom: 6, border: '2px solid #2ecc40', objectFit: 'cover', background: '#f8fff8' }} />
            )}
            <button type="button" onClick={() => fileInputRef.current.click()} style={{ background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer', marginBottom: 0 }}>Upload Image</button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
          </div>
          <button type="submit" style={{ background: 'linear-gradient(90deg, #2ecc40 60%, #27ae60 100%)', color: '#fff', border: 'none', borderRadius: 8, padding: '15px 0', fontWeight: 'bold', fontSize: 18, letterSpacing: 2, cursor: 'pointer', width: '100%', marginTop: 10, boxShadow: '0 2px 8px rgba(44,204,64,0.10)', transition: 'background 0.2s' }}
            onMouseOver={e => e.target.style.background = '#145a32'}
            onMouseOut={e => e.target.style.background = 'linear-gradient(90deg, #2ecc40 60%, #27ae60 100%)'}
          >Save</button>
          {message && <div style={{ color: '#2ecc40', fontWeight: 'bold', marginTop: 10 }}>{message}</div>}
        </form>
      </div>
    </div>
  );
};

export default HomeSettings; 