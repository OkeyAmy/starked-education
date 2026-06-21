import dynamic from 'next/dynamic';

export const WebXREngine = dynamic(() => import('./WebXREngine').then(m => m.WebXREngine), { ssr: false });
export const ModelViewer = dynamic(() => import('./ModelViewer').then(m => m.ModelViewer), { ssr: false });
export const VirtualClassroom = dynamic(() => import('./VirtualClassroom').then(m => m.VirtualClassroom), { ssr: false });
export const InteractiveSimulation = dynamic(() => import('./InteractiveSimulation').then(m => m.InteractiveSimulation), { ssr: false });
export const GestureControls = dynamic(() => import('./GestureControls').then(m => m.GestureControls), { ssr: false });
export const PerformanceOptimizer = dynamic(() => import('./PerformanceOptimizer').then(m => m.PerformanceOptimizer), { ssr: false });

// Types - only export what is actually exported from source modules
export type { XRMode, XRSessionState } from './WebXREngine';
export type { ModelFormat, RenderMode, InteractionMode, LoadingState } from './ModelViewer';
export type { ClassroomLayout, AvatarState, UserRole } from './VirtualClassroom';
export type { SimulationType, ExperimentState } from './InteractiveSimulation';
export type { GestureType, HandSide, TrackingMode, ConfidenceLevel } from './GestureControls';
export type { PerformanceMode, OptimizationStrategy, DeviceType } from './PerformanceOptimizer';
