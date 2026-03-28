# Real-Time Collaboration Classroom

A comprehensive real-time collaboration classroom with video conferencing, interactive whiteboard, and screen sharing capabilities for live learning sessions.

## Features

### ✅ Video Conferencing
- WebRTC-based peer-to-peer video connections
- Support for 10+ participants simultaneously
- Adaptive video quality based on network conditions
- Audio echo cancellation and noise suppression
- Individual mute/unmute controls
- Camera on/off toggle

### ✅ Interactive Whiteboard
- Real-time collaborative drawing
- Multiple drawing tools:
  - Pen for freehand drawing
  - Eraser for corrections
  - Line tool for straight lines
  - Rectangle and circle shapes
  - Text tool for annotations
- Color picker with preset colors
- Adjustable line width (1-20px)
- Clear canvas functionality
- Sub-100ms latency for updates

### ✅ Screen Sharing
- Full screen sharing capability
- Works on all major browsers (Chrome, Firefox, Edge, Safari)
- Automatic fallback when screen sharing stops
- Thumbnail view of other participants during screen share

### ✅ Real-Time Chat
- Instant messaging between participants
- Message history
- Emoji reactions with animations
- Timestamps for all messages

### ✅ Participant Management
- Live participant list
- Role-based permissions (Instructor/Student)
- Instructor capabilities:
  - Kick participants
  - View all participant statuses
- Real-time status indicators:
  - Microphone status
  - Camera status
  - Screen sharing status

### ✅ Responsive Design
- Fully functional on mobile devices
- Adaptive grid layout based on participant count
- Touch-friendly controls
- Optimized for tablets and smartphones

## Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Socket.io Client** - Real-time bidirectional communication
- **WebRTC API** - Peer-to-peer video/audio streaming
- **Canvas API** - Interactive whiteboard rendering
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.io** - WebSocket server
- **TypeScript** - Type-safe backend code

## Architecture

### WebRTC Connection Flow
1. User joins room via Socket.io
2. Socket.io signals new participant to existing peers
3. Existing peers create WebRTC offers
4. New participant responds with answers
5. ICE candidates exchanged for NAT traversal
6. Peer-to-peer media streams established

### Whiteboard Synchronization
1. User draws on local canvas
2. Draw data emitted to Socket.io server
3. Server broadcasts to all room participants
4. Participants render draw data on their canvas
5. Full whiteboard state sent to new joiners

### Screen Sharing Flow
1. User initiates screen share
2. Browser prompts for screen selection
3. Screen stream captured via getDisplayMedia
4. Stream added to WebRTC peer connections
5. Remote peers receive and display screen stream

## File Structure

```
backend/
├── src/
│   ├── services/
│   │   ├── collaborationService.ts      # Socket.io event handlers
│   │   └── initCollaboration.js         # Service initialization
│   ├── controllers/
│   │   └── collaborationRoomController.ts # REST API controllers
│   └── routes/
│       └── collaborationRoutes.ts        # API routes

frontend/
├── src/
│   ├── components/
│   │   └── collaboration/
│   │       ├── CollaborationRoom.tsx     # Main room component
│   │       ├── VideoGrid.tsx             # Video layout manager
│   │       ├── Whiteboard.tsx            # Interactive whiteboard
│   │       ├── ChatPanel.tsx             # Chat interface
│   │       ├── ControlBar.tsx            # Media controls
│   │       └── ParticipantsList.tsx      # Participant management
│   ├── hooks/
│   │   ├── useWebRTC.ts                  # WebRTC connection logic
│   │   └── useWhiteboard.ts              # Whiteboard drawing logic
│   └── app/
│       └── collaboration/
│           └── [roomId]/
│               └── page.tsx              # Room page route
```

## Installation

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Modern browser with WebRTC support

### Backend Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Add to `.env`:
```
PORT=5000
FRONTEND_URL=http://localhost:3000
```

