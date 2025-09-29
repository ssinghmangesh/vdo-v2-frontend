import { create } from 'zustand';
import type { Participant, Room, User } from '@/types';

interface RoomState {
  currentRoom: Room | null;
  rooms: Room[];
  isLoading: boolean;
  error: string | null;
}

interface RoomActions {
  setCurrentRoom: (room: Room | null) => void;
  updateRoom: (room: Partial<Room>) => void;
  addParticipant: (user: User) => void;
  removeParticipant: (userId: string) => void;
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  removeRoom: (roomId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  leaveRoom: () => void;
  setIsLoading: (loading: boolean) => void;
}

export const useRoomStore = create<RoomState & RoomActions>((set, get) => ({
  currentRoom: null,
  rooms: [],
  isLoading: false,
  error: null,

  setCurrentRoom: (room: Room | null) => {
    set({ currentRoom: room });
  },

  updateRoom: (roomUpdate: Partial<Room>) => {
    set((state) => ({
      currentRoom: state.currentRoom
        ? { ...state.currentRoom, ...roomUpdate }
        : null,
    }));
  },

  addParticipant: (user: User) => {
    const currentRoom = get().currentRoom;
    if (!currentRoom) return;

    // Check if participant already exists
    const isAlreadyParticipant = currentRoom.participants.some((participant) => {
      const participantId = 'userId' in participant ? participant.userId : participant.id;
      return participantId === user.id;
    });

    if (!isAlreadyParticipant) {
      set((state) => {
        if (!state.currentRoom) return state;
        
        // Keep consistent type - if current participants are Users, add User; if Participants, convert
        const firstParticipant = state.currentRoom.participants[0];
        const isParticipantArray = firstParticipant && 'userId' in firstParticipant;
        
        if (isParticipantArray) {
          // Convert user to participant format
          const newParticipant: Participant = {
            peerId: `peer_${user.id}`,
            userId: user.id,
            user: user,
            mediaState: {
              videoEnabled: true,
              audioEnabled: true,
              screenShareEnabled: false,
            },
            isConnected: true,
            joinedAt: new Date(),
          };
          return {
            currentRoom: {
              ...state.currentRoom,
              participants: [...(state.currentRoom.participants as Participant[]), newParticipant],
            },
          };
        } else {
          // Add as User
          return {
            currentRoom: {
              ...state.currentRoom,
              participants: [...(state.currentRoom.participants as User[]), user],
            },
          };
        }
      });
    }
  },

  removeParticipant: (userId: string) => {
    set((state) => {
      if (!state.currentRoom) return state;
      
      // Check if we're dealing with Participant[] or User[]
      const firstParticipant = state.currentRoom.participants[0];
      const isParticipantArray = firstParticipant && 'userId' in firstParticipant;
      
      if (isParticipantArray) {
        const filteredParticipants = (state.currentRoom.participants as Participant[]).filter(
          (participant) => participant.userId !== userId
        );
        return {
          currentRoom: {
            ...state.currentRoom,
            participants: filteredParticipants,
          },
        };
      } else {
        const filteredParticipants = (state.currentRoom.participants as User[]).filter(
          (participant) => participant.id !== userId
        );
        return {
          currentRoom: {
            ...state.currentRoom,
            participants: filteredParticipants,
          },
        };
      }
    });
  },

  setRooms: (rooms: Room[]) => {
    set({ rooms });
  },

  addRoom: (room: Room) => {
    set((state) => ({
      rooms: [...state.rooms, room],
    }));
  },

  removeRoom: (roomId: string) => {
    set((state) => ({
      rooms: state.rooms.filter((room) => room.roomId !== roomId),
    }));
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  leaveRoom: () => {
    set({ currentRoom: null });
  },

  setIsLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));
