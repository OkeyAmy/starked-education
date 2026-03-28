export interface Participant {
  id: string;
  userId: string;
  username: string;
  role: 'instructor' | 'student';
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
}

export interface EmojiReaction {
  userId: string;
  username: string;
  emoji: string;
  timestamp: number;
}

export interface RoomState {
  participants: Participant[];
  whiteboardState: DrawData[];
  chatHistory: ChatMessage[];
}

export interface DrawData {
  tool: DrawTool;
  color: string;
  lineWidth: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  text?: string;
}

export type DrawTool = 'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text';

export interface WebRTCSignal {
  senderId: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface CollaborationRoom {
  id: string;
  name: string;
  courseId?: string;
  createdBy: string;
  scheduledAt: Date;
  isActive: boolean;
  participantCount: number;
  createdAt: Date;
}
