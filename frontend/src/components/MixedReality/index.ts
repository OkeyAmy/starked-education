// Core Mixed Reality Components
export { HolographicRenderer } from './HolographicRenderer';
export { GestureRecognition } from './GestureRecognition';
export { MultiUserCollaboration } from './MultiUserCollaboration';
export { PhysicsEngine } from './PhysicsEngine';
export { SpatialAudioEngine } from './SpatialAudioEngine';

// Types
export type { 
  HolographicContentType, 
  RenderMode, 
  InteractionMode 
} from './HolographicRenderer';

export type { 
  GestureType, 
  HandSide, 
  ConfidenceLevel 
} from './GestureRecognition';

export type { 
  UserRole, 
  CollaborationMode, 
  ConnectionState 
} from './MultiUserCollaboration';

export type { 
  PhysicsEngineType, 
  ForceType, 
  CollisionType 
} from './PhysicsEngine';

export type { 
  AudioCodec, 
  SpatialModel, 
  AudioEffect 
} from './SpatialAudioEngine';
