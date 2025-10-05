import { create } from 'zustand';
import type { CallState, CallSettings, User } from '@/types';

interface CallActions {
  setLocalStream: (stream: MediaStream | null) => void;
  addPeer: (peerId: string, peer: RTCPeerConnection | unknown, user: User, stream?: MediaStream) => void;
  removePeer: (peerId: string) => void;
  updateCallSettings: (settings: Partial<CallSettings>) => void;
  setCallState: (isInCall: boolean, isConnecting?: boolean) => void;
  setHost: (isHost: boolean) => void;
  setError: (error: string | null) => void;
  resetCall: () => void;
}

const defaultCallSettings: CallSettings = {
  videoEnabled: true,
  audioEnabled: true,
  screenShareEnabled: false,
  backgroundBlurEnabled: false,
  noiseReductionEnabled: true,
};

export const useCallStore = create<CallState & CallActions>((set, get) => ({
  isInCall: false,
  isConnecting: false,
  isHost: false,
  localStream: null,
  peers: {},
  callSettings: defaultCallSettings,
  error: null,

  setLocalStream: (stream: MediaStream | null) => {
    set({ localStream: stream });
  },

  addPeer: (peerId: string, peer: RTCPeerConnection | unknown, user: User, stream?: MediaStream) => {
    set((state) => ({
      peers: {
        ...state.peers,
        [peerId]: {
          peerId,
          peer,
          user,
          stream,
        },
      },
    }));
  },

  removePeer: (peerId: string) => {
    const state = get();
    const peer = state.peers[peerId];
    
    // Clean up peer connection
    if (peer?.peer) {
      (peer.peer as RTCPeerConnection).close();
    }
    
    // Clean up stream
    if (peer?.stream) {
      peer.stream.getTracks().forEach(track => track.stop());
    }

    set((state) => {
      const { [peerId]: removed, ...remainingPeers } = state.peers;
      console.log('🔄 Removing peer:', removed);
      return { peers: remainingPeers };
    });
  },

  updateCallSettings: (settings: Partial<CallSettings>) => {
    set((state) => ({
      callSettings: { ...state.callSettings, ...settings },
    }));

    // Apply settings to local stream
    const localStream = get().localStream;
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      const audioTrack = localStream.getAudioTracks()[0];
      
      if (videoTrack) {
        videoTrack.enabled = settings.videoEnabled ?? get().callSettings.videoEnabled;
      }
      if (audioTrack) {
        audioTrack.enabled = settings.audioEnabled ?? get().callSettings.audioEnabled;
      }
    }
  },

  setCallState: (isInCall: boolean, isConnecting = false) => {
    set({ isInCall, isConnecting });
  },

  setHost: (isHost: boolean) => {
    set({ isHost });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  resetCall: () => {
    const state = get();
    
    // Clean up all peer connections
    Object.values(state.peers).forEach((peerConnection) => {
      if (peerConnection.peer) {
        (peerConnection.peer as RTCPeerConnection).close();
      }
      if (peerConnection.stream) {
        peerConnection.stream.getTracks().forEach(track => track.stop());
      }
    });

    // Clean up local stream
    if (state.localStream) {
      state.localStream.getTracks().forEach(track => track.stop());
    }

    set({
      isInCall: false,
      isConnecting: false,
      isHost: false,
      localStream: null,
      peers: {},
      callSettings: defaultCallSettings,
      error: null,
    });
  },
}));
