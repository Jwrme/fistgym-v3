import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../designs/rates.css';
import RateHoverModal from './RateHoverModal';

const Rates = () => {
    const [rates, setRates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [ratesSettings, setRatesSettings] = useState({ heading: '', banner: '' });
    const [siteSettings, setSiteSettings] = useState({ logoText: 'SenJitsu' });
    const [hovered, setHovered] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const fetchRates = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/rates');
            if (!response.ok) throw new Error('Failed to fetch rates');
            const data = await response.json();
            setRates(data);
        } catch (err) {
            setError('Error fetching rates.');
        } finally {
            setLoading(false);
        }
    };

    const fetchRatesSettings = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/rates-settings');
            if (response.ok) {
                const data = await response.json();
                setRatesSettings(data);
            }
        } catch (err) {
            // fallback to empty
        }
    };

    useEffect(() => {
        fetchRates();
        fetchRatesSettings();
    }, []);

    useEffect(() => {
        fetch('http://localhost:3001/api/site-settings')
            .then(res => res.json())
            .then(data => {
                setSiteSettings(data);
                localStorage.setItem('siteLogoText', data.logoText || 'SenJitsu');
            })
            .catch(() => {});

        // Listen for logo text changes in localStorage
        const handleStorage = (e) => {
            if (e.key === 'siteLogoText') {
                setSiteSettings(prev => ({ ...prev, logoText: e.newValue || 'SenJitsu' }));
            }
        };
        window.addEventListener('storage', handleStorage);

        // Listen for custom events
        const handleLogoTextUpdated = () => {
            const newLogoText = localStorage.getItem('siteLogoText') || 'SenJitsu';
            setSiteSettings(prev => ({ ...prev, logoText: newLogoText }));
        };
        window.addEventListener('logoTextUpdated', handleLogoTextUpdated);

        const handleRatesUpdated = () => {
            fetchRates();
        };
        window.addEventListener('ratesUpdated', handleRatesUpdated);

        const handleRatesSettingsUpdated = () => {
            fetchRatesSettings();
        };
        window.addEventListener('ratesSettingsUpdated', handleRatesSettingsUpdated);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('logoTextUpdated', handleLogoTextUpdated);
            window.removeEventListener('ratesUpdated', handleRatesUpdated);
            window.removeEventListener('ratesSettingsUpdated', handleRatesSettingsUpdated);
        };
    }, []);

    useEffect(() => {
        const socket = new window.WebSocket('ws://localhost:3001');
        socket.onopen = () => {
            console.log('WebSocket connected!');
        };
        socket.onmessage = (event) => {
            console.log('WebSocket message:', event.data);
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

    const handleMouseEnter = (rate, e) => {
        setHovered(rate);
        setMousePos({ x: e.clientX + 20, y: e.clientY - 20 });
    };
    const handleMouseMove = (e) => {
        setMousePos({ x: e.clientX + 20, y: e.clientY - 20 });
    };
    const handleMouseLeave = () => setHovered(null);

    const parseRatesInfo = (info) => {
        if (!info) return { schedule: '', rates: '' };
        // Try to split by 'Schedule:' and 'Rates:'
        const scheduleMatch = info.match(/Schedule:(.*?)(Rates:|$)/is);
        const ratesMatch = info.match(/Rates:(.*)/is);
        return {
            schedule: scheduleMatch ? scheduleMatch[1].trim() : '',
            rates: ratesMatch ? ratesMatch[1].trim() : '',
        };
    };

    return (
        <>
            {/* <Navbar /> */}
            <section className="hero" style={{
                background: "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/images/cage22.png') center/cover no-repeat"
            }}>
                <h1>{ratesSettings.heading || ''}</h1>
                <p>{ratesSettings.banner || ''}</p>
            </section>
            <div style={{ background: '#fff', width: '100%', minHeight: '100px' }}>
                <main className="rates-main">
                    
                    <section className="rates-section">
                        <Link to="/" className="return-home">&larr; RETURN HOME</Link>
                        <h2>CLASS RATES</h2>
                        <div className="rates-cards">
                            {loading && <div>Loading rates...</div>}
                            {error && <div style={{ color: 'red' }}>{error}</div>}
                            {!loading && !error && rates.length === 0 && <div>No rates found.</div>}
                            {!loading && !error && rates.map((rate, idx) => (
                                <div
                                    className="rate-card"
                                    key={rate._id || idx}
                                    onMouseEnter={e => handleMouseEnter(rate, e)}
                                    onMouseMove={handleMouseMove}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <img
                                        src={rate.image || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'}
                                        alt={rate.name}
                                        style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 6, background: '#f8f8f8' }}
                                    />
                                    <div className="card-title" style={{ fontWeight: 'bold', fontSize: 22, letterSpacing: 2, margin: '10px 0 8px 0', fontFamily: 'Courier New, Courier, monospace', textAlign: 'center' }}>{rate.name}</div>
                                    <div className="card-price" style={{ color: '#fff', background: '#2ecc40', borderRadius: 8, padding: '6px 22px', fontWeight: 'bold', fontSize: 18, marginBottom: 12, letterSpacing: 2, fontFamily: 'Courier New, Courier, monospace' }}>
                                        ₱{rate.price}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <RateHoverModal
                            visible={!!hovered && hovered.ratesInfo}
                            position={mousePos}
                            title={hovered ? hovered.name : ''}
                            schedule={hovered && hovered.ratesInfo ? parseRatesInfo(hovered.ratesInfo).schedule : ''}
                            rates={hovered && hovered.ratesInfo ? parseRatesInfo(hovered.ratesInfo).rates : ''}
                        />
                    </section>
                </main>
            </div>
        </>
    );
};

export default Rates; 