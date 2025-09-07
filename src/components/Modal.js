import React from 'react';

const Modal = ({ open, children, onClose }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.35)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#181818', cursor: 'pointer'
          }}
          aria-label="Close"
        >&times;</button>
        {children}
      </div>
    </div>
  );
};

export default Modal; 