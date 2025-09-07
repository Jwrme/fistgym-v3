import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../designs/coaches.css';

// Helper to render belt colors
function renderBelt(belt) {
    if (!belt) return '';
    const b = belt.toLowerCase();
    if (b === 'black') {
        return (
            <span className="belt">
                <span className="black" style={{ width: 22, height: 12, display: 'inline-block', borderRadius: 2 }}></span>
                <span className="red" style={{ width: 22, height: 12, display: 'inline-block', borderRadius: 2 }}></span>
                <span className="black" style={{ width: 22, height: 12, display: 'inline-block', borderRadius: 2 }}></span>
            </span>
        );
    }
    if (b === 'blue') {
        return (
            <span className="belt">
                <span style={{ width: 66, height: 12, background: '#3498db', display: 'inline-block', borderRadius: 2 }}></span>
            </span>
        );
    }
    if (b === 'purple') {
        return (
            <span className="belt">
                <span style={{ width: 66, height: 12, background: '#8e44ad', display: 'inline-block', borderRadius: 2 }}></span>
            </span>
        );
    }
    if (b === 'brown') {
        return (
            <span className="belt">
                <span style={{ width: 66, height: 12, background: '#a0522d', display: 'inline-block', borderRadius: 2 }}></span>
            </span>
        );
    }
    // Default: just show text
    return <span>{belt}</span>;
}

const CoachProfile = () => {
    const [coach, setCoach] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const location = useLocation();

    const fetchCoach = async () => {
        const query = new URLSearchParams(location.search);
        const coachKey = query.get('coach');
        if (!coachKey) {
            setError('No coach specified.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`http://localhost:3001/api/coaches?username=${coachKey}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setCoach(data[0] || null);
            } else if (data && data.username) {
                setCoach(data);
            } else {
                setCoach(null);
            }
        } catch (err) {
            setError('Failed to load coach data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoach();
    }, [location]);

    useEffect(() => {
        // Listen for coaches updates
        const handleCoachesUpdated = () => {
            fetchCoach();
        };
        window.addEventListener('coachesUpdated', handleCoachesUpdated);

        return () => {
            window.removeEventListener('coachesUpdated', handleCoachesUpdated);
        };
    }, [location]);

    if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
    if (error) return <div style={{ padding: 40, color: 'red' }}>{error}</div>;
    if (!coach) return <div style={{ padding: 40, color: 'red' }}>Coach not found.</div>;

    return (
        <>
            <section className="hero" style={{
                background: "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/images/cage22.png') center/cover no-repeat",
                height: 220, padding: 0, margin: 0, position: 'relative'
            }}>
                <div style={{ position: 'absolute', left: 650, bottom: 10, zIndex: 2, textAlign: 'left' }}>
                    <h1 style={{ fontSize: '2.7rem', fontWeight: 'bold', margin: 0, letterSpacing: 2, lineHeight: 1.2, color: '#fff' }}>{coach.firstname?.toUpperCase()} {coach.lastname?.toUpperCase()}</h1>
                    <div className="subtitle" style={{ fontSize: '1.15rem', marginTop: 10, display: 'flex', alignItems: 'center', gap: 18, color: '#fff' }}>
                        {coach.title || ''}
                        <span style={{ display: 'flex', gap: 10 }}>
                            {coach.socials && coach.socials.map((s, i) => (
                                <a key={i} href={s.url} style={{ color: '#fff' }}><i className={`fa fa-${s.icon}`}></i></a>
                            ))}
                        </span>
                    </div>
                </div>
                <div className="coach-photo" style={{ position: 'absolute', left: 450, bottom: -50, zIndex: 3 }}>
                    <img src={coach.profilePic || '/images/placeholder.jpg'} alt={coach.firstname + ' ' + coach.lastname} style={{ width: 140, height: 140, borderRadius: '50%', border: '6px solid #fff', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', objectFit: 'cover', background: '#fff' }} />
                </div>
            </section>
            <div style={{ background: '#fff', color: '#181818', borderRadius: 0, paddingBottom: 40, marginTop: -45 }}>
                <main className="coach-main" style={{ paddingTop: 80 }}>
                    <section className="coach-details">
                        <Link to="/" className="return-home">&larr; RETURN HOME</Link>
                        <table className="bio-table">
                            <tbody>
                                <tr><td>TITLE:</td><td>{coach.title || ''}</td></tr>
                                <tr><td>DISCIPLINES:</td><td>{coach.specialties?.join(', ') || ''}</td></tr>
                                <tr><td>BELT:</td><td>{renderBelt(coach.belt)}</td></tr>
                                <tr><td>PRO RECORD:</td><td>{coach.proRecord || ''}</td></tr>
                                <tr><td>CLASSES:</td><td>{coach.specialties?.join(', ') || ''}</td></tr>
                            </tbody>
                        </table>
                    </section>
                    <section className="coach-bio">
                        <h2>BIO</h2>
                        {(coach.biography || '').split('\n').map((line, idx) =>
                            line.trim() ? <p key={idx}>{line}</p> : null
                        )}
                    </section>
                </main>
            </div>
        </>
    );
};

export default CoachProfile; 