const request = require('supertest');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const app = require('../index');

describe('Collaboration Service', () => {
  let server;
  let io;
  let clientSocket;
  const PORT = 5001;

  beforeAll((done) => {
    server = createServer(app);
    io = new Server(server);
    server.listen(PORT, () => {
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    io.close();
    server.close(done);
  });

  beforeEach((done) => {
    clientSocket = Client(`http://localhost:${PORT}`);
    clientSocket.on('connect', done);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Room Management API', () => {
    it('should create a new collaboration room', async () => {
      const response = await request(app)
        .post('/api/collaboration/rooms')
        .send({
          name: 'Test Room',
          courseId: 'course_123',
          scheduledAt: new Date().toISOString()
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('Test Room');
    });

    it('should get room by ID', async () => {
      const response = await request(app)
        .get('/api/collaboration/rooms/test_room_123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });

    it('should list all rooms', async () => {
      const response = await request(app)
        .get('/api/collaboration/rooms')
        .query({ courseId: 'course_123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should end a room', async () => {
      const response = await request(app)
        .post('/api/collaboration/rooms/test_room_123/end');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Socket.io Events', () => {
    it('should join a room', (done) => {
      clientSocket.emit('join-room', {
        roomId: 'test_room',
        userId: 'user_123',
        username: 'Test User',
        role: 'student'
      });

      clientSocket.on('room-state', (state) => {
        expect(state).toHaveProperty('participants');
        expect(state).toHaveProperty('whiteboardState');
        expect(state).toHaveProperty('chatHistory');
        done();
      });
    });

    it('should broadcast participant joined event', (done) => {
      const secondClient = Client(`http://localhost:${PORT}`);

      clientSocket.emit('join-room', {
        roomId: 'test_room_2',
        userId: 'user_1',
        username: 'User 1',
        role: 'instructor'
      });

      secondClient.on('connect', () => {
        clientSocket.on('participant-joined', (participant) => {
          expect(participant.username).toBe('User 2');
          secondClient.disconnect();
          done();
        });

        secondClient.emit('join-room', {
          roomId: 'test_room_2',
          userId: 'user_2',
          username: 'User 2',
          role: 'student'
        });
      });
    });

    it('should handle chat messages', (done) => {
      clientSocket.emit('join-room', {
        roomId: 'test_room_3',
        userId: 'user_123',
        username: 'Test User',
        role: 'student'
      });

      clientSocket.on('chat-message', (message) => {
        expect(message.message).toBe('Hello World');
        expect(message.username).toBe('Test User');
        done();
      });

      setTimeout(() => {
        clientSocket.emit('chat-message', {
          roomId: 'test_room_3',
          message: 'Hello World',
          username: 'Test User'
        });
      }, 100);
    });

    it('should handle whiteboard drawing', (done) => {
      const drawData = {
        tool: 'pen',
        color: '#000000',
        lineWidth: 2,
        startX: 10,
        startY: 10,
        endX: 20,
        endY: 20
      };

      clientSocket.emit('join-room', {
        roomId: 'test_room_4',
        userId: 'user_123',
        username: 'Test User',
        role: 'instructor'
      });

      clientSocket.on('whiteboard-update', (data) => {
        expect(data.tool).toBe('pen');
        expect(data.color).toBe('#000000');
        done();
      });

      setTimeout(() => {
        clientSocket.emit('whiteboard-draw', {
          roomId: 'test_room_4',
          drawData
        });
      }, 100);
    });

    it('should handle emoji reactions', (done) => {
      clientSocket.emit('join-room', {
        roomId: 'test_room_5',
        userId: 'user_123',
        username: 'Test User',
        role: 'student'
      });

      clientSocket.on('emoji-reaction', (reaction) => {
        expect(reaction.emoji).toBe('👍');
        expect(reaction.username).toBe('Test User');
        done();
      });

      setTimeout(() => {
        clientSocket.emit('emoji-reaction', {
          roomId: 'test_room_5',
          emoji: '👍',
          username: 'Test User'
        });
      }, 100);
    });
  });
});
