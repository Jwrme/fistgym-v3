import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../designs/classes.css';

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

const Classes = () => {
    const query = useQuery();
    const classKey = query.get('class');
    const [classData, setClassData] = useState(null);
    const [allClasses, setAllClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchClasses = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/classes');
            const data = await res.json();
            setAllClasses(data);
            if (classKey) {
                const found = data.find(cls => (cls._id === classKey || cls.name.toLowerCase().replace(/\s/g, '') === classKey));
                setClassData(found || data[0]);
            } else {
                setClassData(data[0]);
            }
            setLoading(false);
        } catch (err) {
            setError('Failed to load classes.');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, [classKey]);

    useEffect(() => {
        // Listen for classes updates
        const handleClassesUpdated = () => {
            fetchClasses();
        };
        window.addEventListener('classesUpdated', handleClassesUpdated);

        return () => {
            window.removeEventListener('classesUpdated', handleClassesUpdated);
        };
    }, [classKey]);

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

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;
    if (!classData) return <div>No class found.</div>;

    return (
        <>
            <section className="hero" style={{
                background: "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/images/cage22.png') center/cover no-repeat"
            }}>
                <h1>CLASSES</h1>
                <p>Explore our martial arts classes and find your path to greatness!</p>
            </section>

            <div style={{ background: '#fff', color: '#181818', borderRadius: 0, paddingBottom: 40 }}>
                <main className="bjj-main">
                    <section className="intro">
                        <Link to="/" className="return-home">&larr; RETURN HOME</Link>
                        <h2>INTRO VIDEO</h2>
                        {classData.video ? (
                            // 🔥 Smart video display - supports both direct videos and Facebook embeds
                            classData.video.includes('facebook.com') || classData.video.includes('fb.watch') ? (
                                <iframe 
                                    className="intro-img" 
                                    src={classData.video}
                                    width="100%" 
                                    height="300"
                                    style={{ border: 0, borderRadius: 8 }}
                                    frameBorder="0" 
                                    allowFullScreen={true}
                                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                />
                            ) : classData.video.includes('youtube.com') || classData.video.includes('youtu.be') ? (
                                <iframe 
                                    className="intro-img" 
                                    src={classData.video.replace('watch?v=', 'embed/')}
                                    width="100%" 
                                    height="300"
                                    style={{ border: 0, borderRadius: 8 }}
                                    frameBorder="0" 
                                    allowFullScreen={true}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                />
                            ) : (
                                // Direct video files (MP4, WebM, etc.)
                                <video 
                                    className="intro-img" 
                                    src={classData.video} 
                                    controls 
                                    autoPlay 
                                    loop 
                                    muted 
                                    poster="/images/cage22.png" 
                                />
                            )
                        ) : (
                            <div style={{height: 300, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>No video available</div>
                        )}
                    </section>
                    <section className="details">
                        <h2>CLASS DETAILS</h2>
                        <div className="details-text">
                            {classData.description ? (
                                <p>{classData.description}</p>
                            ) : (
                                <p>No details available.</p>
                            )}
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
};

export default Classes; 