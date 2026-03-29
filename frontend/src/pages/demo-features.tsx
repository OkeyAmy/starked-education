import React from 'react';
import AssessmentInterface from '../components/AssessmentInterface';
import CredentialMarketplace from '../components/CredentialMarketplace';
import StakingDashboard from '../components/StakingDashboard';
import CredentialBridge from '../components/CredentialBridge';

const FeaturesDemoPage = () => {
  return (
    <div style={{ background: '#0a0a0c', minHeight: '100vh', padding: '4rem 2rem', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '1rem', background: 'linear-gradient(135deg, #00d4ff, #ff00c8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            STARKED ENTERPRISE FEATURES
          </h1>
          <p style={{ color: '#909090', fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto' }}>
            Advanced decentralized education infrastructure: Proctoring, Marketplaces, Tokenomics, and Cross-Chain Portability.
          </p>
        </header>

        <section style={{ marginBottom: '6rem' }}>
           <h2 style={{ borderLeft: '4px solid #00d4ff', paddingLeft: '1rem', marginBottom: '2rem' }}>1. Proctoring System</h2>
           <AssessmentInterface assessmentId="BLOCKCHAIN-101-FINAL" onComplete={(res) => console.log(res)} />
        </section>

        <section style={{ marginBottom: '6rem' }}>
           <h2 style={{ borderLeft: '4px solid #ff00c8', paddingLeft: '1rem', marginBottom: '2rem' }}>2. Micro-Credential Marketplace</h2>
           <CredentialMarketplace />
        </section>

        <section style={{ marginBottom: '6rem' }}>
           <h2 style={{ borderLeft: '4px solid #00ff88', paddingLeft: '1rem', marginBottom: '2rem' }}>3. Learning Tokenomics & Staking</h2>
           <StakingDashboard />
        </section>

        <section style={{ marginBottom: '6rem' }}>
           <h2 style={{ borderLeft: '4px solid #ffcc00', paddingLeft: '1rem', marginBottom: '2rem' }}>4. Cross-Chain Portability</h2>
           <CredentialBridge />
        </section>

        <footer style={{ textAlign: 'center', padding: '4rem 0', borderTop: '1px solid #1e1e24', color: '#606060' }}>
           <p>© 2026 StarkEd - Multi-Chain Education Protocol. Built on Stellar & Soroban.</p>
        </footer>
      </div>
    </div>
  );
};

export default FeaturesDemoPage;
