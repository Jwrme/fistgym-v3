import React, { useEffect, useRef } from 'react';
import fistGymLogo from './designs/fistgym_logo.png';

const transitionDuration = 700; // ms

export default function PageTransition({ active, onComplete }) {
  const overlayRef = useRef();

  useEffect(() => {
    if (active && overlayRef.current) {
      overlayRef.current.style.transform = 'translateX(0)';
      const timeout = setTimeout(() => {
        if (onComplete) onComplete();
      }, transitionDuration);
      return () => clearTimeout(timeout);
    } else if (overlayRef.current) {
      overlayRef.current.style.transform = 'translateX(100vw)';
    }
  }, [active, onComplete]);

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(90deg, #2ecc40 80%, #27ae60 100%)',
        zIndex: 9999,
        pointerEvents: 'none',
        transform: 'translateX(100vw)',
        transition: `transform ${transitionDuration}ms cubic-bezier(.77,0,.18,1)`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <img 
        src={fistGymLogo} 
        alt="Fist Gym Logo" 
        style={{
          width: '300px',
          height: 'auto',
          opacity: 0.9,
        }}
      />
    </div>
  );
} 