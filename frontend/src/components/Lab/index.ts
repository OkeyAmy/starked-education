import dynamic from 'next/dynamic';

export const VirtualScienceLab = dynamic(() => import('./VirtualScienceLab').then(m => m.VirtualScienceLab), { ssr: false });
