export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Room {
  id: string;
  name: string;
  participants: Participant[] | User[];
  createdAt: Date;
  hostId: string;
  isPrivate: boolean;
  maxParticipants?: number;
  status?: 'scheduled' | 'waiting' | 'live' | 'ended' | 'cancelled';
}

export interface MediaState {
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenShareEnabled: boolean;
}

export interface Participant {
  peerId: string,
  userId: string,
  user: User,
  mediaState: MediaState,
  isConnected: boolean,
  joinedAt: Date,
}

export interface RoomUserJoined {
  user: User;
  participant: Participant;
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
  peer: RTCPeerConnection | unknown; // SimplePeer.Instance or RTCPeerConnection
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
  'receive-call': (data: { signal: WebRTCSignal; from: string; user: User }) => void;
  'call-accepted': (data: { signal: WebRTCSignal; from: string }) => void;
  'call-ended': () => void;
  'room-update': (room: Room) => void;
  'room:joined': (room: Room) => void;
  'room:user-joined': (room: RoomUserJoined) => void;
  'error': (error: { message: string; code?: string }) => void;
  'room:created': (room: Room) => void;
  'participant-kicked': (participantId: string) => void;
  'host-transferred': (data: { newHostId: string; newHost: User }) => void;
  // WebRTC Signaling Events
  'webrtc:offer': (data: { from: string; offer: RTCSessionDescriptionInit; roomId: string }) => void;
  'webrtc:answer': (data: { from: string; answer: RTCSessionDescriptionInit; roomId: string }) => void;
  'webrtc:ice-candidate': (data: { from: string; candidate: RTCIceCandidateInit; roomId: string }) => void;
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

// WebRTC signal types
export type WebRTCSignal = RTCSessionDescriptionInit | RTCIceCandidateInit | {
  type: string;
  [key: string]: unknown;
};
