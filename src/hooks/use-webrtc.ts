import { useCallback, useRef, useState, useEffect } from 'react';
import { socketService } from '@/lib/socket';
import { useAuthStore } from '@/store/auth-store';
import { useRoomStore } from '@/store/room-store';
import type { PeerConnection, User } from '@/types';

// WebRTC Configuration
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC() {
  const { user: currentUser } = useAuthStore();
  const { currentRoom } = useRoomStore();
  const [peers, setPeers] = useState<Record<string, PeerConnection>>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Get current user ID helper
  const getCurrentUserId = useCallback(() => {
    return currentUser?.id || '';
  }, [currentUser]);

  // Create a new peer connection
  const createPeerConnection = useCallback((peerId: string, user: User): RTCPeerConnection => {
    console.log('🔗 Creating peer connection for:', peerId);
    
    const peerConnection = new RTCPeerConnection(RTC_CONFIG);
    
    // Add local stream to peer connection
    if (localStreamRef.current) {
      console.log('📤 Adding local stream tracks to peer connection:', peerId);
      console.log('📤 Local stream tracks:', localStreamRef.current.getTracks().map(t => `${t.kind}: ${t.enabled}`));
      
      localStreamRef.current.getTracks().forEach(track => {
        console.log(`📤 Adding ${track.kind} track for peer:`, peerId);
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    } else {
      console.warn('⚠️ No local stream available when creating peer connection for:', peerId);
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && currentRoom) {
        console.log('🧊 Sending ICE candidate to:', peerId);
        socketService.sendWebRTCIceCandidate(
          peerId,
          getCurrentUserId(),
          event.candidate.toJSON(),
          currentRoom.id
        );
      }
    };

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('📹 Received remote stream from:', peerId, 'streams:', event.streams.length);
      const [remoteStream] = event.streams;
      
      if (remoteStream) {
        console.log('📹 Remote stream tracks:', remoteStream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
        
        setPeers(prevPeers => ({
          ...prevPeers,
          [peerId]: {
            peerId,
            peer: peerConnection,
            user,
            stream: remoteStream,
          },
        }));
      } else {
        console.warn('⚠️ No remote stream received in ontrack event');
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`🔗 Connection state for ${peerId}:`, peerConnection.connectionState);
      
      if (peerConnection.connectionState === 'failed') {
        console.error('❌ Peer connection failed for:', peerId);
        // Call removePeer directly to avoid dependency issues
        setPeers(prevPeers => {
          const peerData = prevPeers[peerId];
          
          if (peerData) {
            // Clean up peer connection
            if (peerData.peer instanceof RTCPeerConnection) {
              peerData.peer.close();
            }
            
            // Clean up stream
            if (peerData.stream) {
              peerData.stream.getTracks().forEach(track => track.stop());
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [peerId]: _, ...remaining } = prevPeers;
          return remaining;
        });
      }
    };

    return peerConnection;
  }, [currentRoom, getCurrentUserId]);

  // Create offer to start connection
  const createOffer = useCallback(async (targetUserId: string, targetUser: User) => {
    if (!currentRoom || !currentUser) return;

    console.log('📞 Creating offer for:', targetUserId);
    setIsConnecting(true);

    try {
      const peerConnection = createPeerConnection(targetUserId, targetUser);
      
      // Store peer connection
      setPeers(prevPeers => ({
        ...prevPeers,
        [targetUserId]: {
          peerId: targetUserId,
          peer: peerConnection,
          user: targetUser,
        },
      }));

      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await peerConnection.setLocalDescription(offer);

      socketService.sendWebRTCOffer(
        targetUserId,
        getCurrentUserId(),
        offer,
        currentRoom.id
      );

    } catch (error) {
      console.error('❌ Error creating offer:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [currentRoom, currentUser, createPeerConnection, getCurrentUserId]);

  // Handle incoming offer
  const handleOffer = useCallback(async (data: { 
    from: string; 
    offer: RTCSessionDescriptionInit; 
    roomId: string 
  }) => {
    if (!currentRoom || !currentUser || data.roomId !== currentRoom.id) return;

    console.log('📞 Handling offer from:', data.from);

    try {
      // Find the user in current room participants
      const fromUser = currentRoom.participants.find(p => {
        const participantId = 'userId' in p ? p.userId : p.id;
        return participantId === data.from;
      });

      if (!fromUser) {
        console.error('❌ Offer sender not found in room participants');
        return;
      }

      const userData = 'userId' in fromUser ? fromUser.user : fromUser;
      const peerConnection = createPeerConnection(data.from, userData);

      // Store peer connection
      setPeers(prevPeers => ({
        ...prevPeers,
        [data.from]: {
          peerId: data.from,
          peer: peerConnection,
          user: userData,
        },
      }));

      await peerConnection.setRemoteDescription(data.offer);

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socketService.sendWebRTCAnswer(
        data.from,
        getCurrentUserId(),
        answer,
        currentRoom.id
      );

    } catch (error) {
      console.error('❌ Error handling offer:', error);
    }
  }, [currentRoom, currentUser, createPeerConnection, getCurrentUserId]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (data: { 
    from: string; 
    answer: RTCSessionDescriptionInit; 
    roomId: string 
  }) => {
    if (!currentRoom || data.roomId !== currentRoom.id) return;

    console.log('📞 Handling answer from:', data.from);

    try {
      const peerData = peers[data.from];
      if (peerData && peerData.peer instanceof RTCPeerConnection) {
        await peerData.peer.setRemoteDescription(data.answer);
      }
    } catch (error) {
      console.error('❌ Error handling answer:', error);
    }
  }, [currentRoom, peers]);

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (data: { 
    from: string; 
    candidate: RTCIceCandidateInit; 
    roomId: string 
  }) => {
    if (!currentRoom || data.roomId !== currentRoom.id) return;

    console.log('🧊 Handling ICE candidate from:', data.from);

    try {
      const peerData = peers[data.from];
      if (peerData && peerData.peer instanceof RTCPeerConnection) {
        await peerData.peer.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch (error) {
      console.error('❌ Error handling ICE candidate:', error);
    }
  }, [currentRoom, peers]);

  // Remove peer connection
  const removePeer = useCallback((peerId: string) => {
    console.log('🔌 Removing peer:', peerId);
    
    setPeers(prevPeers => {
      const peerData = prevPeers[peerId];
      
      if (peerData) {
        // Clean up peer connection - check if it's RTCPeerConnection
        const peer = peerData.peer;
        if (peer && typeof peer === 'object' && 'close' in peer && typeof peer.close === 'function') {
          peer.close();
        }
        
        // Clean up stream
        if (peerData.stream) {
          peerData.stream.getTracks().forEach(track => track.stop());
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [peerId]: _removed, ...remaining } = prevPeers;
      return remaining;
    });
  }, []);

  // Set local stream
  const setLocalStream = useCallback((stream: MediaStream | null) => {
    console.log('🎥 Setting local stream in WebRTC hook:', !!stream);
    if (stream) {
      console.log('🎥 Local stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
    }
    
    localStreamRef.current = stream;
    
    // Add tracks to all existing peer connections
    if (stream) {
      console.log('🔄 Adding local stream tracks to existing peer connections:', Object.keys(peers).length);
      Object.values(peers).forEach(peerData => {
        const peer = peerData.peer;
        if (peer instanceof RTCPeerConnection) {
          console.log('📤 Adding tracks to existing peer:', peerData.peerId);
          stream.getTracks().forEach(track => {
            peer.addTrack(track, stream);
          });
        }
      });
    }
  }, [peers]);

  // Connect to all participants in room
  const connectToAllParticipants = useCallback(() => {
    if (!currentRoom || !currentUser) return;

    console.log('🌐 Connecting to all participants in room');
    
    currentRoom.participants.forEach(participant => {
      const participantId = 'userId' in participant ? participant.userId : participant.id;
      const userData = 'userId' in participant ? participant.user : participant;
      
      // Don't connect to yourself
      if (participantId === currentUser.id) return;
      
      // Don't connect if already connected
      if (peers[participantId]) return;
      
      // Create offer to this participant
      createOffer(participantId, userData);
    });
  }, [currentRoom, currentUser, peers, createOffer]);

  // Set up socket event listeners
  useEffect(() => {
    socketService.on('webrtc:offer', handleOffer);
    socketService.on('webrtc:answer', handleAnswer);
    socketService.on('webrtc:ice-candidate', handleIceCandidate);

    return () => {
      socketService.off('webrtc:offer', handleOffer);
      socketService.off('webrtc:answer', handleAnswer);
      socketService.off('webrtc:ice-candidate', handleIceCandidate);
    };
  }, [handleOffer, handleAnswer, handleIceCandidate]);

  // Cleanup all connections on unmount
  useEffect(() => {
    return () => {
      // Cleanup will be handled by each individual peer connection
      // when they're removed from the peers state
    };
  }, []);

  return {
    peers,
    isConnecting,
    setLocalStream,
    connectToAllParticipants,
    createOffer,
    removePeer,
  };
}
