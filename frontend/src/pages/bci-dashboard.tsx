import React from 'react';
import { BCIDashboard } from '../components/BCI/BCIDashboard';

const BCIDashboardPage: React.FC = () => {
  return (
    <main id="main-content" className="min-h-screen bg-gray-50">
      <BCIDashboard />
    </main>
  );
};

export default BCIDashboardPage;
