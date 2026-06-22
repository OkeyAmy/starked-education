import dynamic from 'next/dynamic';

export const MetaverseCampus = dynamic(() => import('./MetaverseCampus').then(m => m.MetaverseCampus), { ssr: false });
export const AvatarCustomizer = dynamic(() => import('./AvatarCustomizer').then(m => m.AvatarCustomizer), { ssr: false });
export const BuildingInterior = dynamic(() => import('./BuildingInterior').then(m => m.BuildingInterior), { ssr: false });
export const CampusHUD = dynamic(() => import('./CampusHUD').then(m => m.CampusHUD), { ssr: false });
export const CampusScene = dynamic(() => import('./CampusScene').then(m => m.CampusScene), { ssr: false });
