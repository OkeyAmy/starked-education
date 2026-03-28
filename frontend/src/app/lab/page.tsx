import type { Metadata } from 'next';
import { VirtualScienceLab } from '../../components/Lab/VirtualScienceLab';

export const metadata: Metadata = {
  title: 'Virtual Science Laboratory — StarkEd',
  description: 'Interactive virtual lab for experiments with 3D equipment, guided steps, safety warnings, and collaboration.'
};

export default function LabPage() {
  return <VirtualScienceLab />;
}
