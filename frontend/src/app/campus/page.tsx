import type { Metadata } from 'next';
import { MetaverseCampus } from '../../components/Metaverse';

export const metadata: Metadata = {
  title: 'Metaverse Campus — StarkEd',
  description: 'Immersive virtual learning campus with classrooms, social spaces, and avatar interaction.',
};

export default function CampusPage() {
  return <MetaverseCampus />;
}
