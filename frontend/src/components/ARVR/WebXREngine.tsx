'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Glasses, Camera, Monitor, Settings, Play, Pause, RotateCw, Eye, Hand, Users, Globe } from 'lucide-react';

export type XRMode = 'vr' | 'ar' | 'none';
export type XRSessionState = 'idle' | 'starting' | 'active' | 'ending' | 'error';
export type HandTrackingMode = 'none' | 'basic' | 'full';

interface XRDevice {
  id: string;
  name: string;
  type: 'vr' | 'ar';
  capabilities: {
    handTracking: boolean;
    spatialTracking: boolean;
    eyeTracking: boolean;
    controllers: boolean;
    passthrough: boolean;
  };
  supported: boolean;
}

interface XRSessionInfo {
  id: string;
  mode: XRMode;
  state: XRSessionState;
  device: XRDevice;
  startTime: number;
  frameRate: number;
  latency: number;
  trackingQuality: 'high' | 'medium' | 'low';
  batteryLevel?: number;
}

interface XRController {
  id: string;
  hand: 'left' | 'right';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  buttons: boolean[];
  axes: number[];
  tracking: boolean;
  visible: boolean;
}

interface XRHand {
  id: string;
  hand: 'left' | 'right';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  joints: {
    wrist: { x: number; y: number; z: number };
    thumb: { x: number; y: number; z: number };
    index: { x: number; y: number; z: number };
    middle: { x: number; y: number; z: number };
    ring: { x: number; y: number; z: number };
    pinky: { x: number; y: number; z: number };
  };
  tracking: boolean;
  gesture: string;
  confidence: number;
}

interface XRSettings {
  targetFrameRate: 30 | 60 | 72 | 90 | 120;
  enableHandTracking: boolean;
  enableEyeTracking: boolean;
  enableSpatialAudio: boolean;
  enablePassthrough: boolean;
  antiAliasing: boolean;
  shadows: boolean;
  lodOptimization: boolean;
  performanceMode: 'quality' | 'balanced' | 'performance';
}

interface WebXREngineProps {
  onSessionStart?: (session: XRSessionInfo) => void;
  onSessionEnd?: (session: XRSessionInfo) => void;
  onControllerConnected?: (controller: XRController) => void;
  onHandDetected?: (hand: XRHand) => void;
  onDeviceConnected?: (device: XRDevice) => void;
  enableVR?: boolean;
  enableAR?: boolean;
  handTrackingMode?: HandTrackingMode;
  settings?: XRSettings;
  showDebugInfo?: boolean;
}

const DEFAULT_SETTINGS: XRSettings = {
  targetFrameRate: 60,
  enableHandTracking: true,
  enableEyeTracking: false,
  enableSpatialAudio: true,
  enablePassthrough: false,
  antiAliasing: true,
  shadows: true,
  lodOptimization: true,
  performanceMode: 'balanced'
};

