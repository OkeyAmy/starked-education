// Core AR/VR Components
export { WebXREngine } from './WebXREngine';
export { ModelViewer } from './ModelViewer';
export { VirtualClassroom } from './VirtualClassroom';
export { InteractiveSimulation } from './InteractiveSimulation';
export { GestureControls } from './GestureControls';
export { PerformanceOptimizer } from './PerformanceOptimizer';

// Types
export type { 
  XRMode, 
  XRSessionState, 
  XRDevice, 
  XRController, 
  XRHand, 
  XRSession,
  XRSettings
} from './WebXREngine';

export type {
  ModelFormat,
  RenderMode,
  InteractionMode,
  LoadingState,
  ModelInfo,
  ModelViewerSettings,
  PerformanceStats
} from './ModelViewer';

export type {
  ClassroomLayout,
  AvatarState,
  UserRole,
  UserAvatar,
  ClassroomEnvironment,
  ClassroomSession,
  VirtualClassroomProps
} from './VirtualClassroom';

export type {
  SimulationType,
  ExperimentState,
  InteractionMode as SimInteractionMode,
  SimulationParameter,
  SimulationObject,
  SimulationResult,
  SimulationExperiment,
  InteractiveSimulationProps
} from './InteractiveSimulation';

export type {
  GestureType,
  HandSide,
  TrackingMode,
  ConfidenceLevel,
  HandGesture,
  GesturePattern,
  TrackingSettings,
  GestureControlsProps
} from './GestureControls';

export type {
  PerformanceMode,
  OptimizationStrategy,
  DeviceType,
  PerformanceMetrics,
  LODSettings,
  RenderSettings,
  OptimizationSettings,
  PerformanceOptimizerProps
} from './PerformanceOptimizer';
