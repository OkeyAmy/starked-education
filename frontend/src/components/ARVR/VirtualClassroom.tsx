'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, GraduationCap, MessageSquare, Video, Mic, MicOff, Share2, Globe, Settings, Book, Award, Clock, Hand } from 'lucide-react';

export type ClassroomLayout = 'lecture' | 'seminar' | 'lab' | 'discussion' | 'presentation';
export type AvatarState = 'idle' | 'listening' | 'speaking' | 'raising-hand' | 'applauding';
export type UserRole = 'instructor' | 'student' | 'assistant' | 'visitor';

interface UserAvatar {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  state: AvatarState;
  isActive: boolean;
  isMuted: boolean;
  handRaised: boolean;
  skinTone: string;
  hairColor: string;
  clothingColor: string;
  accessories: string[];
  animations: string[];
}

interface ClassroomEnvironment {
  layout: ClassroomLayout;
  capacity: number;
  scene: string;
  lighting: {
    ambient: number;
    directional: number;
    point: number;
    shadows: boolean;
  };
  environment: {
    skybox?: string;
    ground: string;
    walls: string;
    ceiling: string;
  };
  furniture: {
    desks: Array<{
      id: string;
      position: { x: number; y: number; z: number };
      occupied: boolean;
    }>;
    podium: {
      position: { x: number; y: number; z: number };
    };
    whiteboard: {
      position: { x: number; y: number; z: number };
      size: { width: number; height: number };
    };
  };
}

interface ClassroomSession {
  id: string;
  title: string;
  description: string;
  instructor: UserAvatar;
  students: UserAvatar[];
  environment: ClassroomEnvironment;
  startTime: number;
  endTime?: number;
  isRecording: boolean;
  isActive: boolean;
  currentActivity: string;
  tools: string[];
}

interface VirtualClassroomProps {
  session: ClassroomSession;
  onUserJoin?: (user: UserAvatar) => void;
  onUserLeave?: (userId: string) => void;
  onUserSpeak?: (userId: string, isSpeaking: boolean) => void;
  onHandRaised?: (userId: string, isRaised: boolean) => void;
  onActivityChange?: (activity: string) => void;
  enableVoiceChat?: boolean;
  enableVideoChat?: boolean;
  enableScreenShare?: boolean;
  enableRecording?: boolean;
  showControls?: boolean;
  maxParticipants?: number;
}

