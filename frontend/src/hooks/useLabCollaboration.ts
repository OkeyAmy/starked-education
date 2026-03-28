'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LabCollaborationMessage, LabExperimentSnapshot } from '../types/lab';

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

type CollaborationMode = 'offline' | 'broadcast' | 'webrtc-host' | 'webrtc-join';

interface UseLabCollaborationOptions {
  roomId?: string;
}

export function useLabCollaboration({ roomId }: UseLabCollaborationOptions = {}) {
  const [mode, setMode] = useState<CollaborationMode>('offline');
  const [peerCount, setPeerCount] = useState(0);
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const [localId] = useState(() => uid('lab_user'));

  const channelRef = useRef<BroadcastChannel | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  const [pendingOffer, setPendingOffer] = useState('');
  const [pendingAnswer, setPendingAnswer] = useState('');
  const [remoteOfferInput, setRemoteOfferInput] = useState('');
  const [remoteAnswerInput, setRemoteAnswerInput] = useState('');

  const roomKey = useMemo(() => roomId?.trim() || 'default', [roomId]);

  const broadcast = useCallback((message: LabCollaborationMessage) => {
    if (channelRef.current) {
      channelRef.current.postMessage({ senderId: localId, message });
      setLastMessageAt(Date.now());
    }

    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({ senderId: localId, message }));
      setLastMessageAt(Date.now());
    }
  }, [localId]);

  const connectBroadcast = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.close();
    }

    const channel = new BroadcastChannel(`starked_lab_${roomKey}`);
    channelRef.current = channel;
    setMode('broadcast');

    channel.postMessage({ senderId: localId, message: { type: 'presence', payload: { status: 'join', userId: localId } } });

    return channel;
  }, [localId, roomKey]);

  const disconnectBroadcast = useCallback(() => {
    channelRef.current?.close();
    channelRef.current = null;
    if (mode === 'broadcast') {
      setMode('offline');
    }
  }, [mode]);

  const createPeer = useCallback(() => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      if (state === 'connected') {
        setPeerCount(1);
      }
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        setPeerCount(0);
      }
    };

    peer.ondatachannel = (event) => {
      dataChannelRef.current = event.channel;
      dataChannelRef.current.onmessage = (messageEvent) => {
        setLastMessageAt(Date.now());
        const parsed = safeJsonParse(String(messageEvent.data)) as any;
        if (parsed?.message?.type === 'presence') {
          setPeerCount(1);
        }
      };

      dataChannelRef.current.onopen = () => {
        broadcast({ type: 'presence', payload: { status: 'join', userId: localId } });
      };

      dataChannelRef.current.onclose = () => {
        setPeerCount(0);
      };
    };

    peerRef.current = peer;
    return peer;
  }, [broadcast, localId]);

  const closePeer = useCallback(() => {
    dataChannelRef.current?.close();
    dataChannelRef.current = null;

    peerRef.current?.close();
    peerRef.current = null;

    setPendingOffer('');
    setPendingAnswer('');
    setRemoteOfferInput('');
    setRemoteAnswerInput('');
    setPeerCount(0);

    if (mode === 'webrtc-host' || mode === 'webrtc-join') {
      setMode('offline');
    }
  }, [mode]);

  const host = useCallback(async () => {
    closePeer();
    const peer = createPeer();
    const dc = peer.createDataChannel('lab');
    dataChannelRef.current = dc;

    dc.onmessage = () => {
      setLastMessageAt(Date.now());
      setPeerCount(1);
    };

    dc.onopen = () => {
      setPeerCount(1);
      broadcast({ type: 'presence', payload: { status: 'join', userId: localId } });
    };

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    await new Promise<void>((resolve) => {
      if (!peer.localDescription) {
        resolve();
        return;
      }

      const check = () => {
        if (peer.iceGatheringState === 'complete') {
          resolve();
        } else {
          setTimeout(check, 250);
        }
      };
      check();
    });

    const finalOffer = peer.localDescription;
    setPendingOffer(finalOffer ? JSON.stringify(finalOffer) : '');
    setMode('webrtc-host');
  }, [broadcast, closePeer, createPeer, localId]);

  const acceptAnswer = useCallback(async () => {
    const peer = peerRef.current;
    if (!peer) return;
    const parsed = safeJsonParse(remoteAnswerInput) as RTCSessionDescriptionInit | null;
    if (!parsed) return;
    await peer.setRemoteDescription(new RTCSessionDescription(parsed));
  }, [remoteAnswerInput]);

  const join = useCallback(async () => {
    closePeer();
    const peer = createPeer();

    const parsedOffer = safeJsonParse(remoteOfferInput) as RTCSessionDescriptionInit | null;
    if (!parsedOffer) return;

    await peer.setRemoteDescription(new RTCSessionDescription(parsedOffer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    await new Promise<void>((resolve) => {
      const check = () => {
        if (peer.iceGatheringState === 'complete') {
          resolve();
        } else {
          setTimeout(check, 250);
        }
      };
      check();
    });

    const finalAnswer = peer.localDescription;
    setPendingAnswer(finalAnswer ? JSON.stringify(finalAnswer) : '');
    setMode('webrtc-join');
  }, [closePeer, createPeer, remoteOfferInput]);

  const onMessage = useCallback((handler: (message: LabCollaborationMessage) => void) => {
    const channel = channelRef.current;

    const listener = (event: MessageEvent) => {
      const data = event.data as any;
      if (data?.senderId === localId) return;
      if (data?.message) {
        handler(data.message as LabCollaborationMessage);
        setLastMessageAt(Date.now());
      }
    };

    channel?.addEventListener('message', listener);

    const dc = dataChannelRef.current;
    const dcListener = (event: MessageEvent) => {
      const parsed = safeJsonParse(String((event as any).data)) as any;
      if (parsed?.senderId === localId) return;
      if (parsed?.message) {
        handler(parsed.message as LabCollaborationMessage);
        setLastMessageAt(Date.now());
      }
    };

    dc?.addEventListener('message', dcListener as any);

    return () => {
      channel?.removeEventListener('message', listener);
      dc?.removeEventListener('message', dcListener as any);
    };
  }, [localId]);

  const sendState = useCallback((snapshot: LabExperimentSnapshot) => {
    broadcast({ type: 'state', payload: { snapshot } });
  }, [broadcast]);

  const sendEvent = useCallback((event: Record<string, unknown>) => {
    broadcast({ type: 'event', payload: event });
  }, [broadcast]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const channel = connectBroadcast();
    return () => {
      channel.postMessage({ senderId: localId, message: { type: 'presence', payload: { status: 'leave', userId: localId } } });
      disconnectBroadcast();
    };
  }, [connectBroadcast, disconnectBroadcast, localId, roomId]);

  return {
    mode,
    localId,
    peerCount,
    lastMessageAt,
    connectBroadcast,
    disconnectBroadcast,
    host,
    join,
    closePeer,
    pendingOffer,
    pendingAnswer,
    remoteOfferInput,
    remoteAnswerInput,
    setRemoteOfferInput,
    setRemoteAnswerInput,
    acceptAnswer,
    onMessage,
    sendState,
    sendEvent
  };
}
