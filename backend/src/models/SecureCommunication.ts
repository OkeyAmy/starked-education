import mongoose, { Schema, Document } from 'mongoose';

export interface ISecureSession extends Document {
  userId: string;
  sessionId: string;
  publicKey: string;
  sessionKey: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface ISecureMessage extends Document {
  messageId: string;
  senderId: string;
  recipientId: string;
  roomId?: string;
  ciphertext: string;
  nonce: string;
  signature: string;
  timestamp: Date;
  delivered: boolean;
  read: boolean;
  metadata: {
    messageType: 'text' | 'file' | 'webrtc-signal';
    priority: 'low' | 'normal' | 'high';
  };
}

export interface ISecureRoom extends Document {
  roomId: string;
  roomKey: string;
  creatorId: string;
  participants: string[];
  roomType: 'classroom' | 'collaboration' | 'private';
  maxParticipants?: number;
  createdAt: Date;
  expiresAt?: Date;
  metadata: {
    name?: string;
    description?: string;
    tags?: string[];
  };
}

const SecureSessionSchema = new Schema<ISecureSession>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  publicKey: {
    type: String,
    required: true
  },
  sessionKey: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  ipAddress: String,
  userAgent: String
});

// Auto-delete expired sessions
SecureSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const SecureMessageSchema = new Schema<ISecureMessage>({
  messageId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  senderId: {
    type: String,
    required: true,
    index: true
  },
  recipientId: {
    type: String,
    required: true,
    index: true
  },
  roomId: {
    type: String,
    index: true
  },
  ciphertext: {
    type: String,
    required: true
  },
  nonce: {
    type: String,
    required: true
  },
  signature: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  delivered: {
    type: Boolean,
    default: false
  },
  read: {
    type: Boolean,
    default: false
  },
  metadata: {
    messageType: {
      type: String,
      enum: ['text', 'file', 'webrtc-signal'],
      default: 'text'
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal'
    }
  }
});

// Auto-delete messages after 30 days
SecureMessageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

const SecureRoomSchema = new Schema<ISecureRoom>({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  roomKey: {
    type: String,
    required: true
  },
  creatorId: {
    type: String,
    required: true,
    index: true
  },
  participants: [{
    type: String,
    index: true
  }],
  roomType: {
    type: String,
    enum: ['classroom', 'collaboration', 'private'],
    required: true
  },
  maxParticipants: Number,
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    index: true
  },
  metadata: {
    name: String,
    description: String,
    tags: [String]
  }
});

// Auto-delete expired rooms
SecureRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SecureSession = mongoose.model<ISecureSession>('SecureSession', SecureSessionSchema);
export const SecureMessage = mongoose.model<ISecureMessage>('SecureMessage', SecureMessageSchema);
export const SecureRoom = mongoose.model<ISecureRoom>('SecureRoom', SecureRoomSchema);
