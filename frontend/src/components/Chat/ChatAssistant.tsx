import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Settings, X } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { ChatSettings } from './ChatSettings';
import { useChatStore } from '@/store/chatStore';
import { useCourseStore } from '@/store/courseStore';

export interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isTyping?: boolean;
  attachments?: {
    type: 'image' | 'document' | 'code';
    url: string;
    title?: string;
  }[];
}

interface ChatAssistantProps {
  courseId?: string;
  initialMessages?: Message[];
  className?: string;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  courseId,
  initialMessages = [],
  className = ''
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [language, setLanguage] = useState('en');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { 
    sendMessage, 
    isConnected, 
    connectionStatus 
  } = useWebSocket();
  
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    supported: speechRecognitionSupported
  } = useSpeechRecognition({ language });
  
  const {
    speak,
    speaking,
    cancel,
    supported: textToSpeechSupported
  } = useTextToSpeech({ language });
  
  const { currentCourse } = useCourseStore();
  const { 
    addMessage, 
    getChatHistory,
    clearHistory 
  } = useChatStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

  const handleSendMessage = async (content: string, attachments?: Message['attachments']) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      type: 'user',
      timestamp: new Date(),
      attachments
    };

    setMessages(prev => [...prev, userMessage]);
    addMessage(userMessage);
    setInputValue('');
    setIsTyping(true);

    try {
      // Send message to backend with context
      const context = {
        courseId,
        courseTitle: currentCourse?.title,
        courseContent: currentCourse?.content,
        chatHistory: messages.slice(-5), // Last 5 messages for context
        language
      };

      const response = await sendMessage(content, context);
      
      if (response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: response.content,
          type: 'assistant',
          timestamp: new Date(),
          attachments: response.attachments
        };

        setMessages(prev => [...prev, assistantMessage]);
        addMessage(assistantMessage);

        // Text-to-speech if enabled
        if (isSoundEnabled && response.content) {
          speak(response.content);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        type: 'system',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
    setIsVoiceEnabled(!isVoiceEnabled);
  };

  const handleSoundToggle = () => {
    if (speaking) {
      cancel();
    }
    setIsSoundEnabled(!isSoundEnabled);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const loadChatHistory = async () => {
    try {
      const history = await getChatHistory(courseId);
      if (history.length > 0) {
        setMessages(history);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  useEffect(() => {
    loadChatHistory();
  }, [courseId]);

  return (
    <div className={`flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">AI</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Learning Assistant</h3>
            <p className="text-sm text-gray-500">
              {connectionStatus === 'connected' ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Voice Controls */}
          {speechRecognitionSupported && (
            <button
              onClick={handleVoiceToggle}
              className={`p-2 rounded-lg transition-colors ${
                isVoiceEnabled 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isListening ? 'Stop voice input' : 'Start voice input'}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
          
          {textToSpeechSupported && (
            <button
              onClick={handleSoundToggle}
              className={`p-2 rounded-lg transition-colors ${
                isSoundEnabled 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isSoundEnabled ? 'Disable sound' : 'Enable sound'}
            >
              {isSoundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          )}
          
          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <ChatSettings
          language={language}
          onLanguageChange={setLanguage}
          onClose={() => setShowSettings(false)}
          onClearHistory={() => {
            clearHistory(courseId);
            setMessages([]);
          }}
        />
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">AI</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome to your Learning Assistant!
            </h4>
            <p className="text-gray-600 max-w-sm mx-auto">
              I'm here to help you with your coursework, answer questions, and provide personalized study guidance.
            </p>
            {currentCourse && (
              <p className="text-sm text-blue-600 mt-2">
                Currently helping with: {currentCourse.title}
              </p>
            )}
          </div>
        )}
        
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
        {isTyping && <TypingIndicator />}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          onKeyPress={handleKeyPress}
          disabled={!isConnected || isTyping}
          placeholder={
            isListening 
              ? 'Listening...' 
              : isConnected 
                ? 'Ask me anything about your course...' 
                : 'Connecting...'
          }
          isListening={isListening}
          speechRecognitionSupported={speechRecognitionSupported}
          onVoiceToggle={handleVoiceToggle}
        />
        
        {isListening && (
          <div className="mt-2 text-sm text-blue-600 animate-pulse">
            {transcript || 'Listening...'}
          </div>
        )}
      </div>
    </div>
  );
};
