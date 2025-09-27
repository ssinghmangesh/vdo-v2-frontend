export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Room {
  id: string;
  name: string;
  participants: User[];
  createdAt: Date;
  hostId: string;
  isPrivate: boolean;
  maxParticipants?: number;
}

export interface CallSettings {
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenShareEnabled: boolean;
  backgroundBlurEnabled?: boolean;
  noiseReductionEnabled?: boolean;
}

export interface PeerConnection {
  peerId: string;
  peer: any; // SimplePeer.Instance
  user: User;
  stream?: MediaStream;
}

export interface CallState {
  isInCall: boolean;
  isConnecting: boolean;
  isHost: boolean;
  localStream: MediaStream | null;
  peers: Record<string, PeerConnection>;
  callSettings: CallSettings;
  error: string | null;
}

export interface SocketEvents {
  'user-joined': (user: User) => void;
  'user-left': (userId: string) => void;
  'receive-call': (data: { signal: any; from: string; user: User }) => void;
  'call-accepted': (data: { signal: any; from: string }) => void;
  'call-ended': () => void;
  'room-update': (room: Room) => void;
  'error': (error: string) => void;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type CallStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface MediaConstraints {
  video: boolean | MediaTrackConstraints;
  audio: boolean | MediaTrackConstraints;
}
