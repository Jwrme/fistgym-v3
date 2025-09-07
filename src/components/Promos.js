import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../designs/promos.css';
import RateHoverModal from './RateHoverModal';

const Promos = () => {
    const [promos, setPromos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [promoSettings, setPromoSettings] = useState({ heading: '', banner: '' });
    const [siteSettings, setSiteSettings] = useState({ logoText: 'SenJitsu' });
    const [hovered, setHovered] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const fetchPromos = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/promos');
            if (!response.ok) throw new Error('Failed to fetch promos');
            const data = await response.json();
            setPromos(data);
        } catch (err) {
            setError('Error fetching promos.');
        } finally {
            setLoading(false);
        }
    };

    const fetchPromoSettings = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/promo-settings');
            if (response.ok) {
                const data = await response.json();
                setPromoSettings(data);
            }
        } catch (err) {
            // fallback to default
        }
    };

    useEffect(() => {
        fetchPromos();
        fetchPromoSettings();
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

        const handlePromosUpdated = () => {
            fetchPromos();
        };
        window.addEventListener('promosUpdated', handlePromosUpdated);

        const handlePromoSettingsUpdated = () => {
            fetchPromoSettings();
        };
        window.addEventListener('promoSettingsUpdated', handlePromoSettingsUpdated);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('logoTextUpdated', handleLogoTextUpdated);
            window.removeEventListener('promosUpdated', handlePromosUpdated);
            window.removeEventListener('promoSettingsUpdated', handlePromoSettingsUpdated);
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

    const handleMouseEnter = (promo, e) => {
        setHovered(promo);
        setMousePos({ x: e.clientX + 20, y: e.clientY - 20 });
    };

    const handleMouseMove = (e) => {
        setMousePos({ x: e.clientX + 20, y: e.clientY - 20 });
    };

    const handleMouseLeave = () => setHovered(null);

    const parsePromoInfo = (info) => {
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
            <section className="hero" style={{
                background: "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/images/cage22.png') center/cover no-repeat"
            }}>
                <h1>{promoSettings.heading || ''}</h1>
                <p>{promoSettings.banner || ''}</p>
            </section>
            <div style={{ background: '#fff', width: '100%', minHeight: '100px' }}>
                <main className="promos-main">
                   
                    <section className="promos-section">
                        <Link to="/" className="return-home">&larr; RETURN HOME</Link>
                        <h2>PROMOS</h2>
                        <div className="promos-cards">
                            {loading && <div>Loading promos...</div>}
                            {error && <div style={{ color: 'red' }}>{error}</div>}
                            {!loading && !error && promos.length === 0 && <div>No promos found.</div>}
                            {!loading && !error && promos.map((promo, idx) => (
                                <div
                                    className="promo-card"
                                    key={promo._id || idx}
                                    onMouseEnter={e => handleMouseEnter(promo, e)}
                                    onMouseMove={handleMouseMove}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <img
                                        src={promo.image || '/images/promo-banner.jpg'}
                                        alt={promo.name}
                                        style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 6, background: '#f8f8f8' }}
                                    />
                                    <div className="card-title" style={{ fontWeight: 'bold', fontSize: 22, letterSpacing: 2, margin: '10px 0 8px 0', fontFamily: 'Courier New, Courier, monospace', textAlign: 'center' }}>{promo.name}</div>
                                    <div className="card-price" style={{ color: '#fff', background: '#2ecc40', borderRadius: 8, padding: '6px 22px', fontWeight: 'bold', fontSize: 18, marginBottom: 12, letterSpacing: 2, fontFamily: 'Courier New, Courier, monospace' }}>
                                        {promo.price && !isNaN(promo.price) ? `₱${promo.price}` : promo.price || ''}
                                    </div>
                                    {promo.discount && (
                                        <div className="card-discount" style={{ color: '#fff', background: '#e74c3c', borderRadius: 8, padding: '6px 22px', fontWeight: 'bold', fontSize: 16, marginBottom: 8, letterSpacing: 2, fontFamily: 'Courier New, Courier, monospace' }}>
                                            {promo.discount}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <RateHoverModal
                                visible={!!hovered && hovered.promoInfo}
                                position={mousePos}
                                title={hovered ? hovered.name : ''}
                                schedule={hovered && hovered.promoInfo ? parsePromoInfo(hovered.promoInfo).schedule : ''}
                                rates={hovered && hovered.promoInfo ? parsePromoInfo(hovered.promoInfo).rates : ''}
                            />
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
};

export default Promos; 