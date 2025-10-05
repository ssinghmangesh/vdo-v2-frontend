import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRoomStore } from '@/store/room-store';
import { useAuthStore } from '@/store/auth-store';
import { useCallStore } from '@/store/call-store';
import { socketService } from '@/lib/socket';
import { generateRoomId } from '@/utils/common';
import type { Room, RoomUserJoined, SocketEvents } from '@/types';

export function useRoom() {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);

  const {
    currentRoom,
    setCurrentRoom,
    updateRoom,
    setError,
    leaveRoom: leaveRoomStore,
    isLoading,
    setIsLoading,
    addParticipant,
    removeParticipant
  } = useRoomStore();
  
  const { user: currentUser } = useAuthStore();
  const { setHost, resetCall } = useCallStore();

  const socketEventHandlers: SocketEvents = useMemo(() => ({
    'room:user-left': (data: {userId: string}) => {
      removeParticipant(data.userId);
    },
    'room:created': (room: Room) => {
      setCurrentRoom(room);
    },
    'room:joined': (room: Room) => {
      setCurrentRoom(room);
      setIsJoining(false);
    },
    'error': (error: { message: string; code?: string }) => {
      console.error('❌ Error:', error);
    },
    'webrtc:offer': (data: { from: string; offer: RTCSessionDescriptionInit; roomId: string }) => {
      console.log('✅ WebRTC offer:', data);
    },
    'webrtc:answer': (data: { from: string; answer: RTCSessionDescriptionInit; roomId: string }) => {
      console.log('✅ WebRTC answer:', data);
    },
    'webrtc:ice-candidate': (data: { from: string; candidate: RTCIceCandidateInit; roomId: string }) => {
      console.log('✅ WebRTC ICE candidate:', data);
    },
    'room:user-joined': (room: RoomUserJoined) => {
      console.log('✅ Room user joined:', room);
      addParticipant(room.user);
    }
  }), [addParticipant, removeParticipant, setCurrentRoom]);

  const connectSocket = useCallback(() => {
    return socketService.connect(process.env.NEXT_PUBLIC_SOCKET_URL, socketEventHandlers);
  }, [socketEventHandlers]);

  /**
   * Create a new room with auto-redirect
   */
  const createRoom = useCallback(
    async (roomData: {
      name: string;
      isPrivate?: boolean;
      maxParticipants?: number;
    }) => {
      if (!currentUser) {
        setError('User not authenticated');
        return null;
      }

      setIsCreating(true);
      setError(null);

      try {
        const roomId = generateRoomId();
        const newRoom: Room = {
          id: roomId,
          name: roomData.name,
          participants: [currentUser],
          createdAt: new Date(),
          hostId: currentUser.id,
          isPrivate: roomData.isPrivate || false,
          maxParticipants: roomData.maxParticipants,
        };

        setIsLoading(true);

        // Create room on server
        socketService.createRoom(newRoom);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to create room';
        setError(errorMsg);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [currentUser, setError, setIsLoading]
  );

  /**
   * Create a new room and return URL for sharing (no auto-redirect)
   */
  const createRoomWithUrl = useCallback(
    async (roomData: {
      name: string;
      isPrivate?: boolean;
      maxParticipants?: number;
    }) => {
      if (!currentUser) {
        setError('User not authenticated');
        return null;
      }

      setIsCreating(true);
      setError(null);

      try {
        const roomId = generateRoomId();
        const newRoom: Room = {
          id: roomId,
          name: roomData.name,
          participants: [currentUser],
          createdAt: new Date(),
          hostId: currentUser.id,
          isPrivate: roomData.isPrivate || false,
          maxParticipants: roomData.maxParticipants,
          status: 'scheduled'
        };
        setIsLoading(true);

        socketService.createRoom(newRoom);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to create room';
        setError(errorMsg);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [currentUser, setError, setIsLoading]
  );

  /**
   * Join an existing room
   */
  const joinRoom = useCallback(
    async (roomId: string) => {
      if (!currentUser) {
        setError('User not authenticated');
        return false;
      }

      setIsJoining(true);
      setError(null);

      try {

        socketService.joinRoom(roomId, currentUser);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to join room';
        setError(errorMsg);
        setIsJoining(false);
        return false;
      }
    },
    [currentUser, setError]
  );

  /**
   * Leave current room
   */
  const leaveRoom = useCallback(() => {
    if (!currentRoom) {
      console.log('⚠️ No current room to leave');
      return;
    }

    try {
      const roomId = currentRoom.roomId || currentRoom.id || '';
      console.log('🚪 Leaving room:', roomId, 'Current room state:', !!currentRoom);
      
      // Set global leaving flag IMMEDIATELY to prevent any auto-rejoin attempts
      window.__LEAVING_ROOM__ = true;
      
      // Reset local state FIRST to prevent auto-rejoin
      leaveRoomStore();
      
      // Navigate immediately to home page
      router.push('/');
      
      // Then clean up server-side and call state (async)
      setTimeout(() => {
        try {
          socketService.leaveRoom(roomId);
          resetCall();
          console.log('✅ Successfully left room and reset state');
        } catch (serverError) {
          console.error('❌ Error leaving room on server:', serverError);
          resetCall();
        }
        // Clear the leaving flag after everything is done
        window.__LEAVING_ROOM__ = false;
      }, 1000); // Longer delay to ensure navigation is complete
      
    } catch (error) {
      console.error('❌ Error leaving room:', error);
      // Set flag even on error
      window.__LEAVING_ROOM__ = true;
      
      // Still reset local state and navigate
      leaveRoomStore();
      router.push('/');
      
      // Clean up in background
      setTimeout(() => {
        resetCall();
        window.__LEAVING_ROOM__ = false;
      }, 1000);
    }
  }, [currentRoom, leaveRoomStore, resetCall, router]);

  /**
   * Update room settings
   */
  const updateRoomSettings = useCallback(
    (settings: Partial<Pick<Room, 'name' | 'isPrivate' | 'maxParticipants'>>) => {
      if (!currentRoom || !currentUser) return;

      // Only host can update room settings
      if (currentRoom.hostId !== currentUser.id) {
        setError('Only the host can update room settings');
        return;
      }

      updateRoom(settings);
      
      // Send update to server
      socketService.emit('update-room', {
        roomId: currentRoom.roomId,
        ...settings,
      });
    },
    [currentRoom, currentUser, updateRoom, setError]
  );

  /**
   * Kick participant (host only)
   */
  const kickParticipant = useCallback(
    (participantId: string) => {
      if (!currentRoom || !currentUser) return;

      // Only host can kick participants
      if (currentRoom.hostId !== currentUser.id) {
        setError('Only the host can kick participants');
        return;
      }

      if (participantId === currentUser.id) {
        setError('Host cannot kick themselves');
        return;
      }

      socketService.emit('kick-participant', {
        roomId: currentRoom.roomId,
        participantId,
      });
    },
    [currentRoom, currentUser, setError]
  );

  /**
   * Transfer host role
   */
  const transferHost = useCallback(
    (newHostId: string) => {
      if (!currentRoom || !currentUser) return;

      // Only current host can transfer host role
      if (currentRoom.hostId !== currentUser.id) {
        setError('Only the host can transfer host role');
        return;
      }

      const newHost = currentRoom.participants.find(p => {
        // Check if it's a Participant or User and compare appropriately
        const participantId = 'userId' in p ? p.userId : p.id;
        return participantId === newHostId;
      });
      if (!newHost) {
        setError('Participant not found');
        return;
      }

      socketService.emit('transfer-host', {
        roomId: currentRoom.roomId,
        newHostId,
      });

      // Update local state
      updateRoom({ hostId: newHostId });
      setHost(false);
    },
    [currentRoom, currentUser, updateRoom, setHost, setError]
  );

  /**
   * Get room sharing URL
   */
  const getRoomShareUrl = useCallback(() => {
    if (!currentRoom) return '';
    
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/join/${currentRoom.roomId}`;
  }, [currentRoom]);

  /**
   * Check if current user is host
   */
  const isHost = useCallback(() => {
    return currentRoom?.hostId === currentUser?.id;
  }, [currentRoom, currentUser]);

  // Connect to socket if not already connected
  useEffect(() => {
    const socket = connectSocket();
    if (!socket.connected) {
      console.log('⏳ Waiting for socket connection...');
      new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Socket connection timeout'));
        }, 10000);

        socket.once('connect', () => {
          clearTimeout(timeout);
          console.log('✅ Socket connected');
          setIsSocketConnected(true);
          resolve();
        });

        socket.once('connect_error', (error) => {
          clearTimeout(timeout);
          console.error('❌ Socket connection failed:', error);
          reject(error);
        });
      }).catch((error) => {
        console.error('❌ Socket connection failed:', error);
      });
    } else if (!isSocketConnected) {
      setIsSocketConnected(true);
    }
  }, [connectSocket, isSocketConnected]);

  return {
    currentRoom,
    isJoining,
    isCreating,
    createRoom,
    createRoomWithUrl,
    joinRoom,
    leaveRoom,
    updateRoomSettings,
    kickParticipant,
    transferHost,
    getRoomShareUrl,
    isHost: isHost(),
    isLoading,
    isSocketConnected
  };
}
