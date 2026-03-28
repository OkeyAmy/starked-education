import { Server as SocketServer, Socket } from 'socket.io';
import { Redis } from 'ioredis';
import quantumCrypto from './quantumResistantCrypto';
import { v4 as uuidv4 } from 'uuid';

interface SecureSession {
  sessionId: string;
  userId: string;
  publicKey: string;
  sharedSecret?: string;
  sessionKey: string;
  createdAt: Date;
  expiresAt: Date;
}

interface EncryptedMessage {
  senderId: string;
  recipientId: string;
  ciphertext: string;
  nonce: string;
  signature: string;
  timestamp: number;
  messageId: string;
}

interface CommunicationRoom {
  roomId: string;
  participants: Map<string, SecureSession>;
  roomKey: string;
  createdAt: Date;
  metadata: {
    type: 'classroom' | 'collaboration' | 'private';
    maxParticipants?: number;
  };
}

/**
 * Secure Real-time Communication Service
 * Implements quantum-resistant encryption for WebRTC signaling and messaging
 */
export class SecureRealtimeCommunication {
  private io: SocketServer;
  private redis: Redis;
  private sessions: Map<string, SecureSession> = new Map();
  private rooms: Map<string, CommunicationRoom> = new Map();
  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  constructor(io: SocketServer, redis: Redis) {
    this.io = io;
    this.redis = redis;
    this.initializeSocketHandlers();
  }

