import { create } from 'zustand';
import type { Room, User } from '@/types';

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

    const isAlreadyParticipant = currentRoom.participants.some(
      (participant) => participant.id === user.id
    );

    if (!isAlreadyParticipant) {
      set((state) => ({
        currentRoom: state.currentRoom
          ? {
              ...state.currentRoom,
              participants: [...state.currentRoom.participants, user],
            }
          : null,
      }));
    }
  },

  removeParticipant: (userId: string) => {
    set((state) => ({
      currentRoom: state.currentRoom
        ? {
            ...state.currentRoom,
            participants: state.currentRoom.participants.filter(
              (participant) => participant.id !== userId
            ),
          }
        : null,
    }));
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
      rooms: state.rooms.filter((room) => room.id !== roomId),
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
}));
