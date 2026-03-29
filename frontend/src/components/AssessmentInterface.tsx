import React, { useState, useEffect, useRef } from 'react';
import '../styles/features.css';

const AssessmentInterface = ({ assessmentId, onComplete }) => {
  const [isFlagged, setIsFlagged] = useState(false);
  const [anomalies, setAnomalies] = useState([]);
  const [sessionStatus, setSessionStatus] = useState('initializing');
  const videoRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour

  useEffect(() => {
    // 1. Lockdown Mode Mockup: detect tab switching/blur
    const handleBlur = () => {
      setAnomalies(prev => [...prev, { time: new Date().toLocaleTimeString(), type: 'Tab Exit Detected' }]);
      setIsFlagged(true);
    };

    window.addEventListener('blur', handleBlur);
    
    // 2. Mock Webcam Access
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
        .catch(err => console.error("Webcam blocked", err));
    }

    setSessionStatus('proctoring_active');

    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="feature-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, textShadow: '0 0 20px rgba(0,212,255,0.4)' }}>
          DECERNTRALIZED ASSESSMENT PROCTORING
        </h1>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: var('--primary-accent') }}>
          {formatTime(timeLeft)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <h3>Assessment Area: {assessmentId}</h3>
          <div className={`video-overlay ${isFlagged ? 'suspicious' : 'active'}`} style={{ width: '100%', aspectRatio: '16/9', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%' }} />
            <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', padding: '5px 10px', borderRadius: '5px' }}>
              <span style={{ color: isFlagged ? '#ff4444' : '#00ff88' }}>● RE-LIVE STREAMING</span>
            </div>
            {isFlagged && (
                 <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(255, 68, 68, 0.9)', color: 'white', padding: '10px 20px', borderRadius: '10px' }}>
                     ANOMALY DETECTED: PLEASE STAY ON THE TEST PAGE!
                 </div>
            )}
          </div>
          <p className="text-dim" style={{ marginTop: '1rem' }}>Locked Environment - Behavioral Analysis Active</p>
          <button className="btn-premium" onClick={() => onComplete('completed')}>Submit Exam</button>
        </div>

        <div className="glass-card" style={{ height: 'fit-content' }}>
          <h3>Identity & Audit Trail</h3>
          <div style={{ background: '#000', borderRadius: '10px', padding: '1rem', border: '1px solid #333', marginBottom: '1rem' }}>
             <p style={{ margin: 0, fontSize: '0.8rem', color: '#00ff88' }}>Verified Stellar Key: GC2R...M83S</p>
             <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>Biometric Hash: e3b0c442...</p>
          </div>
          
          <h4>Real-time Flags</h4>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {anomalies.length === 0 ? <p className="text-dim">No anomalies detected.</p> : (
              anomalies.map((a, i) => (
                <div key={i} style={{ padding: '0.5rem', borderBottom: '1px solid #222', color: '#ff4444' }}>
                   [{a.time}] {a.type}
                </div>
              ))
            )}
          </div>
          
          <div style={{ marginTop: '2rem' }}>
             <h4>Behvioral Metrics</h4>
             <div className="stat-bar"><div className="stat-fill" style={{ width: '92%' }}></div></div>
             <p className="text-dim" style={{ fontSize: '0.7rem' }}>Concentration: 92%</p>
             <div className="stat-bar"><div className="stat-fill" style={{ width: '12%', background: '#ff4444' }}></div></div>
             <p className="text-dim" style={{ fontSize: '0.7rem' }}>Suspicion Level: 12%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentInterface;