  private initializeSocketHandlers(): void {
    this.io.on('connection', async (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle secure session establishment
      socket.on('establish-secure-session', async (data) => {
        await this.handleSecureSessionEstablishment(socket, data);
      });

      // Handle encrypted message
      socket.on('send-encrypted-message', async (data) => {
        await this.handleEncryptedMessage(socket, data);
      });

      // Handle room creation
      socket.on('create-secure-room', async (data) => {
        await this.handleCreateSecureRoom(socket, data);
      });

      // Handle room join
      socket.on('join-secure-room', async (data) => {
        await this.handleJoinSecureRoom(socket, data);
      });

      // Handle WebRTC signaling
      socket.on('webrtc-offer', async (data) => {
        await this.handleWebRTCSignaling(socket, 'offer', data);
      });

      socket.on('webrtc-answer', async (data) => {
        await this.handleWebRTCSignaling(socket, 'answer', data);
      });

      socket.on('webrtc-ice-candidate', async (data) => {
        await this.handleWebRTCSignaling(socket, 'ice-candidate', data);
      });

      // Handle key rotation
      socket.on('rotate-session-key', async (data) => {
        await this.handleKeyRotation(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });
    });
  }

  /**
   * Establish secure session with quantum-resistant key exchange
   */
  private async handleSecureSessionEstablishment(
    socket: Socket,
    data: { userId: string; publicKey: string }
  ): Promise<void> {
    try {
      const { userId, publicKey } = data;

      // Generate session key with forward secrecy
      const sessionKey = await quantumCrypto.generateSessionKey();
      
      const session: SecureSession = {
        sessionId: uuidv4(),
        userId,
        publicKey,
        sessionKey,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      this.sessions.set(socket.id, session);
      this.userSockets.set(userId, socket.id);

      // Store session in Redis for distributed systems
      await this.redis.setex(
        `secure-session:${session.sessionId}`,
        86400, // 24 hours
        JSON.stringify(session)
      );

      socket.emit('secure-session-established', {
        sessionId: session.sessionId,
        sessionKey: session.sessionKey,
        expiresAt: session.expiresAt
      });

      console.log(`Secure session established for user: ${userId}`);
    } catch (error) {
      console.error('Error establishing secure session:', error);
      socket.emit('error', { message: 'Failed to establish secure session' });
    }
  }

  /**
   * Handle encrypted message transmission
   */
  private async handleEncryptedMessage(
    socket: Socket,
    data: EncryptedMessage
  ): Promise<void> {
    try {
      const session = this.sessions.get(socket.id);
      if (!session) {
        throw new Error('No active session');
      }

      // Verify message signature
      const messageData = JSON.stringify({
        ciphertext: data.ciphertext,
        nonce: data.nonce,
        timestamp: data.timestamp
      });

      const isValid = await quantumCrypto.verifySignature(
        messageData,
        data.signature,
        session.publicKey
      );

      if (!isValid) {
        throw new Error('Invalid message signature');
      }

      // Forward encrypted message to recipient
      const recipientSocketId = this.userSockets.get(data.recipientId);
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit('encrypted-message-received', {
          ...data,
          verified: true
        });

        // Store message in Redis for offline delivery
        await this.redis.lpush(
          `messages:${data.recipientId}`,
          JSON.stringify(data)
        );
        await this.redis.expire(`messages:${data.recipientId}`, 604800); // 7 days
      }

      socket.emit('message-delivered', { messageId: data.messageId });
    } catch (error) {
      console.error('Error handling encrypted message:', error);
      socket.emit('error', { message: 'Failed to deliver message' });
    }
  }

  /**
   * Create secure communication room
   */
  private async handleCreateSecureRoom(
    socket: Socket,
    data: { userId: string; roomType: 'classroom' | 'collaboration' | 'private'; maxParticipants?: number }
  ): Promise<void> {
    try {
      const session = this.sessions.get(socket.id);
      if (!session) {
        throw new Error('No active session');
      }

      const roomId = uuidv4();
      const roomKey = await quantumCrypto.generateSessionKey();

      const room: CommunicationRoom = {
        roomId,
        participants: new Map([[data.userId, session]]),
        roomKey,
        createdAt: new Date(),
        metadata: {
          type: data.roomType,
          maxParticipants: data.maxParticipants
        }
      };

      this.rooms.set(roomId, room);
      socket.join(roomId);

      // Store room in Redis
      await this.redis.setex(
        `secure-room:${roomId}`,
        86400,
        JSON.stringify({
          roomId,
          roomKey,
          createdAt: room.createdAt,
          metadata: room.metadata
        })
      );

      socket.emit('secure-room-created', {
        roomId,
        roomKey,
        participants: [data.userId]
      });

      console.log(`Secure room created: ${roomId}`);
    } catch (error) {
      console.error('Error creating secure room:', error);
      socket.emit('error', { message: 'Failed to create secure room' });
    }
  }

  /**
   * Join secure communication room
   */
  private async handleJoinSecureRoom(
    socket: Socket,
    data: { userId: string; roomId: string; roomKey: string }
  ): Promise<void> {
    try {
      const session = this.sessions.get(socket.id);
      if (!session) {
        throw new Error('No active session');
      }

      let room = this.rooms.get(data.roomId);
      
      // If room not in memory, try to load from Redis
      if (!room) {
        const roomData = await this.redis.get(`secure-room:${data.roomId}`);
        if (!roomData) {
          throw new Error('Room not found');
        }
        
        const parsedRoom = JSON.parse(roomData);
        if (parsedRoom.roomKey !== data.roomKey) {
          throw new Error('Invalid room key');
        }

        room = {
          roomId: parsedRoom.roomId,
          participants: new Map(),
          roomKey: parsedRoom.roomKey,
          createdAt: new Date(parsedRoom.createdAt),
          metadata: parsedRoom.metadata
        };
        this.rooms.set(data.roomId, room);
      }

      // Check max participants
      if (room.metadata.maxParticipants && 
          room.participants.size >= room.metadata.maxParticipants) {
        throw new Error('Room is full');
      }

      room.participants.set(data.userId, session);
      socket.join(data.roomId);

      // Notify all participants
      const participantIds = Array.from(room.participants.keys());
      this.io.to(data.roomId).emit('participant-joined', {
        userId: data.userId,
        participants: participantIds
      });

      socket.emit('secure-room-joined', {
        roomId: data.roomId,
        participants: participantIds
      });

      console.log(`User ${data.userId} joined room: ${data.roomId}`);
    } catch (error) {
      console.error('Error joining secure room:', error);
      socket.emit('error', { message: error.message || 'Failed to join room' });
    }
  }

  /**
   * Handle WebRTC signaling with encryption
   */
  private async handleWebRTCSignaling(
    socket: Socket,
    type: 'offer' | 'answer' | 'ice-candidate',
    data: any
  ): Promise<void> {
    try {
      const session = this.sessions.get(socket.id);
      if (!session) {
        throw new Error('No active session');
      }

      const { recipientId, roomId, signalData } = data;

      // Encrypt signaling data
      const encryptedSignal = await quantumCrypto.encryptMessage(
        JSON.stringify(signalData),
        session.sessionKey
      );

      if (roomId) {
        // Broadcast to room (excluding sender)
        socket.to(roomId).emit(`webrtc-${type}`, {
          senderId: session.userId,
          ...encryptedSignal
        });
      } else if (recipientId) {
        // Send to specific recipient
        const recipientSocketId = this.userSockets.get(recipientId);
        if (recipientSocketId) {
          this.io.to(recipientSocketId).emit(`webrtc-${type}`, {
            senderId: session.userId,
            ...encryptedSignal
          });
        }
      }
    } catch (error) {
      console.error('Error handling WebRTC signaling:', error);
      socket.emit('error', { message: 'Failed to process WebRTC signal' });
    }
  }

  /**
   * Handle session key rotation for forward secrecy
   */
  private async handleKeyRotation(
    socket: Socket,
    data: { userId: string }
  ): Promise<void> {
    try {
      const session = this.sessions.get(socket.id);
      if (!session) {
        throw new Error('No active session');
      }

      // Generate new session key
      const newSessionKey = await quantumCrypto.generateSessionKey();
      session.sessionKey = newSessionKey;

      // Update in Redis
      await this.redis.setex(
        `secure-session:${session.sessionId}`,
        86400,
        JSON.stringify(session)
      );

      socket.emit('session-key-rotated', {
        sessionKey: newSessionKey
      });

      console.log(`Session key rotated for user: ${data.userId}`);
    } catch (error) {
      console.error('Error rotating session key:', error);
      socket.emit('error', { message: 'Failed to rotate session key' });
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(socket: Socket): void {
    const session = this.sessions.get(socket.id);
    if (session) {
      this.userSockets.delete(session.userId);
      this.sessions.delete(socket.id);

      // Remove from all rooms
      this.rooms.forEach((room, roomId) => {
        if (room.participants.has(session.userId)) {
          room.participants.delete(session.userId);
          
          // Notify other participants
          this.io.to(roomId).emit('participant-left', {
            userId: session.userId,
            participants: Array.from(room.participants.keys())
          });

          // Delete room if empty
          if (room.participants.size === 0) {
            this.rooms.delete(roomId);
            this.redis.del(`secure-room:${roomId}`);
          }
        }
      });

      console.log(`User disconnected: ${session.userId}`);
    }
  }

  /**
   * Get pending messages for user
   */
  async getPendingMessages(userId: string): Promise<EncryptedMessage[]> {
    const messages = await this.redis.lrange(`messages:${userId}`, 0, -1);
    return messages.map(msg => JSON.parse(msg));
  }

  /**
   * Clear pending messages for user
   */
  async clearPendingMessages(userId: string): Promise<void> {
    await this.redis.del(`messages:${userId}`);
  }
}

export default SecureRealtimeCommunication;