export function WebXREngine({
  onSessionStart,
  onSessionEnd,
  onControllerConnected,
  onHandDetected,
  onDeviceConnected,
  enableVR = true,
  enableAR = true,
  handTrackingMode = 'basic',
  settings = DEFAULT_SETTINGS,
  showDebugInfo = true
}: WebXREngineProps) {
  const [xrSupported, setXrSupported] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<XRDevice[]>([]);
  const [currentSession, setCurrentSession] = useState<XRSessionInfo | null>(null);
  const [controllers, setControllers] = useState<XRController[]>([]);
  const [hands, setHands] = useState<XRHand[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [performanceStats, setPerformanceStats] = useState({
    frameRate: 0,
    latency: 0,
    drawCalls: 0,
    triangles: 0,
    memoryUsage: 0,
    trackingQuality: 'high' as const
  });

  // Simulator state
  const [rotation, setRotation] = useState({ x: 15, y: -45 });
  const [currentGesture, setCurrentGesture] = useState<string>('open');
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [showMobileDiagnostics, setShowMobileDiagnostics] = useState(false);

  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;
    setRotation(prev => ({
      x: prev.x - deltaY * 0.5,
      y: prev.y + deltaX * 0.5
    }));
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // Auto rotation effect
  useEffect(() => {
    if (!isAutoRotating) return;
    let frameId: number;
    const rotate = () => {
      if (!isDragging.current) {
        setRotation(prev => ({ ...prev, y: (prev.y + 0.2) % 360 }));
      }
      frameId = requestAnimationFrame(rotate);
    };
    frameId = requestAnimationFrame(rotate);
    return () => cancelAnimationFrame(frameId);
  }, [isAutoRotating]);

  // Simulator mock update loop
  useEffect(() => {
    if (typeof window === 'undefined' || !currentSession || currentSession.state !== 'active') {
      return;
    }
    // Only run if navigator.xr is not present/active (simulated mode)
    if (typeof navigator !== 'undefined' && navigator.xr && currentSession.id && !currentSession.id.startsWith('xr-mock-')) {
      return;
    }

    let frameId: number;
    const loop = (time: DOMHighResTimeStamp) => {
      setPerformanceStats({
        frameRate: Math.round(58 + Math.sin(time * 0.005) * 3),
        latency: Math.round(11 + Math.cos(time * 0.003) * 2),
        drawCalls: 142,
        triangles: 38400,
        memoryUsage: Math.round(41.2 + Math.sin(time * 0.001) * 1.5),
        trackingQuality: 'high'
      });

      if (currentSession.device.capabilities.controllers) {
        setControllers([
          {
            id: 'mock-left',
            hand: 'left',
            position: {
              x: -0.25 + Math.sin(time * 0.002) * 0.05,
              y: 1.05 + Math.cos(time * 0.003) * 0.05,
              z: -0.4 + Math.sin(time * 0.001) * 0.05
            },
            rotation: {
              x: Math.sin(time * 0.001) * 10,
              y: Math.cos(time * 0.002) * 10,
              z: 0
            },
            buttons: [false, false, false],
            axes: [0, 0],
            tracking: true,
            visible: true
          },
          {
            id: 'mock-right',
            hand: 'right',
            position: {
              x: 0.25 + Math.cos(time * 0.002) * 0.05,
              y: 1.05 + Math.sin(time * 0.003) * 0.05,
              z: -0.4 + Math.cos(time * 0.001) * 0.05
            },
            rotation: {
              x: Math.cos(time * 0.001) * 10,
              y: Math.sin(time * 0.002) * 10,
              z: 0
            },
            buttons: [false, false, false],
            axes: [0, 0],
            tracking: true,
            visible: true
          }
        ]);
      } else {
        setControllers([]);
      }

      if (currentSession.device.capabilities.handTracking) {
        setHands([
          {
            id: 'mock-hand-left',
            hand: 'left',
            position: { x: -0.2, y: 0.95, z: -0.3 },
            rotation: { x: 0, y: 0, z: 0 },
            joints: {
              wrist: { x: -0.2, y: 0.95, z: -0.3 },
              thumb: { x: -0.21, y: 0.96, z: -0.29 },
              index: { x: -0.2, y: 0.99, z: -0.28 },
              middle: { x: -0.19, y: 1.0, z: -0.28 },
              ring: { x: -0.18, y: 0.99, z: -0.29 },
              pinky: { x: -0.17, y: 0.98, z: -0.3 }
            },
            tracking: true,
            gesture: currentGesture,
            confidence: 0.96
          }
        ]);
      } else {
        setHands([]);
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [currentSession, currentGesture]);

  const xrSessionRef = useRef<any>(null);
  const xrFrameRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize WebXR
  useEffect(() => {
    initializeWebXR();
    return () => {
      cleanupWebXR();
    };
  }, []);

  // Initialize WebXR
  const initializeWebXR = async () => {
    try {
      // Check WebXR support
      if (typeof window !== 'undefined' && !navigator.xr) {
        console.warn('WebXR not supported. Fallback to 3D Screen Simulator Mode.');
        const mockDevices: XRDevice[] = [
          {
            id: 'sim-vr-headset',
            name: 'Simulator VR Headset',
            type: 'vr',
            capabilities: {
              handTracking: true,
              spatialTracking: true,
              eyeTracking: true,
              controllers: true,
              passthrough: true
            },
            supported: true
          },
          {
            id: 'sim-ar-glasses',
            name: 'Simulator AR Glasses',
            type: 'ar',
            capabilities: {
              handTracking: true,
              spatialTracking: true,
              eyeTracking: false,
              controllers: false,
              passthrough: true
            },
            supported: true
          }
        ];
        setAvailableDevices(mockDevices);
        setXrSupported(true); // Treat simulator as "supported" to show the full dashboard!
        setIsInitialized(true);
        return;
      }

      setXrSupported(true);

      // Check for VR support
      let vrSupported = false;
      if (enableVR) {
        vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
      }

      // Check for AR support
      let arSupported = false;
      if (enableAR) {
        arSupported = await navigator.xr.isSessionSupported('immersive-ar');
      }

      // Discover available devices
      const devices = await discoverXRDevices(vrSupported, arSupported);
      setAvailableDevices(devices);

      // Notify about connected devices
      devices.forEach(device => {
        if (device.supported) {
          onDeviceConnected?.(device);
        }
      });

      setIsInitialized(true);
      console.log('WebXR initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebXR:', error);
    }
  };

  // Discover XR devices
  const discoverXRDevices = async (vrSupported: boolean, arSupported: boolean): Promise<XRDevice[]> => {
    const devices: XRDevice[] = [];

    // Simulate device discovery (in production, would use actual device APIs)
    if (vrSupported) {
      devices.push({
        id: 'meta-quest-2',
        name: 'Meta Quest 2',
        type: 'vr',
        capabilities: {
          handTracking: true,
          spatialTracking: true,
          eyeTracking: false,
          controllers: true,
          passthrough: false
        },
        supported: true
      });

      devices.push({
        id: 'meta-quest-3',
        name: 'Meta Quest 3',
        type: 'vr',
        capabilities: {
          handTracking: true,
          spatialTracking: true,
          eyeTracking: true,
          controllers: true,
          passthrough: true
        },
        supported: true
      });

      devices.push({
        id: 'valve-index',
        name: 'Valve Index',
        type: 'vr',
        capabilities: {
          handTracking: false,
          spatialTracking: true,
          eyeTracking: false,
          controllers: true,
          passthrough: false
        },
        supported: true
      });
    }

    if (arSupported) {
      devices.push({
        id: 'ios-ar',
        name: 'iOS AR (ARKit)',
        type: 'ar',
        capabilities: {
          handTracking: true,
          spatialTracking: true,
          eyeTracking: true,
          controllers: false,
          passthrough: true
        },
        supported: true
      });

      devices.push({
        id: 'android-ar',
        name: 'Android AR (ARCore)',
        type: 'ar',
        capabilities: {
          handTracking: true,
          spatialTracking: true,
          eyeTracking: false,
          controllers: false,
          passthrough: true
        },
        supported: true
      });
    }

    return devices;
  };

  // Start XR session
  const startXRSession = useCallback(async (mode: XRMode, deviceId?: string) => {
    try {
      // Find device
      const device = deviceId 
        ? availableDevices.find(d => d.id === deviceId && d.type === mode)
        : availableDevices.find(d => d.type === mode && d.supported);

      if (!device) {
        throw new Error(`No supported device found for ${mode} mode`);
      }

      if (typeof window !== 'undefined' && !navigator.xr) {
        const xrSessionInfo: XRSessionInfo = {
          id: `xr-mock-${Date.now()}`,
          mode,
          state: 'active',
          device,
          startTime: Date.now(),
          frameRate: 60,
          latency: 12,
          trackingQuality: 'high'
        };

        setCurrentSession(xrSessionInfo);
        onSessionStart?.(xrSessionInfo);
        console.log(`Mock XR session started in ${mode} mode`);
        return;
      }

      // Map internal mode to WebXR session mode
      const xrSessionMode = mode === 'vr' ? 'immersive-vr' as const : 'immersive-ar' as const;

      // Create session
      const session = await navigator.xr.requestSession(xrSessionMode, {
        requiredFeatures: ['local', 'input'],
        optionalFeatures: [
          'hand-tracking',
          'eye-tracking',
          'spatial-tracking',
          'anchors',
          'planes',
          'meshes',
          'hit-test'
        ]
      });

      // Initialize session
      await initializeXRSession(session, device, mode);

      // Create session object
      const xrSessionInfo: XRSessionInfo = {
        id: `xr-${Date.now()}`,
        mode,
        state: 'active',
        device,
        startTime: Date.now(),
        frameRate: 0,
        latency: 0,
        trackingQuality: 'high'
      };

      setCurrentSession(xrSessionInfo);
      xrSessionRef.current = session;
      onSessionStart?.(xrSessionInfo);

      console.log(`XR session started in ${mode} mode`);
    } catch (error) {
      console.error('Failed to start XR session:', error);
      
      const errorSession: XRSessionInfo = {
        id: 'error',
        mode,
        state: 'error',
        device: availableDevices[0] || { id: 'unknown', name: 'Unknown', type: mode, capabilities: {}, supported: false },
        startTime: Date.now(),
        frameRate: 0,
        latency: 0,
        trackingQuality: 'low'
      };
      
      setCurrentSession(errorSession);
    }
  }, [availableDevices, onSessionStart]);

  // Initialize XR session
  const initializeXRSession = async (session: any, device: XRDevice, mode: XRMode) => {
    // Setup render loop
    session.requestAnimationFrame(onXRFrame);

    // Setup input sources
    await setupInputSources(session, device);

    // Setup hand tracking
    if (device.capabilities.handTracking && settings.enableHandTracking) {
      await setupHandTracking(session);
    }

    // Setup eye tracking
    if (device.capabilities.eyeTracking && settings.enableEyeTracking) {
      await setupEyeTracking(session);
    }
  };

  // Setup input sources
  const setupInputSources = async (session: any, device: XRDevice) => {
    if (!device.capabilities.controllers) return;

    try {
      // Request controller input sources
      const inputSources = await session.requestInputSources({
        optional: [
          { handedness: 'left' },
          { handedness: 'right' }
        ]
      });

      // Create controller objects
      const newControllers: XRController[] = [];
      
      for (const inputSource of inputSources) {
        const controller: XRController = {
          id: inputSource.handedness || 'unknown',
          hand: inputSource.handedness as 'left' | 'right',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          buttons: [],
          axes: [],
          tracking: true,
          visible: true
        };
        
        newControllers.push(controller);
        onControllerConnected?.(controller);
      }

      setControllers(newControllers);
    } catch (error) {
      console.error('Failed to setup input sources:', error);
    }
  };

  // Setup hand tracking
  const setupHandTracking = async (session: any) => {
    try {
      // Request hand tracking
      await session.requestReferenceSpace('viewer');
      
      // Simulate hand tracking setup
      console.log('Hand tracking enabled');
    } catch (error) {
      console.error('Failed to setup hand tracking:', error);
    }
  };

  // Setup eye tracking
  const setupEyeTracking = async (session: any) => {
    try {
      // Request eye tracking
      await session.requestReferenceSpace('viewer');
      
      // Simulate eye tracking setup
      console.log('Eye tracking enabled');
    } catch (error) {
      console.error('Failed to setup eye tracking:', error);
    }
  };

  // XR frame callback
  const onXRFrame = useCallback((time: DOMHighResTimeStamp, frame: XRFrame) => {
    xrFrameRef.current = frame;

    // Update performance stats
    updatePerformanceStats(frame);

    // Update controllers
    updateControllers(frame);

    // Update hands
    updateHands(frame);

    // Continue render loop
    if (xrSessionRef.current) {
      xrSessionRef.current.requestAnimationFrame(onXRFrame);
    }
  }, []);

  // Update performance stats
  const updatePerformanceStats = (frame: XRFrame) => {
    const stats = {
      frameRate: 60, // Would be calculated from frame timing
      latency: 0, // Would be calculated from frame timestamp
      drawCalls: 0, // Would be calculated from WebGL stats
      triangles: 0, // Would be calculated from geometry stats
      memoryUsage: 0, // Would be calculated from memory stats
      trackingQuality: frame.trackingQuality || 'high'
    };

    setPerformanceStats(stats);
  };

  // Update controllers
  const updateControllers = (frame: XRFrame) => {
    // Simulate controller updates
    const updatedControllers = controllers.map(controller => ({
      ...controller,
      position: {
        x: Math.sin(Date.now() * 0.001) * 0.5,
        y: Math.cos(Date.now() * 0.001) * 0.3,
        z: 0.5
      },
      rotation: {
        x: Math.sin(Date.now() * 0.002) * 0.1,
        y: Math.cos(Date.now() * 0.002) * 0.1,
        z: 0
      }
    }));

    setControllers(updatedControllers);
  };

  // Update hands
  const updateHands = (frame: XRFrame) => {
    // Simulate hand tracking updates
    const updatedHands = hands.map(hand => ({
      ...hand,
      position: {
        x: Math.sin(Date.now() * 0.001 + hand.hand === 'left' ? 0 : Math.PI) * 0.3,
        y: 0.2,
        z: 0.4
      },
      rotation: {
        x: 0,
        y: Math.sin(Date.now() * 0.001) * 0.2,
        z: 0
      },
      gesture: 'open',
      confidence: 0.9
    }));

    setHands(updatedHands);
  };

  // End XR session
  const endXRSession = useCallback(async () => {
    if (typeof window !== 'undefined' && !navigator.xr) {
      const session = currentSession;
      if (session) {
        const endedSession = { ...session, state: 'ending' };
        setCurrentSession(endedSession);
        onSessionEnd?.(endedSession);
      }
      setCurrentSession(null);
      setControllers([]);
      setHands([]);
      console.log('Mock XR session ended');
      return;
    }

    if (!xrSessionRef.current) return;

    try {
      await xrSessionRef.current.end();
      
      const session = currentSession;
      if (session) {
        const endedSession = { ...session, state: 'ending' };
        setCurrentSession(endedSession);
        onSessionEnd?.(endedSession);
      }

      xrSessionRef.current = null;
      setCurrentSession(null);
      setControllers([]);
      setHands([]);

      console.log('XR session ended');
    } catch (error) {
      console.error('Failed to end XR session:', error);
    }
  }, [currentSession, onSessionEnd]);

  // Cleanup WebXR
  const cleanupWebXR = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (xrSessionRef.current) {
      xrSessionRef.current.end();
    }
  };

  // Get device icon
  const getDeviceIcon = (device: XRDevice) => {
    switch (device.type) {
      case 'vr': return Glasses;
      case 'ar': return Camera;
      default: return Monitor;
    }
  };

  // Get device color
  const getDeviceColor = (device: XRDevice) => {
    switch (device.type) {
      case 'vr': return 'text-blue-400';
      case 'ar': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initializing WebXR...</p>
        </div>
      </div>
    );
  }

  if (!xrSupported) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Monitor className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            WebXR Not Supported
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Your browser or device doesn't support WebXR
          </p>
        </div>
  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden min-h-[500px]">
      {/* Interactive 3D Globe / Simulator Fallback View */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
        {currentSession?.state === 'active' ? (
          <div className="flex flex-col items-center justify-center w-full h-full pt-44 pb-16 sm:py-0">
            {/* Draggable Globe Container */}
            <div
              className="relative w-40 h-40 sm:w-60 sm:h-60 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
              style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <div
                className="w-full h-full relative flex items-center justify-center transition-transform duration-75"
                style={{
                  transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* 3D Wireframe Rings */}
                <div className="absolute w-full h-full rounded-full border border-blue-500/40 animate-pulse" style={{ transform: 'rotateY(0deg)' }} />
                <div className="absolute w-full h-full rounded-full border border-blue-500/30" style={{ transform: 'rotateY(45deg)' }} />
                <div className="absolute w-full h-full rounded-full border border-blue-500/30" style={{ transform: 'rotateY(90deg)' }} />
                <div className="absolute w-full h-full rounded-full border border-blue-500/30" style={{ transform: 'rotateY(135deg)' }} />
                <div className="absolute w-full h-full rounded-full border border-blue-500/40" style={{ transform: 'rotateX(90deg)' }} />
                
                {/* Equator & Latitudes */}
                <div className="absolute w-[86.6%] h-[86.6%] rounded-full border border-blue-500/20" style={{ transform: 'translateZ(20px) rotateX(90deg)' }} />
                <div className="absolute w-[86.6%] h-[86.6%] rounded-full border border-blue-500/20" style={{ transform: 'translateZ(-20px) rotateX(90deg)' }} />
                
                {/* Core */}
                <div className="absolute w-6 h-6 rounded-full bg-blue-600/50 blur-sm" />
                <div className="absolute w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,1)]" />

                {/* Floating Orbits / Simulated Controller Spheres */}
                {controllers.map((c) => (
                  <div
                    key={c.id}
                    className={`absolute w-3 h-3 rounded-full ${c.hand === 'left' ? 'bg-cyan-500' : 'bg-fuchsia-500'} shadow-[0_0_8px_rgba(255,255,255,0.6)]`}
                    style={{
                      transform: `translate3d(${c.position.x * 120}px, ${c.position.y * -80 + 80}px, ${c.position.z * 120}px)`
                    }}
                  />
                ))}

                {/* Floating Hand Joint Representation */}
                {hands.map((h) => (
                  <div
                    key={h.id}
                    className="absolute w-2.5 h-2.5 rounded-full bg-green-400"
                    style={{
                      transform: `translate3d(${h.position.x * 120}px, ${h.position.y * -80 + 80}px, ${h.position.z * 120}px)`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Instruction tooltip */}
            <p className="mt-4 text-[11px] text-slate-400 text-center select-none pointer-events-none">
              Drag to orbit • Simulated controllers & hands tracking active
            </p>
          </div>
        ) : (
          <div className="text-center pt-28 sm:pt-0">
            <Monitor className="h-12 w-12 text-gray-500 mx-auto mb-3 animate-pulse" />
            <h3 className="text-white text-lg font-semibold mb-1">
              WebXR 3D Simulator Fallback
            </h3>
            <p className="text-gray-400 text-xs max-w-xs mx-auto mb-4 px-4">
              Your device does not support WebXR natively. Start the Simulator Mode to experience the environment.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center px-4">
              <button
                onClick={() => startXRSession('vr')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
              >
                <Glasses className="h-4 w-4" />
                Start VR Simulator
              </button>
              <button
                onClick={() => startXRSession('ar')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
              >
                <Camera className="h-4 w-4" />
                Start AR Simulator
              </button>
            </div>
          </div>
        )}
      </div>

      {/* XR Status Display */}
      <div className="absolute top-4 left-4 right-4 sm:right-auto sm:w-80 bg-black/80 backdrop-blur-md rounded-xl p-4 border border-blue-500/30 z-20 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-blue-400" />
            <h3 className="text-white font-semibold flex items-center gap-1.5">
              WebXR Engine
              {(!navigator.xr) && (
                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold uppercase tracking-wider">
                  Sim
                </span>
              )}
            </h3>
          </div>
          {/* Mobile Diagnostics Toggle */}
          {currentSession?.state === 'active' && (
            <button
              onClick={() => setShowMobileDiagnostics(!showMobileDiagnostics)}
              className="sm:hidden p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
              title="Toggle Diagnostics"
              aria-label="Toggle Diagnostics"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Session Status */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Status:</span>
            <span className={
              currentSession?.state === 'active' ? 'text-green-400' :
              currentSession?.state === 'error' ? 'text-red-400' :
              'text-yellow-400'
            }>
              {currentSession?.state || 'Idle'}
            </span>
          </div>
          
          {currentSession && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Mode:</span>
                <span className="text-blue-400 text-sm capitalize font-semibold">
                  {currentSession.mode}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Device:</span>
                <span className="text-purple-400 text-sm font-medium truncate max-w-[150px]" title={currentSession.device.name}>
                  {currentSession.device.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Runtime:</span>
                <span className="text-green-400 text-sm font-mono">
                  {Math.floor((Date.now() - currentSession.startTime) / 1000)}s
                </span>
              </div>
            </>
          )}
        </div>

        {/* Available Devices */}
        {!currentSession && (
          <div className="mb-4">
            <h4 className="text-white text-sm font-medium mb-2">Available Devices</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {availableDevices.map((device) => {
                const IconComponent = getDeviceIcon(device);
                return (
                  <div
                    key={device.id}
                    className={`flex items-center gap-3 p-2 rounded ${
                      device.supported 
                        ? 'bg-green-900/20 border border-green-500/30' 
                        : 'bg-gray-900/20 border border-gray-500/30 opacity-50'
                    }`}
                  >
                    <IconComponent className={`h-4 w-4 ${getDeviceColor(device)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">
                        {device.name}
                      </div>
                      <div className="text-gray-400 text-xs capitalize">
                        {device.type}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {device.capabilities.handTracking && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" title="Hand Tracking" />
                      )}
                      {device.capabilities.controllers && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="Controllers" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Simulator Hand Gesture Mock Controls */}
        {(!navigator.xr) && currentSession?.state === 'active' && currentSession.device.capabilities.handTracking && (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-2">Simulate Hand Gesture</h4>
            <div className="grid grid-cols-3 gap-2">
              {['open', 'pinch', 'fist'].map((g) => (
                <button
                  key={g}
                  onClick={() => setCurrentGesture(g)}
                  className={`px-2 py-1.5 rounded text-xs capitalize font-medium transition-colors min-h-[44px] flex items-center justify-center ${
                    currentGesture === g
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Session Controls */}
        <div className="space-y-2 mt-4">
          {currentSession?.state === 'active' ? (
            <button
              onClick={endXRSession}
              className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Pause className="h-4 w-4" />
              End Session
            </button>
          ) : (
            <div className="space-y-2">
              {(enableVR && availableDevices.some(d => d.type === 'vr' && d.supported)) && (
                <button
                  onClick={() => startXRSession('vr')}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <Glasses className="h-4 w-4" />
                  Start VR
                </button>
              )}
              
              {(enableAR && availableDevices.some(d => d.type === 'ar' && d.supported)) && (
                <button
                  onClick={() => startXRSession('ar')}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <Camera className="h-4 w-4" />
                  Start AR
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Performance Stats */}
      {showDebugInfo && currentSession?.state === 'active' && (
        <div className={`absolute bg-black/80 backdrop-blur-md rounded-lg p-4 border border-green-500/30 z-10 ${
          showMobileDiagnostics ? 'block top-72 left-4 right-4 sm:left-auto sm:top-4 sm:right-4' : 'hidden sm:block sm:top-4 sm:right-4'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <Eye className="h-5 w-5 text-green-400" />
            <h3 className="text-white font-semibold">Performance</h3>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Frame Rate:</span>
              <span className={`font-mono ${
                performanceStats.frameRate >= 60 ? 'text-green-400' :
                performanceStats.frameRate >= 30 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {performanceStats.frameRate} FPS
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Latency:</span>
              <span className="text-blue-400 font-mono">{performanceStats.latency}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tracking:</span>
              <span className="text-purple-400 font-mono capitalize">
                {performanceStats.trackingQuality}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Controllers:</span>
              <span className="text-green-400 font-mono">{controllers.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Hands:</span>
              <span className="text-blue-400 font-mono">{hands.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Controller Visualization */}
      {showDebugInfo && controllers.length > 0 && currentSession?.state === 'active' && (
        <div className={`absolute bg-black/80 backdrop-blur-md rounded-lg p-4 border border-blue-500/30 z-10 ${
          showMobileDiagnostics ? 'block top-[480px] left-4 right-4 sm:left-auto sm:bottom-4 sm:left-4' : 'hidden sm:block sm:bottom-4 sm:left-4'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <Hand className="h-5 w-5 text-blue-400" />
            <h3 className="text-white font-semibold">Controllers</h3>
          </div>

          <div className="space-y-2">
            {controllers.map((controller) => (
              <div key={controller.id} className="flex items-center gap-2 text-sm">
                <div className={`w-3 h-3 rounded-full ${
                  controller.visible ? 'bg-green-500' : 'bg-gray-500'
                }`} />
                <span className="text-white capitalize">{controller.hand}</span>
                <span className="text-gray-400 font-mono">
                  ({controller.position.x.toFixed(2)}, {controller.position.y.toFixed(2)}, {controller.position.z.toFixed(2)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hand Tracking Visualization */}
      {showDebugInfo && hands.length > 0 && currentSession?.state === 'active' && (
        <div className={`absolute bg-black/80 backdrop-blur-md rounded-lg p-4 border border-green-500/30 z-10 ${
          showMobileDiagnostics ? 'block top-[600px] left-4 right-4 sm:left-auto sm:bottom-4 sm:right-4' : 'hidden sm:block sm:bottom-4 sm:right-4'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <Hand className="h-5 w-5 text-green-400" />
            <h3 className="text-white font-semibold">Hand Tracking</h3>
          </div>

          <div className="space-y-2">
            {hands.map((hand) => (
              <div key={hand.id} className="flex items-center gap-2 text-sm">
                <div className={`w-3 h-3 rounded-full ${
                  hand.tracking ? 'bg-green-500' : 'bg-gray-500'
                }`} />
                <span className="text-white capitalize">{hand.hand}</span>
                <span className="text-gray-400">{hand.gesture}</span>
                <span className="text-blue-400">{Math.round(hand.confidence * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