export function VirtualClassroom({
  session,
  onUserJoin,
  onUserLeave,
  onUserSpeak,
  onHandRaised,
  onActivityChange,
  enableVoiceChat = true,
  enableVideoChat = true,
  enableScreenShare = true,
  enableRecording = false,
  showControls = true,
  maxParticipants = 50
}: VirtualClassroomProps) {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [currentActivity, setCurrentActivity] = useState(session.currentActivity);
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    userId: string;
    userName: string;
    message: string;
    timestamp: number;
    type: 'text' | 'system';
  }>>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const recordingRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize media streams
  useEffect(() => {
    if (enableVoiceChat || enableVideoChat) {
      initializeMediaStreams();
    }
    
    return () => {
      cleanupMediaStreams();
    };
  }, [enableVoiceChat, enableVideoChat]);

  // Initialize media streams
  const initializeMediaStreams = async () => {
    try {
      const constraints = {
        video: enableVideoChat ? {
          width: 1280,
          height: 720,
          facingMode: 'user'
        } : false,
        audio: enableVoiceChat ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      
      console.log('Media streams initialized successfully');
    } catch (error) {
      console.error('Failed to initialize media streams:', error);
    }
  };

  // Cleanup media streams
  const cleanupMediaStreams = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (recordingRef.current && recordingRef.current.state === 'recording') {
      recordingRef.current.stop();
    }
  };

  // Start recording
  const startRecording = useCallback(async () => {
    if (!localStreamRef.current) return;

    try {
      const recorder = new MediaRecorder(localStreamRef.current, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });
      
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Handle recording completion
        console.log('Recording completed:', url);
      };
      
      recordingRef.current = recorder;
      recorder.start();
      
      // Start recording timer
      const startTime = Date.now();
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (recordingRef.current && recordingRef.current.state === 'recording') {
      recordingRef.current.stop();
    }
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    
    setRecordingTime(0);
    console.log('Recording stopped');
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    setIsAudioEnabled(prev => !prev);
    
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isAudioEnabled;
      });
    }
  }, [isAudioEnabled]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    setIsVideoEnabled(prev => !prev);
    
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
    }
  }, [isVideoEnabled]);

  // Toggle screen sharing
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack && videoTrack.label.startsWith('screen')) {
          videoTrack.stop();
        }
      }
      setIsScreenSharing(false);
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always'
          },
          audio: false
        });
        
        // Replace video track in local stream
        if (localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          if (videoTrack) {
            localStreamRef.current.removeTrack(videoTrack);
          }
          
          screenStream.getVideoTracks().forEach(track => {
            localStreamRef.current?.addTrack(track);
          });
        }
        
        setIsScreenSharing(true);
      } catch (error) {
        console.error('Failed to start screen sharing:', error);
      }
    }
  }, [isScreenSharing, localStreamRef]);

  // Send chat message
  const sendChatMessage = useCallback((message: string) => {
      const chatMessage = {
        id: Date.now().toString(),
        userId: 'local-user',
        userName: 'You',
        message,
        timestamp: Date.now(),
        type: 'text'
      };
      
      setChatMessages(prev => [...prev, chatMessage]);
      
      // In production, this would send to other participants
      console.log('Chat message sent:', chatMessage);
  }, []);

  // Handle user hand raise
  const handleHandRaise = useCallback((userId: string, isRaised: boolean) => {
    const updatedStudents = session.students.map(student => 
      student.id === userId ? { ...student, handRaised: isRaised } : student
    );
    
    // Update session
    const updatedSession = { ...session, students: updatedStudents };
    
    // Notify parent component
    onHandRaised?.(userId, isRaised);
    
    console.log(`User ${userId} ${isRaised ? 'raised' : 'lowered'} hand`);
  }, [session.students, onHandRaised]);

  // Update avatar state
  const updateAvatarState = useCallback((userId: string, state: AvatarState) => {
    const updatedStudents = session.students.map(student => 
      student.id === userId ? { ...student, state } : student
    );
    
    const updatedSession = { ...session, students: updatedStudents };
    
    // Notify parent component
    onUserSpeak?.(userId, state === 'speaking');
  }, [session.students, onUserSpeak]);

  // Get avatar icon based on state
  const getAvatarIcon = (state: AvatarState) => {
    const icons = {
      'idle': Users,
      'listening': Users,
      'speaking': MessageSquare,
      'raising-hand': Hand,
      'applauding': Award
    };
    return icons[state] || Users;
  };

  // Get avatar color based on state
  const getAvatarColor = (state: AvatarState) => {
    const colors = {
      'idle': 'text-gray-400',
      'listening': 'text-blue-400',
      'speaking': 'text-green-400',
      'raising-hand': 'text-yellow-400',
      'applauding': 'text-purple-400'
    };
    return colors[state] || 'text-gray-400';
  };

  // Get role icon
  const getRoleIcon = (role: UserRole) => {
    const icons = {
      'instructor': GraduationCap,
      'student': Book,
      'assistant': Users,
      'visitor': Globe
    };
    return icons[role] || Users;
  };

  // Get role color
  const getRoleColor = (role: UserRole) => {
    const colors = {
      'instructor': 'text-purple-400',
      'student': 'text-blue-400',
      'assistant': 'text-green-400',
      'visitor': 'text-gray-400'
    };
    return colors[role] || 'text-gray-400';
  };

  // Format recording time
  const formatRecordingTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg overflow-hidden">
      {/* Virtual Classroom Scene */}
      <div className="absolute inset-0">
        {/* Skybox */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400 to-sky-600">
          <div className="absolute inset-0 bg-black/10"></div>
        </div>
        
        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-800 to-gray-700">
          <div className="absolute inset-0 bg-gray-900/20"></div>
        </div>
        
        {/* Classroom Furniture */}
        <div className="absolute inset-0">
          {/* Podium */}
          <div 
            className="absolute bottom-32 left-1/2 transform -translate-x-1/2 w-32 h-16 bg-gradient-to-r from-amber-700 to-amber-800 rounded-t-lg shadow-2xl"
            style={{
              perspective: '1000px',
              transform: 'rotateX(-10deg)'
            }}
          >
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-center">
              <GraduationCap className="h-8 w-8 text-amber-200 mx-auto mb-1" />
              <div className="text-amber-200 text-sm font-bold">Instructor Podium</div>
            </div>
          </div>
          
          {/* Student Desks */}
          {session.students.slice(0, 8).map((student, index) => (
            <div
              key={student.id}
              className="absolute"
              style={{
                bottom: '8rem',
                left: `${(index * 10 + 5)}%`,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="relative">
                {/* Desk */}
                <div className="w-16 h-12 bg-gradient-to-b from-amber-600 to-amber-700 rounded-t-lg shadow-lg">
                  {/* Avatar */}
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      {student.avatarUrl ? (
                        <img 
                          src={student.avatarUrl} 
                          alt={student.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                          <Users className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    
                    {/* State Indicator */}
                    <div className={`absolute -top-2 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full ${getAvatarColor(student.state)} animate-pulse`}>
                      {(() => {
                        const IconComponent = getAvatarIcon(student.state);
                        return <IconComponent className="h-2 w-2" />;
                      })()}
                    </div>
                    
                    {/* Hand Raised Indicator */}
                    {student.handRaised && (
                      <div className="absolute -top-2 right-0 w-2 h-2 rounded-full bg-yellow-500 animate-pulse">
                        <Hand className="h-2 w-2 text-white" />
                      </div>
                    )}
                    
                    {/* Name Tag */}
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded px-2 py-1 min-w-max">
                      <div className="text-white text-xs font-medium truncate">{student.name}</div>
                      <div className="text-gray-300 text-xs capitalize">{student.role}</div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Overflow indicator */}
              {session.students.length > 8 && (
                <div className="absolute right-2 bottom-8 bg-black/60 backdrop-blur-sm rounded px-2 py-1">
                  <span className="text-white text-xs">+{session.students.length - 8} more</span>
                </div>
              )}
            </div>
          ))}
          
          {/* Whiteboard */}
          <div 
            className="absolute top-20 left-1/2 transform -translate-x-1/2 w-96 h-64 bg-white rounded-lg shadow-2xl"
            style={{
              perspective: '1000px',
              transform: 'rotateX(-5deg)'
            }}
          >
            <div className="p-4 h-full flex items-center justify-center">
              <div className="text-center">
                <Book className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <div className="text-gray-600 text-sm">Interactive Whiteboard</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructor Avatar */}
      {session.instructor && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2">
          <div className="relative">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-xl">
              {session.instructor.avatarUrl ? (
                <img 
                  src={session.instructor.avatarUrl} 
                  alt={session.instructor.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
              )}
            </div>
            
            {/* State Indicator */}
            <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full ${getAvatarColor(session.instructor.state)} animate-pulse`}>
              {(() => {
                const IconComponent = getAvatarIcon(session.instructor.state);
                return <IconComponent className="h-3 w-3" />;
              })()}
            </div>
            
            {/* Name Tag */}
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 min-w-max">
              <div className="text-white text-sm font-medium truncate">{session.instructor.name}</div>
              <div className="text-purple-300 text-xs capitalize">{session.instructor.role}</div>
            </div>
          </div>
        </div>
      )}

      {/* Control Panel */}
      {showControls && (
        <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md rounded-lg p-4 border border-blue-500/30">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="h-5 w-5 text-blue-400" />
            <h3 className="text-white font-semibold">Virtual Classroom</h3>
          </div>

          {/* Session Info */}
          <div className="mb-4">
            <div className="text-white text-sm font-medium mb-1">{session.title}</div>
            <div className="text-gray-400 text-xs mb-2">{session.description}</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400">Layout:</span>
              <span className="text-blue-300 capitalize">{session.environment.layout}</span>
              <span className="text-gray-400">•</span>
              <span className="text-green-300">{session.students.length}/{session.environment.capacity}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400">Activity:</span>
              <span className="text-purple-300">{currentActivity}</span>
            </div>
          </div>

          {/* Media Controls */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={toggleAudio}
                className={`p-2 rounded transition-colors ${
                  isAudioEnabled 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </button>
              <button
                onClick={toggleVideo}
                className={`p-2 rounded transition-colors ${
                  isVideoEnabled 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                <Video className="h-4 w-4" />
              </button>
              <button
                onClick={toggleScreenShare}
                className={`p-2 rounded transition-colors ${
                  isScreenSharing 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
            
            {enableRecording && (
              <div className="flex items-center gap-2">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-2 rounded transition-colors ${
                    isRecording 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  <div className="h-4 w-4 flex items-center justify-center">
                    {isRecording && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                    <MessageSquare className="h-4 w-4" />
                  </div>
                </button>
                <span className="text-white text-sm">
                  {isRecording ? formatRecordingTime(recordingTime) : 'Record'}
                </span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="w-full px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <Users className="h-4 w-4" />
              Participants ({session.students.length})
            </button>
            
            <button
              onClick={() => setShowChat(!showChat)}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Chat ({chatMessages.length})
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-full px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>
        </div>
      )}

      {/* Participants Panel */}
      <AnimatePresence>
        {showParticipants && (
          <motion.div
            className="absolute top-20 left-4 bg-black/80 backdrop-blur-md rounded-lg p-4 border border-purple-500/30 max-w-xs max-h-64 overflow-y-auto"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Participants</h3>
              <button
                onClick={() => setShowParticipants(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2">
              {/* Instructor */}
              <div className="flex items-center gap-3 p-2 bg-purple-900/20 rounded border border-purple-500/30">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                  {session.instructor.avatarUrl ? (
                    <img 
                      src={session.instructor.avatarUrl} 
                      alt={session.instructor.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <GraduationCap className="h-4 w-4 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">{session.instructor.name}</div>
                  <div className="text-purple-300 text-xs capitalize">{session.instructor.role}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${getAvatarColor(session.instructor.state)}`}>
                      {(() => {
                        const IconComponent = getAvatarIcon(session.instructor.state);
                        return <IconComponent className="h-2 w-2" />;
                      })()}
                    </div>
                    <span className="text-xs text-gray-300">{session.instructor.state}</span>
                  </div>
                </div>
              </div>
              
              {/* Students */}
              {session.students.map((student) => {
                const IconComponent = getAvatarIcon(student.state);
                return (
                  <div key={student.id} className="flex items-center gap-3 p-2 bg-blue-900/20 rounded border border-blue-500/30">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      {student.avatarUrl ? (
                        <img 
                          src={student.avatarUrl} 
                          alt={student.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Users className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{student.name}</div>
                      <div className="text-blue-300 text-xs capitalize">{student.role}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${getAvatarColor(student.state)}`}>
                          <IconComponent className="h-2 w-2" />
                        </div>
                        <span className="text-xs text-gray-300">{student.state}</span>
                      </div>
                      {student.handRaised && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse">
                            <Hand className="h-2 w-2 text-white" />
                          </div>
                          <span className="text-xs text-yellow-300">Hand Raised</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            className="absolute bottom-20 left-4 bg-black/80 backdrop-blur-md rounded-lg p-4 border border-blue-500/30 max-w-sm max-h-64 overflow-y-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Class Chat</h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {chatMessages.slice(-10).map((message) => (
                <div key={message.id} className="p-2 bg-blue-900/20 rounded border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
                      <Users className="h-3 w-3 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{message.userName}</div>
                      <div className="text-gray-300 text-xs">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-white text-sm">{message.message}</div>
                </div>
              ))}
            </div>
            
            {/* Chat Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-black/50 border border-gray-500/30 rounded text-white text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    sendChatMessage(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <button
                onClick={() => sendChatMessage('Hello everyone! 👋')}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
          className="absolute bottom-20 right-4 bg-black/80 backdrop-blur-md rounded-lg p-4 border border-gray-500/30 w-80"
          initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <h3 className="text-white font-semibold mb-4">Classroom Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Max Participants</label>
                <input
                  type="number"
                  min="1"
                  max={100}
                  value={maxParticipants}
                  onChange={(e) => {
                    // Update max participants
                    console.log('Max participants:', e.target.value);
                  }}
                  className="w-full mt-1 p-2 bg-black/50 border border-gray-500/30 rounded text-white"
                />
              </div>
              
              <div>
                <label className="text-gray-400 text-sm">Classroom Layout</label>
                <select className="w-full mt-1 p-2 bg-black/50 border border-gray-500/30 rounded text-white">
                  <option value="lecture">Lecture Hall</option>
                  <option value="seminar">Seminar Room</option>
                  <option value="lab">Laboratory</option>
                  <option value="discussion">Discussion Circle</option>
                  <option value="presentation">Presentation Room</option>
                </select>
              </div>
              
              <div>
                <label className="text-gray-400 text-sm">Scene Theme</label>
                <select className="w-full mt-1 p-2 bg-black/50 border border-gray-500/30 rounded text-white">
                  <option value="modern">Modern Classroom</option>
                  <option value="traditional">Traditional Classroom</option>
                  <option value="outdoor">Outdoor Learning Space</option>
                  <option value="virtual">Virtual Environment</option>
                </select>
              </div>
              
              <div>
                <label className="text-gray-400 text-sm">Lighting</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={session.environment.lighting.ambient * 100}
                  onChange={(e) => {
                    // Update lighting
                    console.log('Ambient lighting:', e.target.value);
                  }}
                  className="w-full mt-1"
                />
                <div className="text-right text-gray-500 text-xs">
                  {Math.round(session.environment.lighting.ambient * 100)}%
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    defaultChecked={enableVoiceChat}
                    onChange={(e) => {
                      // Toggle voice chat
                      console.log('Voice chat:', e.target.checked);
                    }}
                    className="rounded"
                  />
                  <span className="text-gray-400 text-sm">Enable Voice Chat</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    defaultChecked={enableVideoChat}
                    onChange={(e) => {
                      // Toggle video chat
                      console.log('Video chat:', e.target.checked);
                    }}
                    className="rounded"
                  />
                  <span className="text-gray-400 text-sm">Enable Video Chat</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    defaultChecked={enableScreenShare}
                    onChange={(e) => {
                      // Toggle screen sharing
                      console.log('Screen sharing:', e.target.checked);
                    }}
                    className="rounded"
                  />
                  <span className="text-gray-400 text-sm">Enable Screen Share</span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500/20 backdrop-blur-sm rounded-lg p-3 border border-red-500/50">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 text-sm font-medium">Recording Session</span>
            <span className="text-red-300 text-sm">{formatRecordingTime(recordingTime)}</span>
          </div>
        </div>
      )}

      {/* Current Activity Display */}
      <div className="absolute top-20 right-4 bg-black/80 backdrop-blur-md rounded-lg p-4 border border-green-500/30 max-w-xs">
        <div className="flex items-center gap-3 mb-3">
          <Clock className="h-5 w-5 text-green-400" />
          <h3 className="text-white font-semibold">Current Activity</h3>
        </div>
        
        <div className="text-white text-sm font-medium mb-2">{currentActivity}</div>
        
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Duration:</span>
            <span className="text-green-300">
              {Math.floor((Date.now() - session.startTime) / 60000)}m
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Participants:</span>
            <span className="text-blue-300">
              {session.students.length}/{session.environment.capacity}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Mode:</span>
            <span className="text-purple-300 capitalize">
              {session.environment.layout}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
