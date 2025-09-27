import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRoomStore } from '@/store/room-store';
import { useAuthStore } from '@/store/auth-store';
import { useCallStore } from '@/store/call-store';
import { socketService } from '@/lib/socket';
import { generateRoomId } from '@/utils/common';
import type { Room, User } from '@/types';

export function useRoom() {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const {
    currentRoom,
    setCurrentRoom,
    updateRoom,
    addParticipant,
    removeParticipant,
    setLoading,
    setError,
    leaveRoom: leaveRoomStore,
  } = useRoomStore();
  
  const { user: currentUser } = useAuthStore();
  const { setHost, resetCall } = useCallStore();

  /**
   * Create a new room
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
        const socket = socketService.connect();
        if (!socket.connected) {
          await new Promise((resolve) => {
            socket.once('connect', resolve);
          });
        }

        // Create room on server
        socketService.createRoom(newRoom);
        
        // Set local room state
        setCurrentRoom(newRoom);
        setHost(true);

        // Navigate to room
        router.push(`/room/${roomId}`);

        return newRoom;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to create room';
        setError(errorMsg);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [currentUser, setCurrentRoom, setHost, setError, router]
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
        const socket = socketService.connect();
        if (!socket.connected) {
          await new Promise((resolve) => {
            socket.once('connect', resolve);
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

          socketService.on('room-update', (room: Room) => {
            clearTimeout(timeout);
            setCurrentRoom(room);
            setIsJoining(false);
            
            // Check if current user is the host
            setHost(room.hostId === currentUser.id);
            
            // Navigate to room
            router.push(`/room/${roomId}`);
            resolve(true);
          });

          socketService.on('error', (error: string) => {
            clearTimeout(timeout);
            setError(error);
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
    [currentUser, setCurrentRoom, setHost, setError, router]
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

      const newHost = currentRoom.participants.find(p => p.id === newHostId);
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

  // Setup socket event listeners
  useEffect(() => {
    socketService.on('room-update', (room: Room) => {
      setCurrentRoom(room);
    });

    socketService.on('user-joined', (user: User) => {
      addParticipant(user);
    });

    socketService.on('user-left', (userId: string) => {
      removeParticipant(userId);
    });

    socketService.on('participant-kicked', (participantId: string) => {
      if (participantId === currentUser?.id) {
        // Current user was kicked
        leaveRoom();
        setError('You have been removed from the room');
      } else {
        removeParticipant(participantId);
      }
    });

    socketService.on('host-transferred', (data: { newHostId: string; newHost: User }) => {
      updateRoom({ hostId: data.newHostId });
      if (data.newHostId === currentUser?.id) {
        setHost(true);
      } else if (currentRoom?.hostId === currentUser?.id) {
        setHost(false);
      }
    });

    return () => {
      socketService.off('room-update');
      socketService.off('user-joined');
      socketService.off('user-left');
      socketService.off('participant-kicked');
      socketService.off('host-transferred');
    };
  }, [
    currentUser,
    currentRoom,
    setCurrentRoom,
    addParticipant,
    removeParticipant,
    updateRoom,
    setHost,
    setError,
    leaveRoom,
  ]);

  return {
    currentRoom,
    isJoining,
    isCreating,
    createRoom,
    joinRoom,
    leaveRoom,
    updateRoomSettings,
    kickParticipant,
    transferHost,
    getRoomShareUrl,
    isHost: isHost(),
  };
}
