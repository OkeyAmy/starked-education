/**
 * Quantum Teleportation Service
 * Main entry point for quantum teleportation functionality
 * Exports all services and provides a unified interface
 */

export { stateCaptureService, default as StateCaptureService } from './stateCapture';
export { entanglementService, default as EntanglementService } from './entanglement';
export { stateTomographyService, default as StateTomographyService } from './stateTomography';
export { errorCorrectionService, default as ErrorCorrectionService } from './errorCorrection';
export { networkManager, default as NetworkManager } from './networkManager';
export {
  quantumTeleportationProtocol,
  default as QuantumTeleportationProtocol
} from './teleportationProtocol';

export type { default } from './teleportationProtocol';

/**
 * Unified quantum teleportation service providing all capabilities
 */
export const quantumTeleportation = {
  // State management
  captureState: () => stateCaptureService.captureSnapshot(),
  updateState: (updates: any) => stateCaptureService.updateState(updates),
  recordAction: (action: string, metrics?: Record<string, number>) =>
    stateCaptureService.recordAction(action, metrics),
  getCurrentState: () => stateCaptureService.getCurrentState(),
  onStateCapture: (listener: (state: any) => void) =>
    stateCaptureService.onStateCapture(listener),

  // Entanglement
  createEntanglement: (sourceId: string, targetId: string) =>
    entanglementService.createEntanglement(sourceId, targetId),
  destroyEntanglement: (connectionId: string) =>
    entanglementService.destroyEntanglement(connectionId),
  getConnections: () => entanglementService.getAllConnections(),
  getConnectionQuality: (connectionId: string) => {
    const conn = entanglementService.getConnection(connectionId);
    return conn?.entanglementStrength || 0;
  },
  onEntanglementCreated: (listener: (conn: any) => void) =>
    entanglementService.onEntanglementCreated(listener),
  onEntanglementDestroyed: (listener: (connId: string) => void) =>
    entanglementService.onEntanglementDestroyed(listener),

  // State tomography
  reconstructState: (userId: string, courseId: string, moduleId: string) =>
    stateTomographyService.reconstructState(userId, courseId, moduleId),
  getStateVersions: (userId: string, courseId: string, moduleId: string) =>
    stateTomographyService.getStateVersions(userId, courseId, moduleId),
  detectAnomalies: (userId: string, courseId: string, moduleId: string) =>
    stateTomographyService.detectAnomalies(userId, courseId, moduleId),
  calculateConsistency: (userId: string, courseId: string, moduleId: string) =>
    stateTomographyService.calculateConsistency(userId, courseId, moduleId),

  // Error correction
  getErrorRate: (connectionId?: string) => errorCorrectionService.getErrorRate(connectionId),
  isErrorRateAcceptable: (connectionId?: string, maxRate?: number) =>
    errorCorrectionService.isErrorRateAcceptable(connectionId, maxRate),
  getErrorStats: () => errorCorrectionService.getStatistics(),

  // Network management
  registerLocation: (location: any) => networkManager.registerLocation(location),
  unregisterLocation: (locationId: string) => networkManager.unregisterLocation(locationId),
  getNetworkTopology: () => networkManager.getNetworkTopology(),
  getNetworkStats: () => networkManager.getNetworkStatistics(),
  getPeerList: () => networkManager.getOnlineLocations(),
  getNetworkHealth: () => networkManager.getNetworkTopology().networkHealth,

  // Teleportation protocol
  initialize: (userId: string, locationId: string, courseId: string, moduleId: string) =>
    quantumTeleportationProtocol.initialize(userId, locationId, courseId, moduleId),
  teleportState: (state: any, targetLocationId: string) =>
    quantumTeleportationProtocol.teleportState(state, targetLocationId),
  establishEntanglement: (sourceId: string, targetId: string) =>
    quantumTeleportationProtocol.establishEntanglement(sourceId, targetId),
  breakEntanglement: (connectionId: string) =>
    quantumTeleportationProtocol.breakEntanglement(connectionId),
  getStats: () => quantumTeleportationProtocol.getStatistics(),
  getNetworkStatus: () => quantumTeleportationProtocol.getNetworkStatus(),
  onEvent: (listener: (event: any) => void) => quantumTeleportationProtocol.onEvent(listener),
  updateConfig: (config: any) => quantumTeleportationProtocol.updateConfiguration(config),
  getConfig: () => quantumTeleportationProtocol.getConfiguration(),
  shutdown: () => quantumTeleportationProtocol.shutdown()
};

export default quantumTeleportation;
