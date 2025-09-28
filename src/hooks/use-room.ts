import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useRoomStore } from '@/store/room-store';
import { useAuthStore } from '@/store/auth-store';
import { useCallStore } from '@/store/call-store';
import { socketService } from '@/lib/socket';
import { generateRoomId } from '@/utils/common';
import type { Participant, Room, RoomUserJoined, SocketEvents, User, WebRTCSignal } from '@/types';

export function useRoom() {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const {
    currentRoom,
    setCurrentRoom,
    updateRoom,
    setError,
    leaveRoom: leaveRoomStore,
    isLoading,
    setIsLoading
  } = useRoomStore();
  
  const { user: currentUser } = useAuthStore();
  const { setHost, resetCall } = useCallStore();

  const socketEventHandlers: SocketEvents = useMemo(() => ({
    'user-joined': (user: User) => {
      console.log('✅ User joined:', user);
    },
    'user-left': (userId: string) => {
      console.log('✅ User left:', userId);
    },
    'receive-call': (data: { signal: WebRTCSignal; from: string; user: User }) => {
      console.log('✅ Receive call:', data);
    },
    'call-accepted': (data: { signal: WebRTCSignal; from: string }) => {
      console.log('✅ Call accepted:', data);
    },
    'call-ended': () => {
      console.log('✅ Call ended');
    },
    'room-update': (room: Room) => {
      console.log('✅ Room updated:', room);
    },
    'room:created': (room: Room) => {
      console.log('✅ Room created:', room);
    },
    'participant-kicked': (participantId: string) => {
      console.log('✅ Participant kicked:', participantId);
    },
    'host-transferred': (data: { newHostId: string; newHost: User }) => {
      console.log('✅ Host transferred:', data);
    },
    'room:joined': (room: Room) => {
      console.log('✅ Room joined successfully:', room);
      updateRoom(room);
    },
    'error': (error: { message: string; code?: string }) => {
      console.error('❌ Error:', error);
    },
    'room:user-joined': (room: RoomUserJoined) => {
      console.log('✅ Room user joined:', room);
      // Convert to Participant[] when needed
      if (currentRoom) {
        // Convert existing participants to Participant type if they're Users
        const convertedParticipants: Participant[] = currentRoom.participants.map(p => {
          if ('userId' in p) {
            // Already a Participant
            return p as Participant;
          } else {
            // Convert User to Participant
            return {
              peerId: `peer_${p.id}`,
              userId: p.id,
              user: p as User,
              mediaState: {
                videoEnabled: true,
                audioEnabled: true,
                screenShareEnabled: false,
              },
              isConnected: true,
              joinedAt: new Date(),
            } as Participant;
          }
        });
        
        // Filter out the user that's joining and add the new participant
        const filteredParticipants = convertedParticipants.filter(p => p.userId !== room.user.id);
        updateRoom({ participants: [...filteredParticipants, room.participant] });
      }
    }
  }), [currentRoom, updateRoom]);

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

        // Connect to socket if not already connected
        const socket = connectSocket();
        if (!socket.connected) {
          await new Promise<void>((resolve) => {
            socket.once('connect', () => resolve());
          });
        }

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
    [currentUser, setError, setIsLoading, connectSocket]
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

        // Connect to socket if not already connected
        const socket = connectSocket();
        if (!socket.connected) {
          console.log('⏳ Waiting for socket connection...');
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Socket connection timeout'));
            }, 10000);

            socket.once('connect', () => {
              clearTimeout(timeout);
              console.log('✅ Socket connected, proceeding with room creation');
              resolve();
            });

            socket.once('connect_error', (error) => {
              clearTimeout(timeout);
              console.error('❌ Socket connection failed:', error);
              reject(error);
            });
          });
        }

        setIsLoading(true);

        // Create room on server and wait for response
        console.log('🚀 Sending room creation request...', { roomId: newRoom.id });
        
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            setError('Room creation timeout');
            setIsLoading(false);
            reject(new Error('Room creation timeout'));
          }, 15000);

          // Listen for room creation success
          const onRoomCreated = (room: Room) => {
            clearTimeout(timeout);
            setCurrentRoom(room);
            setHost(true);
            setIsLoading(false);
            
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            const roomUrl = `${baseUrl}/room/${room.id}`;
            
            // Clean up listeners
            socketService.off('room:created', onRoomCreated);
            socketService.off('error', onError);
            
            resolve({
              room: room,
              url: roomUrl
            });
          };

          // Listen for errors
          const onError = (error: { message: string; code?: string }) => {
            clearTimeout(timeout);
            setError(error.message);
            setIsLoading(false);
            
            // Clean up listeners
            socketService.off('room:created', onRoomCreated);
            socketService.off('error', onError);
          };

          // Register event listeners
          socketService.on('room:created', onRoomCreated);
          socketService.on('error', onError);

          // Send room creation request
          socketService.createRoom(newRoom);
        });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to create room';
        setError(errorMsg);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [currentUser, setError, setIsLoading, setCurrentRoom, setHost, connectSocket]
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
        // Connect to socket if not already connected
        const socket = connectSocket();
        if (!socket.connected) {
          await new Promise<void>((resolve) => {
            socket.once('connect', () => resolve());
          });
        }

        // Join room on server
        socketService.joinRoom(roomId, currentUser);
        setHost(false);

        // Wait for room update from server
        return new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => {
            setError('Failed to join room - timeout');
            setIsJoining(false);
            resolve(false);
          }, 10000);

          socketService.on('room:joined', (room: Room) => {
            clearTimeout(timeout);
            setCurrentRoom(room);
            setIsJoining(false);
            
            // Check if current user is the host
            setHost(room.hostId === currentUser.id);
            
            // Navigate to room
            router.push(`/room/${roomId}`);
            resolve(true);
          });

          socketService.on('error', (error: { message: string; code?: string }) => {
            clearTimeout(timeout);
            setError(error.message);
            setIsJoining(false);
            resolve(false);
          });
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to join room';
        setError(errorMsg);
        setIsJoining(false);
        return false;
      }
    },
    [currentUser, setCurrentRoom, setHost, setError, router, connectSocket]
  );

  /**
   * Leave current room
   */
  const leaveRoom = useCallback(() => {
    if (!currentRoom) return;

    try {
      // Leave room on server
      socketService.leaveRoom(currentRoom.id);
      
      // Reset local state
      leaveRoomStore();
      resetCall();
      
      // Navigate back to home
      router.push('/');
    } catch (error) {
      console.error('Error leaving room:', error);
      // Still reset local state even if server request fails
      leaveRoomStore();
      resetCall();
      router.push('/');
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
        roomId: currentRoom.id,
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
        roomId: currentRoom.id,
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
        roomId: currentRoom.id,
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
    return `${baseUrl}/join/${currentRoom.id}`;
  }, [currentRoom]);

  /**
   * Check if current user is host
   */
  const isHost = useCallback(() => {
    return currentRoom?.hostId === currentUser?.id;
  }, [currentRoom, currentUser]);

  

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
  };
}
