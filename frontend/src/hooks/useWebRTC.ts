import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface PeerConnection {
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const useWebRTC = (socket: Socket | null, roomId: string, localStream: MediaStream | null) => {
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());

  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // Add local stream tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => new Map(prev).set(peerId, remoteStream));
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc-ice-candidate', {
          roomId,
          targetId: peerId,
          candidate: event.candidate
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'disconnected' || 
          peerConnection.connectionState === 'failed') {
        removePeer(peerId);
      }
    };

    return peerConnection;
  }, [localStream, socket, roomId]);

  const createOffer = useCallback(async (peerId: string) => {
    try {
      const peerConnection = createPeerConnection(peerId);
      peersRef.current.set(peerId, { connection: peerConnection });
      setPeers(new Map(peersRef.current));

      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await peerConnection.setLocalDescription(offer);

      if (socket) {
        socket.emit('webrtc-offer', {
          roomId,
          targetId: peerId,
          offer
        });
      }
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }, [createPeerConnection, socket, roomId]);

  const handleOffer = useCallback(async (senderId: string, offer: RTCSessionDescriptionInit) => {
    try {
      const peerConnection = createPeerConnection(senderId);
      peersRef.current.set(senderId, { connection: peerConnection });
      setPeers(new Map(peersRef.current));

      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      if (socket) {
        socket.emit('webrtc-answer', {
          roomId,
          targetId: senderId,
          answer
        });
      }
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }, [createPeerConnection, socket, roomId]);

  const handleAnswer = useCallback(async (senderId: string, answer: RTCSessionDescriptionInit) => {
    try {
      const peer = peersRef.current.get(senderId);
      if (peer) {
        await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }, []);

  const handleICECandidate = useCallback(async (senderId: string, candidate: RTCIceCandidateInit) => {
    try {
      const peer = peersRef.current.get(senderId);
      if (peer) {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }, []);

  const removePeer = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      peer.connection.close();
      peersRef.current.delete(peerId);
      setPeers(new Map(peersRef.current));
      
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.delete(peerId);
        return newStreams;
      });
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('webrtc-offer', ({ senderId, offer }) => {
      handleOffer(senderId, offer);
    });

    socket.on('webrtc-answer', ({ senderId, answer }) => {
      handleAnswer(senderId, answer);
    });

    socket.on('webrtc-ice-candidate', ({ senderId, candidate }) => {
      handleICECandidate(senderId, candidate);
    });

    socket.on('participant-joined', (participant) => {
      createOffer(participant.id);
    });

    socket.on('participant-left', ({ participantId }) => {
      removePeer(participantId);
    });

    return () => {
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      socket.off('participant-joined');
      socket.off('participant-left');
    };
  }, [socket, handleOffer, handleAnswer, handleICECandidate, createOffer, removePeer]);

  return {
    peers,
    remoteStreams,
    createOffer,
    removePeer
  };
};
