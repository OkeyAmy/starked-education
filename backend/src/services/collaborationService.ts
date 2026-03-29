import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';

interface Participant {
  id: string;
  userId: string;
  username: string;
  role: 'instructor' | 'student';
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
}

interface Room {
  id: string;
  name: string;
  participants: Map<string, Participant>;
  whiteboardState: any[];
  chatHistory: any[];
  createdAt: Date;
}

export class CollaborationService {
  private io: SocketIOServer;
  private rooms: Map<string, Room> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.initializeSocketHandlers();
  }

  private initializeSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on('join-room', this.handleJoinRoom(socket));
      socket.on('leave-room', this.handleLeaveRoom(socket));
      socket.on('webrtc-offer', this.handleWebRTCOffer(socket));
      socket.on('webrtc-answer', this.handleWebRTCAnswer(socket));
      socket.on('webrtc-ice-candidate', this.handleICECandidate(socket));
      socket.on('whiteboard-draw', this.handleWhiteboardDraw(socket));
      socket.on('whiteboard-clear', this.handleWhiteboardClear(socket));
      socket.on('chat-message', this.handleChatMessage(socket));
      socket.on('emoji-reaction', this.handleEmojiReaction(socket));
      socket.on('toggle-mute', this.handleToggleMute(socket));
      socket.on('toggle-video', this.handleToggleVideo(socket));
      socket.on('start-screen-share', this.handleStartScreenShare(socket));
      socket.on('stop-screen-share', this.handleStopScreenShare(socket));
      socket.on('kick-participant', this.handleKickParticipant(socket));
      socket.on('disconnect', this.handleDisconnect(socket));
    });
  }

  private handleJoinRoom(socket: Socket) {
    return (data: { roomId: string; userId: string; username: string; role: 'instructor' | 'student' }) => {
      const { roomId, userId, username, role } = data;

      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, {
          id: roomId,
          name: `Room ${roomId}`,
          participants: new Map(),
          whiteboardState: [],
          chatHistory: [],
          createdAt: new Date()
        });
      }

      const room = this.rooms.get(roomId)!;
      const participant: Participant = {
        id: socket.id,
        userId,
        username,
        role,
        isMuted: false,
        isVideoOn: true,
        isScreenSharing: false
      };

      room.participants.set(socket.id, participant);
      socket.join(roomId);

      // Send current room state to the new participant
      socket.emit('room-state', {
        participants: Array.from(room.participants.values()),
        whiteboardState: room.whiteboardState,
        chatHistory: room.chatHistory
      });

      // Notify others about the new participant
      socket.to(roomId).emit('participant-joined', participant);

      console.log(`${username} joined room ${roomId}`);
    };
  }

  private handleLeaveRoom(socket: Socket) {
    return (data: { roomId: string }) => {
      const { roomId } = data;
      const room = this.rooms.get(roomId);

      if (room) {
        const participant = room.participants.get(socket.id);
        room.participants.delete(socket.id);
        socket.leave(roomId);

        socket.to(roomId).emit('participant-left', { participantId: socket.id });

        if (room.participants.size === 0) {
          this.rooms.delete(roomId);
        }

        console.log(`Participant ${socket.id} left room ${roomId}`);
      }
    };
  }

  private handleWebRTCOffer(socket: Socket) {
    return (data: { roomId: string; targetId: string; offer: RTCSessionDescriptionInit }) => {
      socket.to(data.targetId).emit('webrtc-offer', {
        senderId: socket.id,
        offer: data.offer
      });
    };
  }

  private handleWebRTCAnswer(socket: Socket) {
    return (data: { roomId: string; targetId: string; answer: RTCSessionDescriptionInit }) => {
      socket.to(data.targetId).emit('webrtc-answer', {
        senderId: socket.id,
        answer: data.answer
      });
    };
  }

  private handleICECandidate(socket: Socket) {
    return (data: { roomId: string; targetId: string; candidate: RTCIceCandidateInit }) => {
      socket.to(data.targetId).emit('webrtc-ice-candidate', {
        senderId: socket.id,
        candidate: data.candidate
      });
    };
  }

  private handleWhiteboardDraw(socket: Socket) {
    return (data: { roomId: string; drawData: any }) => {
      const room = this.rooms.get(data.roomId);
      if (room) {
        room.whiteboardState.push(data.drawData);
        socket.to(data.roomId).emit('whiteboard-update', data.drawData);
      }
    };
  }

  private handleWhiteboardClear(socket: Socket) {
    return (data: { roomId: string }) => {
      const room = this.rooms.get(data.roomId);
      if (room) {
        room.whiteboardState = [];
        socket.to(data.roomId).emit('whiteboard-cleared');
      }
    };
  }

  private handleChatMessage(socket: Socket) {
    return (data: { roomId: string; message: string; username: string }) => {
      const room = this.rooms.get(data.roomId);
      if (room) {
        const chatMessage = {
          id: Date.now().toString(),
          userId: socket.id,
          username: data.username,
          message: data.message,
          timestamp: new Date()
        };
        room.chatHistory.push(chatMessage);
        this.io.to(data.roomId).emit('chat-message', chatMessage);
      }
    };
  }

  private handleEmojiReaction(socket: Socket) {
    return (data: { roomId: string; emoji: string; username: string }) => {
      this.io.to(data.roomId).emit('emoji-reaction', {
        userId: socket.id,
        username: data.username,
        emoji: data.emoji,
        timestamp: Date.now()
      });
    };
  }

  private handleToggleMute(socket: Socket) {
    return (data: { roomId: string; isMuted: boolean }) => {
      const room = this.rooms.get(data.roomId);
      if (room) {
        const participant = room.participants.get(socket.id);
        if (participant) {
          participant.isMuted = data.isMuted;
          socket.to(data.roomId).emit('participant-muted', {
            participantId: socket.id,
            isMuted: data.isMuted
          });
        }
      }
    };
  }

  private handleToggleVideo(socket: Socket) {
    return (data: { roomId: string; isVideoOn: boolean }) => {
      const room = this.rooms.get(data.roomId);
      if (room) {
        const participant = room.participants.get(socket.id);
        if (participant) {
          participant.isVideoOn = data.isVideoOn;
          socket.to(data.roomId).emit('participant-video-toggled', {
            participantId: socket.id,
            isVideoOn: data.isVideoOn
          });
        }
      }
    };
  }

  private handleStartScreenShare(socket: Socket) {
    return (data: { roomId: string }) => {
      const room = this.rooms.get(data.roomId);
      if (room) {
        const participant = room.participants.get(socket.id);
        if (participant) {
          participant.isScreenSharing = true;
          socket.to(data.roomId).emit('screen-share-started', {
            participantId: socket.id,
            username: participant.username
          });
        }
      }
    };
  }

  private handleStopScreenShare(socket: Socket) {
    return (data: { roomId: string }) => {
      const room = this.rooms.get(data.roomId);
      if (room) {
        const participant = room.participants.get(socket.id);
        if (participant) {
          participant.isScreenSharing = false;
          socket.to(data.roomId).emit('screen-share-stopped', {
            participantId: socket.id
          });
        }
      }
    };
  }

  private handleKickParticipant(socket: Socket) {
    return (data: { roomId: string; participantId: string }) => {
      const room = this.rooms.get(data.roomId);
      if (room) {
        const kicker = room.participants.get(socket.id);
        if (kicker && kicker.role === 'instructor') {
          room.participants.delete(data.participantId);
          this.io.to(data.participantId).emit('kicked-from-room');
          socket.to(data.roomId).emit('participant-left', { participantId: data.participantId });
        }
      }
    };
  }

  private handleDisconnect(socket: Socket) {
    return () => {
      console.log(`Client disconnected: ${socket.id}`);
      
      this.rooms.forEach((room, roomId) => {
        if (room.participants.has(socket.id)) {
          room.participants.delete(socket.id);
          socket.to(roomId).emit('participant-left', { participantId: socket.id });
          
          if (room.participants.size === 0) {
            this.rooms.delete(roomId);
          }
        }
      });
    };
  }

  public getRoomInfo(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      id: room.id,
      name: room.name,
      participantCount: room.participants.size,
      participants: Array.from(room.participants.values()),
      createdAt: room.createdAt
    };
  }
}
