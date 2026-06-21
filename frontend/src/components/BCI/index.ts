import dynamic from 'next/dynamic';

export const BCIDashboard = dynamic(() => import('./BCIDashboard').then(m => m.BCIDashboard), { ssr: false });