3. Start the backend:
```bash
npm run dev
```

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install socket.io-client
```

2. Configure environment variables:
```bash
cp .env.example .env.local
```

Add to `.env.local`:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

3. Start the frontend:
```bash
npm run dev
```

## Usage

### Joining a Room

Navigate to:
```
http://localhost:3000/collaboration/[roomId]
```

Replace `[roomId]` with any unique room identifier.

### Controls

#### Video Controls
- **Microphone Button**: Toggle audio on/off
- **Camera Button**: Toggle video on/off
- **Screen Share Button**: Start/stop screen sharing
- **Whiteboard Button**: Toggle whiteboard view
- **Leave Button**: Exit the room

#### Whiteboard Tools
- **Pen**: Freehand drawing
- **Eraser**: Remove drawings
- **Line**: Draw straight lines
- **Rectangle**: Draw rectangles
- **Circle**: Draw circles
- **Text**: Add text annotations
- **Color Picker**: Choose drawing color
- **Size Slider**: Adjust line width
- **Clear Button**: Clear entire canvas

#### Chat Features
- Type messages in the input field
- Press Enter to send
- Click emoji button for reactions
- Reactions appear as animated overlays

### Instructor Features

Instructors have additional capabilities:
- Kick participants from the room
- Full control over room management
- Identified with crown icon

## API Endpoints

### REST API

#### Create Room
```
POST /api/collaboration/rooms
Body: {
  "name": "Math Class",
  "courseId": "course_123",
  "scheduledAt": "2026-03-25T10:00:00Z"
}
```

#### Get Room
```
GET /api/collaboration/rooms/:roomId
```

#### List Rooms
```
GET /api/collaboration/rooms?courseId=course_123
```

#### End Room
```
POST /api/collaboration/rooms/:roomId/end
```

### Socket.io Events

#### Client → Server
- `join-room`: Join a collaboration room
- `leave-room`: Leave the room
- `webrtc-offer`: Send WebRTC offer
- `webrtc-answer`: Send WebRTC answer
- `webrtc-ice-candidate`: Send ICE candidate
- `whiteboard-draw`: Send drawing data
- `whiteboard-clear`: Clear whiteboard
- `chat-message`: Send chat message
- `emoji-reaction`: Send emoji reaction
- `toggle-mute`: Toggle microphone
- `toggle-video`: Toggle camera
- `start-screen-share`: Start screen sharing
- `stop-screen-share`: Stop screen sharing
- `kick-participant`: Remove participant (instructor only)

#### Server → Client
- `room-state`: Initial room state
- `participant-joined`: New participant joined
- `participant-left`: Participant left
- `participant-muted`: Participant muted/unmuted
- `participant-video-toggled`: Participant camera toggled
- `screen-share-started`: Screen sharing started
- `screen-share-stopped`: Screen sharing stopped
- `whiteboard-update`: Whiteboard drawing update
- `whiteboard-cleared`: Whiteboard cleared
- `chat-message`: New chat message
- `emoji-reaction`: Emoji reaction
- `kicked-from-room`: User was kicked

## Performance Optimization

### Video Quality
- Adaptive bitrate based on network conditions
- Ideal resolution: 1280x720 @ 30fps
- Automatic quality degradation on poor connections

### Whiteboard Performance
- Canvas rendering optimized for 60fps
- Debounced drawing events
- Efficient state synchronization

### Network Optimization
- WebRTC peer-to-peer reduces server load
- Socket.io binary protocol for efficiency
- Automatic reconnection on disconnect

## Browser Compatibility

| Browser | Video | Screen Share | Whiteboard | Chat |
|---------|-------|--------------|------------|------|
| Chrome 90+ | ✅ | ✅ | ✅ | ✅ |
| Firefox 88+ | ✅ | ✅ | ✅ | ✅ |
| Safari 14+ | ✅ | ✅ | ✅ | ✅ |
| Edge 90+ | ✅ | ✅ | ✅ | ✅ |

## Mobile Support

- Responsive layout adapts to screen size
- Touch-friendly controls
- Mobile camera/microphone access
- Optimized for iOS and Android

## Security Considerations

- HTTPS required for production (WebRTC requirement)
- Room access control via authentication
- Instructor-only administrative actions
- Secure WebSocket connections

## Troubleshooting

### Camera/Microphone Not Working
- Check browser permissions
- Ensure HTTPS in production
- Verify device availability

### Screen Sharing Not Available
- Use supported browser
- Check browser permissions
- Ensure HTTPS in production

### Connection Issues
- Check firewall settings
- Verify STUN/TURN server configuration
- Check network connectivity

### High Latency
- Reduce video quality
- Check network bandwidth
- Minimize participant count

## Future Enhancements

- [ ] Recording functionality
- [ ] Breakout rooms
- [ ] Polls and quizzes during session
- [ ] File sharing
- [ ] Virtual backgrounds
- [ ] Hand raise feature
- [ ] Waiting room
- [ ] Session analytics
- [ ] Cloud recording storage
- [ ] AI-powered transcription

## Testing

Run backend tests:
```bash
cd backend
npm test
```

Run frontend tests:
```bash
cd frontend
npm test
```

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Repository Issues](https://github.com/your-repo/issues)
- Documentation: [Full Docs](https://docs.your-domain.com)

---

Built with ❤️ for StarkEd Education Platform
