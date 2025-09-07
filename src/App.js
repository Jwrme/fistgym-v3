import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Promos from './components/Promos';
import Schedules from './components/Schedules';
import Rates from './components/Rates';
import Login from './components/Login';
import Classes from './components/Classes';
import CoachProfile from './components/CoachProfile';
import Admin from './components/Admin';
import Payroll from './components/Payroll';
import Payslip from './components/Payslip';
import UserProfile from './components/UserProfile';
import PageTransition from './PageTransition';
import Settings from './pages/Settings';
import Inbox from './pages/Inbox';
import ForgotPassword from './components/ForgotPassword';
import Contact from './components/Contact';
import ReactMarkdown from 'react-markdown';
import Membership from './components/Membership';
import AIChatbot from './components/AIChatbot';
import './App.css';
import './responsive.css';
// Activate global API base URL and fetch override
import './utils/apiConfig';

const Home = () => {
  const [hovered, setHovered] = useState(null);
  const [coachHovered, setCoachHovered] = useState(null);
  const [homeContent, setHomeContent] = useState({ title: '', subtitle: '', background: '', classesTitle: '', classesBg: '' });
  const [classes, setClasses] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [classCarouselIdx, setClassCarouselIdx] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [slideDirection, setSlideDirection] = useState('');
  const [coachCarouselIdx, setCoachCarouselIdx] = useState(0);
  const [isCoachSliding, setIsCoachSliding] = useState(false);
  const [coachSlideDirection, setCoachSlideDirection] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const CLASSES_PER_PAGE = 3;
  const COACHES_PER_PAGE = 3;

  // 🚀 SUPER OPTIMIZED: Minimal data loading for home page (no schedules/bookings)
  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      // 🚀 PERFORMANCE: Skip booking status for coaches on home page (80% faster!)
      const skipBookingStatus = '?skipBookingStatus=true';
      
      // Add timeout to prevent hanging
      const fetchWithTimeout = (url, timeout = 10000) => {
        return Promise.race([
          fetch(url),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ]);
      };
      
      const [homeRes, classesRes, coachesRes] = await Promise.all([
        fetchWithTimeout('/api/home-content'),
        fetchWithTimeout('/api/classes'),
        fetchWithTimeout(`/api/coaches${skipBookingStatus}`) // 🚀 No booking calculations!
      ]);

      // Check if responses are ok
      if (!homeRes.ok || !classesRes.ok || !coachesRes.ok) {
        throw new Error('One or more API requests failed');
      }

      const [homeData, classesData, coachesData] = await Promise.all([
        homeRes.json(),
        classesRes.json(),
        coachesRes.json()
      ]);

      setHomeContent(homeData);
      setClasses(classesData);
      setCoaches(coachesData);
      
      console.log('🏠 Home page data loaded successfully (no booking data for performance)');
    } catch (err) {
      console.error('Error loading home page data:', err);
      // Set fallback data to prevent blank page
      setHomeContent({ 
        title: 'FITNESS AND SELF-DEFENSE', 
        subtitle: 'MIXED MARTIAL ARTS',
        background: '/images/cage22.png',
        classesBg: '/images/background home.jpg'
      });
      setClasses([]);
      setCoaches([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(); // Load once on mount
    
    // ✅ Auto-refresh removed for better performance
    // 📱 Data will refresh when user navigates back to page
  }, []);

  return (
    <>
      {/* Hero Section with its own background */}
      <section
        style={{
          position: 'relative',
          background: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('${homeContent.background || '/images/cage22.png'}') center/cover no-repeat`,
          padding: '60px 0 0 0',
        }}
      >
        {/* Manual Refresh Button */}
        <button
          onClick={fetchData}
          disabled={isRefreshing}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: isRefreshing ? 'rgba(46,204,64,0.3)' : 'rgba(46,204,64,0.8)',
            border: 'none',
            borderRadius: '50%',
            width: 44,
            height: 44,
            cursor: isRefreshing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease',
            zIndex: 10,
            opacity: 0.7,
          }}
          onMouseEnter={(e) => {
            if (!isRefreshing) {
              e.target.style.opacity = '1';
              e.target.style.background = 'rgba(46,204,64,1)';
              e.target.style.transform = 'scale(1.1)';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.opacity = '0.7';
            e.target.style.background = 'rgba(46,204,64,0.8)';
            e.target.style.transform = 'scale(1)';
          }}
          title="Refresh home page data"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="white" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            }}
          >
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="m20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
          </svg>
        </button>
        
        <div className="home-hero-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 40px 40px 40px' }}>
          <h1 className="home-hero-title" style={{
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '2.7rem',
            letterSpacing: '4px',
            fontFamily: 'Courier New, Courier, monospace',
            borderLeft: '6px solid #2ecc40',
            paddingLeft: 16,
            margin: 0,
            lineHeight: 1.1,
            textAlign: 'left',
            textShadow: '2px 2px 0 #181818',
          }}>
            {homeContent.title || 'FITNESS AND SELF-DEFENSE'}<br />{homeContent.title && homeContent.title.includes('TECHNIQUES') ? '' : 'TECHNIQUES'}
          </h1>
          <div className="home-hero-subtitle" style={{ color: '#fff', fontSize: '1.1rem', marginTop: 18, marginLeft: 8, letterSpacing: 2, textAlign: 'left'}}>{homeContent.subtitle || 'MIXED MARTIAL ARTS'}</div>
        </div>
      </section>

      {/* Shared background for COACHES, FIST GYM, and CLASSES section */}
      <div style={{
        position: 'relative',
        width: '100vw',
        minHeight: '100vh',
        background: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('${homeContent.classesBg || '/images/background home.jpg'}') center/cover no-repeat`,
        overflow: 'hidden',
        paddingBottom: 0,
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Coaches Section */}
          <section style={{ width: '100vw', paddingBottom: '60px' }}>
            <div className="home-section-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 40px 0 40px' }}>
              <h2 className="home-section-title" style={{
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '2.3rem',
                letterSpacing: '3px',
                fontFamily: 'Courier New, Courier, monospace',
                borderLeft: '6px solid #2ecc40',
                paddingLeft: 14,
                marginBottom: 32,
                marginTop: 0,
                textShadow: '2px 2px 0 #181818',
                textAlign: 'left',  
              }}>
                COACHES
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, minHeight: 240 }}>
                {coachCarouselIdx > 0 && (
                  <button
                    onClick={() => {
                      setCoachSlideDirection('left');
                      setIsCoachSliding(true);
                      setTimeout(() => {
                        setCoachCarouselIdx(coachCarouselIdx - COACHES_PER_PAGE);
                        setIsCoachSliding(false);
                      }, 800);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #2ecc40 60%, #27ae60 100%)',
                      border: 'none',
                      borderRadius: '50%',
                      width: 54,
                      height: 54,
                      fontSize: 28,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 4px 18px rgba(46,204,64,0.22)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'scale(1.15)';
                      e.currentTarget.style.boxShadow = '0 8px 32px rgba(46,204,64,0.4), 0 0 20px rgba(46,204,64,0.3)';
                      e.currentTarget.style.background = 'linear-gradient(135deg, #39ff6a 60%, #2ecc40 100%)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 18px rgba(46,204,64,0.22)';
                      e.currentTarget.style.background = 'linear-gradient(135deg, #2ecc40 60%, #27ae60 100%)';
                    }}
                    onMouseDown={e => {
                      e.currentTarget.style.transform = 'scale(0.95)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(46,204,64,0.3)';
                    }}
                    onMouseUp={e => {
                      e.currentTarget.style.transform = 'scale(1.15)';
                      e.currentTarget.style.boxShadow = '0 8px 32px rgba(46,204,64,0.4), 0 0 20px rgba(46,204,64,0.3)';
                    }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                )}
                <div style={{
                  overflow: 'hidden',
                  width: `${COACHES_PER_PAGE * 320}px`,
                  maxWidth: '100%',
                  position: 'relative',
                  minHeight: 240,
                  display: 'flex',
                  justifyContent: 'flex-start',
                }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 40,
                      width: `${coaches.length * 320}px`,
                      transform: isCoachSliding 
                        ? `translateX(-${coachCarouselIdx * 320}px) scale(0.98) rotateY(2deg)`
                        : `translateX(-${coachCarouselIdx * 320}px) scale(1) rotateY(0deg)`,
                      opacity: isCoachSliding ? 0.85 : 1,
                      filter: isCoachSliding ? 'blur(1px) brightness(0.9)' : 'blur(0px) brightness(1)',
                      transition: isCoachSliding 
                        ? 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.8s ease-out, filter 0.8s ease-out' 
                        : 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-in, filter 0.4s ease-in',
                    }}
                  >
                    {coaches.map((coach, idx) => {
                      const coachSlug = coach.username ? coach.username.toLowerCase() : (coach.name ? coach.name.toLowerCase().replace(/[^a-z0-9]+/g, '') : '');
                      return (
                        <Link
                          to={`/coaches?coach=${coachSlug}`}
                          key={coach._id}
                          style={{
                            textDecoration: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            background: 'none',
                            boxShadow: 'none',
                            minWidth: 280,
                            maxWidth: 300,
                            width: 280,
                            flexShrink: 0,
                            padding: '0 0 18px 0',
                            borderRadius: 0,
                            margin: '0 0 0 0',
                            cursor: 'pointer',
                            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            transform: coachHovered === idx ? 'translateY(-8px) scale(1.05)' : 'translateY(0) scale(1)',
                            filter: coachHovered === idx ? 'drop-shadow(0 20px 25px rgba(46,204,64,0.15))' : 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))',
                          }}
                          onMouseEnter={() => setCoachHovered(idx)}
                          onMouseLeave={() => setCoachHovered(null)}
                        >
                          <img
                            src={coach.profilePic || '/images/placeholder.jpg'}
                            alt={coach.firstname ? coach.firstname + ' ' + coach.lastname : coach.name}
                            style={{
                              width: 140,
                              height: 140,
                              objectFit: 'cover',
                              borderRadius: '50%',
                              margin: '24px auto 0 auto',
                              border: '5px solid #2ecc40',
                              boxShadow: coachHovered === idx 
                                ? '0 0 0 6px #39ff6a, 0 8px 32px rgba(46,204,64,0.4), inset 0 0 20px rgba(46,204,64,0.1)' 
                                : '0 0 0 2px #2ecc40, 0 4px 16px rgba(46,204,64,0.15)',
                              background: coachHovered === idx ? 'linear-gradient(135deg, #222 0%, #2a2a2a 100%)' : '#222',
                              display: 'block',
                              transform: coachHovered === idx ? 'scale(1.12) rotateZ(2deg)' : 'scale(1) rotateZ(0deg)',
                              filter: coachHovered === idx ? 'brightness(1.1) contrast(1.05)' : 'brightness(1) contrast(1)',
                              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            }}
                          />
                          <span style={{
                            fontWeight: 'bold',
                            fontSize: '1.25rem',
                            color: coachHovered === idx ? '#39ff6a' : '#fff',
                            marginTop: 18,
                            textAlign: 'center',
                            fontFamily: 'Afacad, Arial, sans-serif',
                            background: coachHovered === idx 
                              ? 'linear-gradient(90deg, rgba(46,204,64,0.1) 0%, rgba(57,255,106,0.05) 100%)' 
                              : 'none',
                            width: '100%',
                            padding: coachHovered === idx ? '8px 0 12px 0' : '8px 0 12px 0',
                            borderRadius: coachHovered === idx ? '8px 8px 0 0' : '0',
                            borderTop: coachHovered === idx ? '3px solid #39ff6a' : '3px solid #2ecc40',
                            letterSpacing: coachHovered === idx ? 2 : 1.5,
                            boxShadow: coachHovered === idx 
                              ? '0 0 15px rgba(57,255,106,0.3), inset 0 1px 3px rgba(57,255,106,0.1)' 
                              : 'none',
                            display: 'block',
                            textShadow: coachHovered === idx 
                              ? '0 0 10px rgba(57,255,106,0.6), 0 2px 4px rgba(0,0,0,0.3)' 
                              : '0 2px 4px rgba(0,0,0,0.5)',
                            transform: coachHovered === idx ? 'translateY(-2px)' : 'translateY(0)',
                            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          }}>{coach.firstname ? `COACH ${coach.firstname}` : coach.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
                {coachCarouselIdx + COACHES_PER_PAGE < coaches.length && (
                  <button
                    onClick={() => {
                      setCoachSlideDirection('right');
                      setIsCoachSliding(true);
                      setTimeout(() => {
                        setCoachCarouselIdx(coachCarouselIdx + COACHES_PER_PAGE);
                        setIsCoachSliding(false);
                      }, 800);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #2ecc40 60%, #27ae60 100%)',
                      border: 'none',
                      borderRadius: '50%',
                      width: 54,
                      height: 54,
                      fontSize: 28,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 4px 18px rgba(46,204,64,0.22)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'scale(1.15)';
                      e.currentTarget.style.boxShadow = '0 8px 32px rgba(46,204,64,0.4), 0 0 20px rgba(46,204,64,0.3)';
                      e.currentTarget.style.background = 'linear-gradient(135deg, #39ff6a 60%, #2ecc40 100%)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 18px rgba(46,204,64,0.22)';
                      e.currentTarget.style.background = 'linear-gradient(135deg, #2ecc40 60%, #27ae60 100%)';
                    }}
                    onMouseDown={e => {
                      e.currentTarget.style.transform = 'scale(0.95)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(46,204,64,0.3)';
                    }}
                    onMouseUp={e => {
                      e.currentTarget.style.transform = 'scale(1.15)';
                      e.currentTarget.style.boxShadow = '0 8px 32px rgba(46,204,64,0.4), 0 0 20px rgba(46,204,64,0.3)';
                    }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* FIST Gym, Your Gym Section */}
          <section className="fist-gym-section">
            <div className="fist-gym-flex">
              <div className="fist-gym-img-col">
                {homeContent.fistGymImg && (
                  <img
                    src={homeContent.fistGymImg}
                    alt="FIST Gym Action"
                    className="fist-gym-img"
                  />
                )}
              </div>
              <div className="fist-gym-content-col">
                {/* FIST Gym Section Title - support <span> for white highlight */}
                <h2 className="fist-gym-title">
                  {homeContent.fistGymTitle && homeContent.fistGymTitle.includes('<span')
                    ? <span dangerouslySetInnerHTML={{ __html: homeContent.fistGymTitle }} />
                    : homeContent.fistGymTitle || 'FIST Gym, Your Gym'}
                </h2>
                {/* FIST Gym Section Description with Markdown support */}
                <div className="fist-gym-desc" style={{ width: '100%' }}>
                  <ReactMarkdown
                    components={{
                      a: ({node, ...props}) => <a {...props} className="fist-gym-green fist-gym-link" />
                    }}
                  >
                    {homeContent.fistGymDesc || ''}
                  </ReactMarkdown>
                </div>
                {homeContent.fistGymCTA && (
                  <p className="fist-gym-desc fist-gym-cta">{homeContent.fistGymCTA}</p>
                )}
              </div>
            </div>
          </section>

          {/* Classes Section */}
          <section style={{ width: '100vw', paddingBottom: '60px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 40px 0 40px' }}>
              <h2 style={{
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '2.3rem',
                letterSpacing: '3px',
                fontFamily: 'Courier New, Courier, monospace',
                borderLeft: '6px solid #2ecc40',
                paddingLeft: 14,
                marginBottom: 32,
                marginTop: 0,
                textShadow: '2px 2px 0 #181818',
                textAlign: 'left',
              }}>
                {homeContent.classesTitle || 'CLASSES'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, minHeight: 240 }}>
                {classCarouselIdx > 0 && (
                  <button
                    onClick={() => {
                      setSlideDirection('left');
                      setIsSliding(true);
                      setTimeout(() => {
                        setClassCarouselIdx(classCarouselIdx - CLASSES_PER_PAGE);
                        setIsSliding(false);
                      }, 800);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #2ecc40 60%, #27ae60 100%)',
                      border: 'none',
                      borderRadius: '50%',
                      width: 54,
                      height: 54,
                      fontSize: 28,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 4px 18px rgba(46,204,64,0.22)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.18s cubic-bezier(.4,0,.2,1), box-shadow 0.18s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.12)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                )}
                <div style={{
                  overflow: 'hidden',
                  width: `${Math.min(CLASSES_PER_PAGE, classes.length - classCarouselIdx) * 260 + Math.max(0, Math.min(CLASSES_PER_PAGE, classes.length - classCarouselIdx) - 1) * 40}px`,
                  maxWidth: '100%',
                  position: 'relative',
                  minHeight: 240,
                  display: 'flex',
                  justifyContent: 'flex-start',
                }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 40,
                      minWidth: `${Math.min(CLASSES_PER_PAGE, classes.length - classCarouselIdx) * 260 + Math.max(0, Math.min(CLASSES_PER_PAGE, classes.length - classCarouselIdx) - 1) * 40}px`,
                      transform: isSliding
                        ? slideDirection === 'left'
                          ? 'translateX(120px)'
                          : 'translateX(-120px)'
                        : 'translateX(0)',
                      opacity: isSliding ? 0.4 : 1,
                      transition: 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    }}
                  >
                    {classes.slice(classCarouselIdx, classCarouselIdx + CLASSES_PER_PAGE).map((cls, idx) => (
                      <Link
                        to={`/classes?class=${encodeURIComponent(cls.name.toLowerCase())}`}
                        key={cls._id}
                        className="home-class-card"
                        style={{
                          minWidth: 260,
                          maxWidth: 280,
                          width: 260,
                          flexShrink: 0,
                          margin: 0,
                          boxSizing: 'border-box',
                          boxShadow: hovered === idx ? '0 0 8px 2px #39ff6a, 0 2px 12px rgba(46,204,64,0.13)' : '0 2px 12px rgba(46,204,64,0.13)',
                          border: hovered === idx ? '2px solid #39ff6a' : '1.5px solid rgba(255,255,255,0.18)',
                          background: hovered === idx ? 'rgba(24,24,24,0.24)' : 'rgba(24,24,24,0.18)',
                          transition: 'box-shadow 0.18s, border 0.18s, background 0.18s',
                          outline: 'none',
                        }}
                        onMouseEnter={() => setHovered(idx)}
                        onMouseLeave={() => setHovered(null)}
                      >
                        <img
                          src={cls.image}
                          alt={cls.name}
                          style={{
                            width: '100%',
                            height: 180,
                            objectFit: 'cover',
                            borderRadius: '18px 18px 0 0',
                            borderBottom: '4px solid #2ecc40',
                            transition: 'filter 0.18s',
                            display: 'block',
                          }}
                        />
                        <span className="home-class-card-name" style={{
                          color: hovered === idx ? '#39ff6a' : '#fff',
                          textShadow: hovered === idx ? '0 0 4px #39ff6a, 0 0 1px #2ecc40, 0 1px 4px rgba(0,0,0,0.18), 0 1px 1px #000' : '0 2px 8px rgba(0,0,0,0.28), 0 1px 1px #000',
                          background: 'none',
                          borderTop: 'none',
                          borderBottom: '4px solid transparent',
                          fontWeight: 'bold',
                          fontSize: '1.5rem',
                          width: '100%',
                          padding: '16px 0 12px 0',
                          borderRadius: '0 0 18px 18px',
                          letterSpacing: 1.5,
                          position: 'relative',
                          zIndex: 2,
                          transition: 'color 0.18s, text-shadow 0.18s',
                        }}>{cls.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
                {classCarouselIdx + CLASSES_PER_PAGE < classes.length && (
                  <button
                    onClick={() => {
                      setSlideDirection('right');
                      setIsSliding(true);
                      setTimeout(() => {
                        setClassCarouselIdx(classCarouselIdx + CLASSES_PER_PAGE);
                        setIsSliding(false);
                      }, 800);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #2ecc40 60%, #27ae60 100%)',
                      border: 'none',
                      borderRadius: '50%',
                      width: 54,
                      height: 54,
                      fontSize: 28,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 4px 18px rgba(46,204,64,0.22)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.18s cubic-bezier(.4,0,.2,1), box-shadow 0.18s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.12)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const [transitionActive, setTransitionActive] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setIsAdmin(!!parsedUser.isAdmin);
    }
    setIsLoading(false);

    // Listen for profilePicUpdated event
    const handleProfilePicUpdated = () => {
      const updatedUser = JSON.parse(localStorage.getItem('user'));
      if (updatedUser) setUser(updatedUser);
    };
    window.addEventListener('profilePicUpdated', handleProfilePicUpdated);
    return () => {
      window.removeEventListener('profilePicUpdated', handleProfilePicUpdated);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setIsAdmin(false);
  };

  // Custom navigation handler
  const handleNavigate = (path) => {
    if (path !== location.pathname) {
      setPendingPath(path);
      setTransitionActive(true);
    }
  };

  useEffect(() => {
    if (transitionActive && pendingPath) {
      const timeout = setTimeout(() => {
        navigate(pendingPath);
        setTransitionActive(false);
        setPendingPath(null);
      }, 700);
      return () => clearTimeout(timeout);
    }
  }, [transitionActive, pendingPath, navigate]);

  if (isLoading) return null;

  return (
    <>
      <PageTransition active={transitionActive} />
      <div className="App">
        <Navbar user={user} onLogout={handleLogout} isAdmin={isAdmin} handleNavigate={handleNavigate} />
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/promos" element={<Promos />} />
          <Route path="/schedules" element={<Schedules />} />
          <Route path="/rates" element={<Rates />} />
          <Route path="/login" element={<Login onLogin={(userData) => {
            setUser(userData);
            setIsAdmin(!!userData.isAdmin);
            if (userData.userType === 'coach' || userData.role === 'coach') {
              window.location.href = '/schedules';
            }
          }} />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/coaches" element={<CoachProfile />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/settings" element={
            user ? (
              <Settings user={user} onUpdate={(data) => {
                // Update user state and localStorage for real-time refresh
                const updatedUser = {
                  ...user,
                  firstname: data.firstname,
                  lastname: data.lastname,
                  username: data.username,
                  // Only update password in localStorage if you want to (optional)
                };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
              }} />
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/payslip" element={
            user && user.userType === 'coach' ? (
              <Payslip />
            ) : (
              <Navigate to="/login" replace />
            )
          } />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/membership" element={<Membership />} />
          {/* Admin Routes */}
          <Route 
            path="/admin/*" 
            element={
              isAdmin ? (
                <Admin />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
        </Routes>
        <div className="page-footer-divider"></div>
        <Footer />
        {/* AI Chatbot - appears on all pages */}
        <AIChatbot />
      </div>
    </>
  );
}

// Wrap App with Router at the top level
export default function AppWithRouter() {
  return (
    <Router>
      <App />
    </Router>
  );
}
