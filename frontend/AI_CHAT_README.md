# AI Learning Assistant Chatbot

An intelligent AI-powered learning assistant that helps students with course content, answers questions, provides study tips, and offers personalized learning guidance.

## 🚀 Features

### Core Functionality
- **Real-time Chat Interface** - Modern, responsive chat UI with typing indicators and message history
- **Voice Input/Output** - Hands-free interaction with speech-to-text and text-to-speech capabilities
- **Context-Aware Responses** - Intelligent responses based on current course content and student progress
- **Multi-Language Support** - Support for 12+ languages including English, Spanish, French, Chinese, and more
- **Course Integration** - Seamless integration with course materials for contextual help

### Advanced Features
- **Proactive Study Reminders** - Automated reminders and motivation messages based on study patterns
- **File Attachments** - Support for sharing images, documents, and code files
- **Message History** - Persistent chat history with search and filtering capabilities
- **Responsive Design** - Optimized for both mobile and desktop devices
- **Real-time Connectivity** - WebSocket-based real-time messaging

## 🛠️ Technical Implementation

### Frontend Architecture
- **React with TypeScript** - Type-safe development with modern React patterns
- **Next.js 14** - Full-stack React framework with App Router
- **TailwindCSS** - Utility-first CSS framework for responsive design
- **Zustand** - Lightweight state management for chat and course data
- **Socket.IO Client** - Real-time WebSocket connections

### Voice Technology
- **Web Speech API** - Browser-native speech recognition and synthesis
- **Speech-to-Text** - Voice input with automatic language detection
- **Text-to-Speech** - Natural-sounding voice output with customizable settings

### AI Integration
- **Context-Aware Responses** - Responses based on course content and student progress
- **Multi-Language Support** - AI responses in student's preferred language
- **Study Pattern Analysis** - Personalized recommendations based on learning behavior

## 📁 Component Structure

```
src/
├── components/Chat/
│   ├── ChatAssistant.tsx          # Main chat interface component
│   ├── ChatMessage.tsx            # Individual message component
│   ├── ChatInput.tsx              # Message input with voice support
│   ├── ChatSettings.tsx           # Settings panel
│   └── TypingIndicator.tsx        # Typing animation component
├── hooks/
│   ├── useWebSocket.ts            # WebSocket connection management
│   ├── useSpeechRecognition.ts    # Speech recognition functionality
│   └── useTextToSpeech.ts         # Text-to-speech functionality
├── store/
│   ├── chatStore.ts               # Chat state management
│   └── courseStore.ts             # Course data management
└── pages/
    └── chat-assistant.tsx         # Demo page for the chat assistant
```

## 🎯 Usage Examples

### Basic Chat
```typescript
import { ChatAssistant } from '@/components/Chat/ChatAssistant';

function MyCoursePage() {
  return (
    <ChatAssistant 
      courseId="course-123"
      className="h-full"
    />
  );
}
```

### Voice Interaction
```typescript
const { isListening, transcript, startListening, stopListening } = useSpeechRecognition({
  language: 'en-US',
  continuous: false,
  interimResults: true
});

// Start voice input
startListening();
```

### Text-to-Speech
```typescript
const { speak, speaking, supported } = useTextToSpeech({
  language: 'en-US',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0
});

// Speak response
if (supported && !speaking) {
  speak("Hello! How can I help you today?");
}
```

## 🔧 Configuration

### Environment Variables
```env
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### WebSocket Setup
The chat assistant uses WebSocket connections for real-time messaging. The server should handle:
- Connection management
- Message routing
- Typing indicators
- Voice data streaming

### Voice API Support
The voice features use Web Speech API, which is supported in:
- Chrome/Edge (full support)
- Safari (limited support)
- Firefox (limited support)

## 🎨 UI/UX Features

### Responsive Design
- **Mobile-First** - Optimized for mobile devices with touch-friendly controls
- **Desktop Enhancement** - Enhanced experience on larger screens
- **Adaptive Layout** - Components adjust to screen size automatically

### Accessibility
- **Keyboard Navigation** - Full keyboard support for all interactions
- **Screen Reader Support** - ARIA labels and semantic HTML
- **Voice Control** - Hands-free operation for accessibility needs

### User Experience
- **Typing Indicators** - Real-time feedback when AI is responding
- **Message Status** - Clear indication of message delivery and read status
- **Error Handling** - Graceful error messages and recovery options

## 🚀 Getting Started

### Installation
```bash
# Install dependencies
npm install zustand socket.io-client

# Start development server
npm run dev
```

### Demo Page
Visit `/chat-assistant` to see the chat assistant in action with:
- Course selection sidebar
- Voice interaction controls
- Settings panel
- Study progress tracking

## 📊 Performance Optimizations

### Message Rendering
- **Virtual Scrolling** - Efficient rendering of large message histories
- **Message Caching** - Local storage for offline access
- **Lazy Loading** - Load messages on demand

### Voice Processing
- **Audio Compression** - Efficient voice data transmission
- **Background Processing** - Non-blocking voice recognition
- **Error Recovery** - Automatic retry on voice API failures

### Real-time Updates
- **Connection Pooling** - Efficient WebSocket connection management
- **Message Queuing** - Handle network interruptions gracefully
- **Auto-reconnection** - Automatic recovery from connection drops

## 🔮 Future Enhancements

### Planned Features
- **AI Model Integration** - Integration with advanced language models
- **Video Calling** - Face-to-face interaction with AI tutor
- **Screen Sharing** - Collaborative problem-solving
- **Advanced Analytics** - Detailed learning analytics and insights

### Technology Roadmap
- **WebRTC Integration** - Real-time video and audio communication
- **PWA Support** - Offline functionality and app-like experience
- **AR/VR Support** - Immersive learning experiences

## 🤝 Contributing

### Development Guidelines
- Follow TypeScript best practices
- Use semantic HTML for accessibility
- Test voice functionality across browsers
- Ensure responsive design on all devices

### Code Style
- Use TailwindCSS for styling
- Follow React hooks patterns
- Implement proper error boundaries
- Add comprehensive TypeScript types

## 📄 License

This feature is part of the StarkEd decentralized education platform, licensed under MIT License.

---

**Note**: This implementation focuses on frontend functionality. Backend integration with AI services and WebSocket server implementation are required for full functionality.
