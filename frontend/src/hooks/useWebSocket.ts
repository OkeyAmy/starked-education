import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketMessage {
  id: string;
  content: string;
  type: 'user' | 'assistant' | 'system';
  timestamp: Date;
  attachments?: any[];
  version?: number; // Tracks stream offset sequencing
}

type ConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'polling';

interface UseWebSocketReturn {
  sendMessage: (
    message: string,
    context?: any
  ) => Promise<WebSocketMessage | null>;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  socket: Socket | null;
  messages: WebSocketMessage[];
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const lastOffsetRef = useRef<number>(0); // Client message offset tracker
  const maxReconnectAttempts = 10;

  const connect = useCallback(() => {
    if (socket?.connected || connectionStatus === 'polling') return;

    if (reconnectAttemptsRef.current > 0) {
      setConnectionStatus('reconnecting');
    } else {
      setConnectionStatus('disconnected');
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

    // Disable socket.io auto-reconnect to gain explicit manual control over backoff execution
    const newSocket = io(wsUrl, {
      transports: ['websocket'],
      timeout: 10000,
      reconnection: false,
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;

      // Pass the track offset sequence downstream upon connection/reconnection
      newSocket.emit('register-user', {
        userId: 'current-user', // Hook auth context mapping here
        lastOffset: lastOffsetRef.current,
      });
    });

    // Server replays historical lost state records
    newSocket.on(
      'state-recovery-replay',
      (data: { recoveredMessages: any[] }) => {
        if (data.recoveredMessages && data.recoveredMessages.length > 0) {
          const formatted = data.recoveredMessages.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));

          setMessages((prev) => [...prev, ...formatted]);

          const highestOffset = Math.max(
            ...formatted.map((m) => m.version || 0)
          );
          if (highestOffset > lastOffsetRef.current) {
            lastOffsetRef.current = highestOffset;
          }
        }
      }
    );

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      setSocket(null);

      if (reason !== 'io client disconnect') {
        setConnectionStatus('disconnected');
        scheduleReconnect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
      setSocket(null);
      scheduleReconnect();
    });

    newSocket.on('message', (data: WebSocketMessage) => {
      console.log('Received message:', data);
      setMessages((prev) => [...prev, data]);

      if (data.version && data.version > lastOffsetRef.current) {
        lastOffsetRef.current = data.version;
      }
    });

    newSocket.on('typing', (data: { isTyping: boolean; userId: string }) => {
      console.log('Typing indicator:', data);
    });

    setSocket(newSocket);
  }, [socket, connectionStatus]);

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setConnectionStatus('polling');
      startPollingFallback();
      return;
    }

    reconnectAttemptsRef.current++;
    // Binary backoff calculation: 1s, 2s, 4s, 8s... max 30s
    const delay = Math.min(
      Math.pow(2, reconnectAttemptsRef.current - 1) * 1000,
      30000
    );

    console.log(
      `Scheduling reconnect. Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`
    );
    setConnectionStatus('reconnecting');

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  };

  const startPollingFallback = () => {
    console.warn(
      'Max reconnection limits reached. Falling back to HTTP polling channel sync lifecycle loop.'
    );
    // Execute intervals hitting /api/sync endpoint for system updates here
  };

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    }
  }, [socket]);

  const sendMessage = useCallback(
    async (
      message: string,
      context?: any
    ): Promise<WebSocketMessage | null> => {
      if (!socket || !socket.connected) {
        console.error('WebSocket not connected');
        return null;
      }

      try {
        const messageData = {
          id: Date.now().toString(),
          content: message,
          type: 'user',
          timestamp: new Date(),
          context,
        };

        socket.emit('classroom-message', messageData);

        const aiResponse: WebSocketMessage = {
          id: (Date.now() + 1).toString(),
          content: await generateAIResponse(message, context),
          type: 'assistant',
          timestamp: new Date(),
        };

        return aiResponse;
      } catch (error) {
        console.error('Error sending message:', error);
        return null;
      }
    },
    [socket]
  );

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
      if (socket) socket.disconnect();
    };
  }, []);

  return {
    sendMessage,
    isConnected,
    connectionStatus,
    socket,
    messages,
  };
};

// Mock AI response generator
async function generateAIResponse(
  message: string,
  context?: any
): Promise<string> {
  await new Promise((resolve) =>
    setTimeout(resolve, 1000 + Math.random() * 2000)
  );
  const lowerMessage = message.toLowerCase();

  if (context?.courseTitle) {
    if (lowerMessage.includes('help') || lowerMessage.includes('stuck')) {
      return `I understand you need help with ${context.courseTitle}. Let me provide some guidance based on the course content. Could you tell me more specifically what you're struggling with?`;
    }
    if (lowerMessage.includes('explain') || lowerMessage.includes('what is')) {
      return `Based on ${context.courseTitle}, I can help explain concepts. What specific topic would you like me to clarify?`;
    }
  }

  if (lowerMessage.includes('study') || lowerMessage.includes('learn')) {
    return `Here are some effective study strategies I recommend:\n\n1. **Active Recall**: Test yourself regularly instead of just re-reading\n2. **Spaced Repetition**: Review material at increasing intervals\n3. **Pomodoro Technique**: Study in focused 25-minute sessions\n4. **Feynman Technique**: Explain concepts in simple terms\n\nWould you like me to elaborate on any of these techniques?`;
  }

  if (
    lowerMessage.includes('motivation') ||
    lowerMessage.includes('encouragement')
  ) {
    return `You're doing great! Remember that learning is a journey, and every step forward counts. Here's some motivation:\n\n💪 **You're capable of amazing things**\n🎯 **Focus on progress, not perfection**\n🌟 **Your hard work will pay off**\n\nKeep going! What specific challenge are you working on right now?`;
  }

  if (lowerMessage.includes('question') || lowerMessage.includes('ask')) {
    return `I'm here to help with your questions! Feel free to ask about:\n\n• Course concepts and topics\n• Study strategies and techniques\n• Time management and organization\n• Test preparation tips\n• Career guidance in your field\n\nWhat's on your mind?`;
  }

  const responses = [
    "I'm here to help you learn! What would you like to know about your course material?",
    'Great question! Let me think about that and provide you with a helpful answer.',
    "I'd be happy to assist you with your learning journey. What specific topic can I help with?",
    "That's an interesting point! Let me provide you with some insights on that topic.",
    "I'm designed to support your educational goals. How can I help you succeed today?",
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}
