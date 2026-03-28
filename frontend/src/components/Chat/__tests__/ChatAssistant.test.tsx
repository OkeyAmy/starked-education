import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatAssistant } from '@/components/Chat/ChatAssistant';
import { useChatStore } from '@/store/chatStore';
import { useCourseStore } from '@/store/courseStore';

// Mock the stores
jest.mock('@/store/chatStore');
jest.mock('@/store/courseStore');
jest.mock('@/hooks/useWebSocket');
jest.mock('@/hooks/useSpeechRecognition');
jest.mock('@/hooks/useTextToSpeech');

const mockChatStore = useChatStore as jest.MockedFunction<typeof useChatStore>;
const mockCourseStore = useCourseStore as jest.MockedFunction<typeof useCourseStore>;

describe('ChatAssistant', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock store implementations
    mockChatStore.mockReturnValue({
      addMessage: jest.fn(),
      getChatHistory: jest.fn().mockResolvedValue([]),
      clearHistory: jest.fn(),
      currentMessages: [],
      isTyping: false,
      currentCourseId: undefined,
      setTyping: jest.fn(),
      setCurrentCourse: jest.fn(),
      chatHistories: [],
      studyReminders: [],
      addStudyReminder: jest.fn(),
      markReminderSent: jest.fn(),
      clearSentReminders: jest.fn(),
      saveChatHistory: jest.fn(),
      deleteHistory: jest.fn(),
      clearCurrentChat: jest.fn()
    } as any);

    mockCourseStore.mockReturnValue({
      currentCourse: {
        id: 'course-1',
        title: 'Test Course',
        content: 'Test content',
        progress: 50,
        topics: ['Topic 1', 'Topic 2']
      },
      availableCourses: [],
      enrolledCourses: [],
      studyStreak: 5,
      totalStudyTime: 120,
      lastStudyDate: new Date(),
      setCurrentCourse: jest.fn(),
      enrollInCourse: jest.fn(),
      unenrollFromCourse: jest.fn(),
      updateProgress: jest.fn(),
      loadAvailableCourses: jest.fn(),
      loadEnrolledCourses: jest.fn(),
      addCourse: jest.fn(),
      updateCourse: jest.fn(),
      startStudySession: jest.fn(),
      endStudySession: jest.fn(),
      updateStudyStreak: jest.fn(),
      getCourseContext: jest.fn().mockReturnValue({
        courseTitle: 'Test Course',
        courseContent: 'Test content',
        currentProgress: 50,
        topics: ['Topic 1', 'Topic 2']
      })
    } as any);
  });

  it('renders chat assistant with welcome message', () => {
    render(<ChatAssistant />);
    
    expect(screen.getByText('Learning Assistant')).toBeInTheDocument();
    expect(screen.getByText('Welcome to your Learning Assistant!')).toBeInTheDocument();
  });

  it('displays course information when provided', () => {
    render(<ChatAssistant courseId="course-1" />);
    
    expect(screen.getByText('Currently helping with: Test Course')).toBeInTheDocument();
  });

  it('allows sending messages', async () => {
    const mockAddMessage = jest.fn();
    mockChatStore.mockReturnValue({
      ...mockChatStore(),
      addMessage: mockAddMessage
    } as any);

    render(<ChatAssistant />);
    
    const input = screen.getByPlaceholderText('Ask me anything about your course...');
    const sendButton = screen.getByTitle('Send message');
    
    fireEvent.change(input, { target: { value: 'Hello, AI!' } });
    fireEvent.click(sendButton);
    
    expect(mockAddMessage).toHaveBeenCalledWith({
      id: expect.any(String),
      content: 'Hello, AI!',
      type: 'user',
      timestamp: expect.any(Date),
      attachments: undefined
    });
  });

  it('shows typing indicator when AI is responding', () => {
    mockChatStore.mockReturnValue({
      ...mockChatStore(),
      isTyping: true
    } as any);

    render(<ChatAssistant />);
    
    // Should show typing indicator
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('handles voice input when supported', () => {
    const mockStartListening = jest.fn();
    
    jest.doMock('@/hooks/useSpeechRecognition', () => ({
      useSpeechRecognition: () => ({
        isListening: false,
        transcript: '',
        startListening: mockStartListening,
        stopListening: jest.fn(),
        supported: true
      })
    }));

    render(<ChatAssistant />);
    
    const voiceButton = screen.getByTitle('Start voice input');
    fireEvent.click(voiceButton);
    
    expect(mockStartListening).toHaveBeenCalled();
  });

  it('displays error message when WebSocket is disconnected', () => {
    jest.doMock('@/hooks/useWebSocket', () => ({
      useWebSocket: () => ({
        sendMessage: jest.fn(),
        isConnected: false,
        connectionStatus: 'disconnected',
        socket: null
      })
    }));

    render(<ChatAssistant />);
    
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('supports keyboard shortcuts for sending messages', () => {
    const mockAddMessage = jest.fn();
    mockChatStore.mockReturnValue({
      ...mockChatStore(),
      addMessage: mockAddMessage
    } as any);

    render(<ChatAssistant />);
    
    const input = screen.getByPlaceholderText('Ask me anything about your course...');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyPress(input, { key: 'Enter' });
    
    expect(mockAddMessage).toHaveBeenCalled();
  });

  it('shows settings panel when settings button is clicked', () => {
    render(<ChatAssistant />);
    
    const settingsButton = screen.getByTitle('Settings');
    fireEvent.click(settingsButton);
    
    expect(screen.getByText('Chat Settings')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('handles file attachments', async () => {
    render(<ChatAssistant />);
    
    const fileInput = screen.getByTitle('Attach file');
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    // Simulate file selection
    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(screen.getByText('test.txt')).toBeInTheDocument();
    });
  });
});
