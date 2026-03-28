export type LabPPE = {
  goggles: boolean;
  gloves: boolean;
  labCoat: boolean;
  fumeHood: boolean;
};

export type LabHazardLevel = 'info' | 'warning' | 'danger';

export interface LabHazard {
  id: string;
  level: LabHazardLevel;
  title: string;
  message: string;
  at: number;
}

export type LabExperimentId = 'acid-base-neutralization';

export interface LabExperimentStep {
  id: string;
  title: string;
  description: string;
  requiresPPE?: Array<keyof LabPPE>;
}

export type LabChemical = 'acid' | 'base' | 'indicator';

export interface LabExperimentEvent {
  id: string;
  type:
    | 'step'
    | 'ppe'
    | 'add-chemical'
    | 'stir'
    | 'note'
    | 'measurement'
    | 'hazard'
    | 'collaboration';
  payload: Record<string, unknown>;
  at: number;
}

export interface LabMeasurementPoint {
  t: number;
  temperatureC: number;
  ph: number;
}

export interface LabExperimentSnapshot {
  experimentId: LabExperimentId;
  stepIndex: number;
  ppe: LabPPE;
  chemicals: Record<LabChemical, number>;
  isStirring: boolean;
  measurement: LabMeasurementPoint;
  series: LabMeasurementPoint[];
  hazards: LabHazard[];
  events: LabExperimentEvent[];
}

export interface LabCollaborationMessage {
  type: 'state' | 'event' | 'presence' | 'chat';
  payload: Record<string, unknown>;
}
