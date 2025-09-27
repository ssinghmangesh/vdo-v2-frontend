import { useCallback, useEffect, useRef } from 'react';
import { useCallStore } from '@/store/call-store';
import { useAuthStore } from '@/store/auth-store';
import { useRoomStore } from '@/store/room-store';
import { socketService } from '@/lib/socket';
import { createOfferPeer, createAnswerPeer, setupPeerEvents, destroyPeer } from '@/utils/webrtc';
import type { User } from '@/types';
import SimplePeer from 'simple-peer';

export function usePeer() {
  const { localStream, addPeer, removePeer, setError } = useCallStore();
  const { user: currentUser } = useAuthStore();
  const { currentRoom, addParticipant, removeParticipant } = useRoomStore();
  const peersRef = useRef<Map<string, SimplePeer.Instance>>(new Map());

  /**
   * Initialize call with a peer
   */
  const initiateCall = useCallback(
    (targetUserId: string, targetUser: User) => {
      if (!localStream || !currentUser) {
        setError('No local stream or user available');
        return;
      }

      try {
        const peer = createOfferPeer(localStream);
        peersRef.current.set(targetUserId, peer);

        setupPeerEvents(peer, {
          onSignal: (signal) => {
            socketService.sendCallSignal(targetUserId, signal, currentUser);
          },
          onConnect: () => {
            console.log('Connected to peer:', targetUserId);
          },
          onStream: (stream) => {
            addPeer(targetUserId, peer, targetUser, stream);
          },
          onError: (error) => {
            console.error('Peer error:', error);
            setError(`Connection error: ${error.message}`);
            removePeer(targetUserId);
            peersRef.current.delete(targetUserId);
          },
          onClose: () => {
            console.log('Peer connection closed:', targetUserId);
            removePeer(targetUserId);
            peersRef.current.delete(targetUserId);
          },
        });
      } catch (error) {
        console.error('Failed to initiate call:', error);
        setError('Failed to initiate call');
      }
    },
    [localStream, currentUser, addPeer, removePeer, setError]
  );

  /**
   * Accept incoming call
   */
  const acceptCall = useCallback(
    (fromUserId: string, fromUser: User, signal: any) => {
      if (!localStream || !currentUser) {
        setError('No local stream or user available');
        return;
      }

      try {
        const peer = createAnswerPeer(localStream);
        peersRef.current.set(fromUserId, peer);

        setupPeerEvents(peer, {
          onSignal: (responseSignal) => {
            socketService.acceptCall(fromUserId, responseSignal);
          },
          onConnect: () => {
            console.log('Connected to caller:', fromUserId);
          },
          onStream: (stream) => {
            addPeer(fromUserId, peer, fromUser, stream);
          },
          onError: (error) => {
            console.error('Peer error:', error);
            setError(`Connection error: ${error.message}`);
            removePeer(fromUserId);
            peersRef.current.delete(fromUserId);
          },
          onClose: () => {
            console.log('Peer connection closed:', fromUserId);
            removePeer(fromUserId);
            peersRef.current.delete(fromUserId);
          },
        });

        // Signal the peer with the received signal
        peer.signal(signal);
      } catch (error) {
        console.error('Failed to accept call:', error);
        setError('Failed to accept call');
      }
    },
    [localStream, currentUser, addPeer, removePeer, setError]
  );

  /**
   * Handle call accepted response
   */
  const handleCallAccepted = useCallback((fromUserId: string, signal: any) => {
    const peer = peersRef.current.get(fromUserId);
    if (peer) {
      try {
        peer.signal(signal);
      } catch (error) {
        console.error('Failed to handle call accepted:', error);
        setError('Failed to complete connection');
      }
    }
  }, [setError]);

  /**
   * End call with specific peer
   */
  const endCallWithPeer = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      destroyPeer(peer);
      peersRef.current.delete(peerId);
    }
    removePeer(peerId);
    removeParticipant(peerId);
  }, [removePeer, removeParticipant]);

  /**
   * End all calls
   */
  const endAllCalls = useCallback(() => {
    peersRef.current.forEach((peer, peerId) => {
      destroyPeer(peer);
      removePeer(peerId);
    });
    peersRef.current.clear();

    if (currentRoom?.id) {
      socketService.endCall(currentRoom.id);
    }
  }, [removePeer, currentRoom]);

  /**
   * Add new participant to existing call
   */
  const addNewParticipant = useCallback(
    (newUser: User) => {
      addParticipant(newUser);
      if (localStream && currentUser) {
        initiateCall(newUser.id, newUser);
      }
    },
    [addParticipant, initiateCall, localStream, currentUser]
  );

  /**
   * Handle participant leaving
   */
  const handleParticipantLeft = useCallback((userId: string) => {
    endCallWithPeer(userId);
    removeParticipant(userId);
  }, [endCallWithPeer, removeParticipant]);

  /**
   * Get peer connection status
   */
  const getPeerStatus = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (!peer) return 'disconnected';
    
    // @ts-ignore - accessing private property for status check
    if (peer._pc) {
      // @ts-ignore
      return peer._pc.connectionState;
    }
    
    return peer.connected ? 'connected' : 'connecting';
  }, []);

  /**
   * Update local stream for all peers
   */
  const updateLocalStreamForPeers = useCallback((newStream: MediaStream | null) => {
    peersRef.current.forEach((peer) => {
      if (newStream && peer.addStream) {
        try {
          // Remove old stream tracks
          if (localStream) {
            localStream.getTracks().forEach(track => {
              peer.removeTrack(track, localStream);
            });
          }
          
          // Add new stream tracks
          newStream.getTracks().forEach(track => {
            peer.addTrack(track, newStream);
          });
        } catch (error) {
          console.warn('Failed to update stream for peer:', error);
        }
      }
    });
  }, [localStream]);

  // Setup socket event listeners
  useEffect(() => {
    socketService.on('receive-call', ({ signal, from, user }) => {
      acceptCall(from, user, signal);
    });

    socketService.on('call-accepted', ({ signal, from }) => {
      handleCallAccepted(from, signal);
    });

    socketService.on('user-joined', (user) => {
      addNewParticipant(user);
    });

    socketService.on('user-left', (userId) => {
      handleParticipantLeft(userId);
    });

    socketService.on('call-ended', () => {
      endAllCalls();
    });

    return () => {
      socketService.off('receive-call');
      socketService.off('call-accepted');
      socketService.off('user-joined');
      socketService.off('user-left');
      socketService.off('call-ended');
    };
  }, [acceptCall, handleCallAccepted, addNewParticipant, handleParticipantLeft, endAllCalls]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endAllCalls();
    };
  }, [endAllCalls]);

  // Update peer streams when local stream changes
  useEffect(() => {
    updateLocalStreamForPeers(localStream);
  }, [localStream, updateLocalStreamForPeers]);

  return {
    initiateCall,
    acceptCall,
    endCallWithPeer,
    endAllCalls,
    addNewParticipant,
    getPeerStatus,
    peersCount: peersRef.current.size,
  };
}
