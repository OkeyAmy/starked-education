import React, { useState } from 'react';
import '../styles/features.css';

const CredentialBridge = () => {
  const [sourceChain, setSourceChain] = useState('Stellar (Soroban)');
  const [targetChain, setTargetChain] = useState('Polygon (EVM)');
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, locking, relaying, finalized

  const credentials = [
     { id: '1', title: 'Smart Contract Expert', hash: 'e3b0...c442', chain: 'Stellar' },
     { id: '2', title: 'Data Scientist Cert', hash: 'f5d8...e911', chain: 'Polygon' }
  ];

  const chains = ['Stellar (Soroban)', 'Polygon (EVM)', 'Ethereum Mainnet', 'Solana', 'Avalanche'];

  return (
    <div className="feature-container" style={{ maxWidth: '900px', margin: '2rem auto' }}>
      <h1 style={{ textAlign: 'center' }}>CROSS-CHAIN CREDENTIAL BRIDGE</h1>
      <p className="text-dim" style={{ textAlign: 'center', marginBottom: '2rem' }}>Seamlessly port and verify your education credentials across multiple blockchain ecosystems.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
         <div className="glass-card" style={{ textAlign: 'center' }}>
            <p className="text-dim" style={{ fontSize: '0.7rem' }}>SOURCE NETWORK</p>
            <h4 style={{ margin: '0.5rem 0' }}>{sourceChain}</h4>
            <div style={{ padding: '0.4rem', background: '#333', borderRadius: '5px', fontSize: '0.7rem' }}>GC2R...M83S</div>
         </div>
         <div style={{ fontSize: '2rem', textAlign: 'center', color: var('--primary-accent') }}>➔</div>
         <div className="glass-card" style={{ textAlign: 'center' }}>
            <p className="text-dim" style={{ fontSize: '0.7rem' }}>TARGET NETWORK</p>
            <h4 style={{ margin: '0.5rem 0' }}>{targetChain}</h4>
            <div style={{ padding: '0.4rem', background: '#333', borderRadius: '5px', fontSize: '0.7rem' }}>0x71...5C4B</div>
         </div>
      </div>

      <div className="glass-card">
         <h3>Select Portability-Enabled Credential</h3>
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {credentials.map(c => (
               <div key={c.id} className="glass-card" style={{ padding: '0.75rem', border: selectedCredential?.id === c.id ? '1px solid var(--primary-accent)' : 'none', cursor: 'pointer' }} onClick={() => setSelectedCredential(c)}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎫</div>
                  <h5 style={{ margin: 0 }}>{c.title}</h5>
                  <p className="text-dim" style={{ fontSize: '0.6rem' }}>HASH: {c.hash}</p>
               </div>
            ))}
         </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="text-dim">Relayer Fee (LayerZero)</span>
            <span style={{ fontWeight: 800 }}>{sourceChain.includes('Ethereum') ? '0.02 ETH' : '4.50 XLM'}</span>
         </div>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="text-dim">Estimated Transfer Time</span>
            <span>~ 2 minutes</span>
         </div>

         {status === 'idle' ? (
             <button className="btn-premium" style={{ width: '100%', padding: '1.25rem' }} disabled={!selectedCredential} onClick={() => setStatus('locking')}>
                {selectedCredential ? `Port "${selectedCredential.title}" to ${targetChain}` : 'Select a Credential'}
             </button>
         ) : (
             <div className="glass-card" style={{ background: 'rgba(0, 212, 255, 0.05)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem', animation: status !== 'finalized' ? 'spin 2s linear infinite' : 'none' }}>
                   {status === 'finalized' ? '✅' : '⚙️'}
                </div>
                <h4>{status === 'locking' ? 'Locking on Source...' : status === 'relaying' ? 'Relaying Cross-Chain...' : 'Transfer Finalized!'}</h4>
                <div className="stat-bar" style={{ width: '60%', margin: '1rem auto' }}>
                   <div className="stat-fill" style={{ width: status === 'locking' ? '30%' : status === 'relaying' ? '70%' : '100%' }}></div>
                </div>
                <p className="text-dim" style={{ fontSize: '0.8rem' }}>TX HASH: GC04...A12B</p>
                {status === 'locking' && <button onClick={() => setStatus('relaying')} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>Next Step (Simulator)</button>}
                {status === 'relaying' && <button onClick={() => setStatus('finalized')} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>Finalize (Simulator)</button>}
             </div>
         )}
      </div>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default CredentialBridge;
