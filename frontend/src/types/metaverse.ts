export type AvatarStyle = 'explorer' | 'scholar' | 'creator' | 'mentor';
export type AvatarColor = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'teal';

export interface AvatarConfig {
  style: AvatarStyle;
  color: AvatarColor;
  name: string;
}

export type BuildingType = 'lecture_hall' | 'library' | 'lab' | 'social_hub' | 'admin';

export interface CampusBuilding {
  id: string;
  type: BuildingType;
  label: string;
  position: [number, number, number];
  color: string;
  capacity: number;
  occupants: number;
  isOpen: boolean;
}

export interface CampusUser {
  id: string;
  avatar: AvatarConfig;
  position: [number, number, number];
  currentBuilding: string | null;
  isSpeaking: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
}

export interface MetaverseState {
  localUser: CampusUser | null;
  users: CampusUser[];
  buildings: CampusBuilding[];
  activeBuilding: string | null;
  totalOnline: number;
}
