'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRoomStore } from '@/store/room-store';
import { useMedia } from '@/hooks/use-media';
import { useWebRTC } from '@/hooks/use-webrtc';
import { useAuthStore } from '@/store/auth-store';
import { LocalVideo } from './local-video';
import { RemoteVideo } from './remote-video';
import { CallControls } from './call-controls';
import { cn } from '@/utils/common';
// import type { CallSettings } from '@/types'; // Available for future use

interface VideoCallProps {
  className?: string;
  onSettingsClick?: () => void;
  onParticipantsClick?: () => void;
  onChatClick?: () => void;
}

// Default call settings available for future use
// const defaultCallSettings: CallSettings = {
//   videoEnabled: true,
//   audioEnabled: true,
//   screenShareEnabled: false,
//   backgroundBlurEnabled: false,
//   noiseReductionEnabled: true,
// };

export function VideoCall({
  className,
  onSettingsClick,
  onParticipantsClick,
  onChatClick,
}: VideoCallProps) {
  // Local state for call functionality
  const [isInitialized, setIsInitialized] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'spotlight'>('grid');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  
  // Store references
  const { currentRoom, error: roomError } = useRoomStore();
  const { user: currentUser } = useAuthStore();
  const { initializeMedia, error: mediaError } = useMedia();
  const { 
    peers, 
    isConnecting: webrtcConnecting, 
    setLocalStream: setWebRTCLocalStream,
    connectToAllParticipants,
  } = useWebRTC();
  
  const error = callError || roomError;
  const isConnecting = webrtcConnecting;

  // Initialize media when component mounts
  useEffect(() => {
    const initCall = async () => {
      if (!isInitialized && currentRoom && currentUser) {
        try {
          setCallError(null);
          console.log('🎥 Initializing video call for room:', currentRoom.id);
          
          const stream = await initializeMedia();
          if (stream) {
            console.log('🎥 Received stream from initializeMedia:', !!stream);
            console.log('🎥 Stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
            
            setLocalStream(stream);
            setWebRTCLocalStream(stream);
            setIsInitialized(true);
            
            console.log('✅ Media initialized successfully, local stream set');
          } else {
            throw new Error('Failed to initialize media stream');
          }
          
        } catch (error) {
          console.error('Failed to initialize call:', error);
          setCallError(error instanceof Error ? error.message : 'Failed to initialize call');
        }
      }
    };

    initCall();
  }, [currentRoom, currentUser, isInitialized, initializeMedia, setWebRTCLocalStream]);

  // Connect to other participants when room participants change
  useEffect(() => {
    if (isInitialized && currentRoom && currentUser && localStream) {
      console.log('🌐 Room participants updated, connecting to peers...');
      console.log('🌐 Current room participants:', currentRoom.participants.length);
      console.log('🌐 Current user:', currentUser.id);
      console.log('🌐 Local stream available:', !!localStream);
      
      // Small delay to ensure all participants are properly loaded
      const timer = setTimeout(() => {
        connectToAllParticipants();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [
    isInitialized, 
    currentRoom, 
    currentUser, 
    localStream, 
    connectToAllParticipants
  ]);

  // Handle volume toggle for remote videos
  const handleVolumeToggle = useCallback((peerId: string, muted: boolean) => {
    console.log(`${muted ? 'Muted' : 'Unmuted'} peer:`, peerId);
  }, []);

  // Update call settings (Available for future use)
  // const updateCallSettings = useCallback((settings: Partial<CallSettings>) => {
  //   // Apply settings to local stream
  //   if (localStream) {
  //     const videoTrack = localStream.getVideoTracks()[0];
  //     const audioTrack = localStream.getAudioTracks()[0];
  //     
  //     if (videoTrack && settings.videoEnabled !== undefined) {
  //       videoTrack.enabled = settings.videoEnabled;
  //     }
  //     if (audioTrack && settings.audioEnabled !== undefined) {
  //       audioTrack.enabled = settings.audioEnabled;
  //     }
  //   }
  // }, [localStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream]);

  // Calculate grid layout
  const getGridLayoutClass = () => {
    const totalParticipants = Object.keys(peers).length + 1; // +1 for local video

    if (totalParticipants === 1) {
      return 'grid-cols-1';
    } else if (totalParticipants === 2) {
      return 'grid-cols-1 md:grid-cols-2';
    } else if (totalParticipants <= 4) {
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2';
    } else if (totalParticipants <= 6) {
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    } else {
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    }
  };

  // Show loading state
  if (!isInitialized || isConnecting) {
    return (
      <div className={cn(
        'flex h-full items-center justify-center bg-gray-900',
        className
      )}>
        <div className="text-center">
          <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-lg text-white">
            {isConnecting ? 'Connecting to call...' : 'Initializing camera and microphone...'}
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || mediaError) {
    return (
      <div className={cn(
        'flex h-full items-center justify-center bg-gray-900',
        className
      )}>
        <div className="max-w-md text-center">
          <div className="mb-4 text-6xl">⚠️</div>
          <h2 className="mb-2 text-xl font-semibold text-white">
            Unable to join call
          </h2>
          <p className="mb-4 text-gray-300">
            {error || mediaError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const peerEntries = Object.entries(peers);
  const hasRemotePeers = peerEntries.length > 0;

  return (
    <div className={cn(
      'flex h-full flex-col bg-gray-900',
      className
    )}>
      {/* Video Grid */}
      <div className="flex-1 p-4">
        <div className={cn(
          'grid h-full gap-4',
          layoutMode === 'grid' ? getGridLayoutClass() : 'grid-cols-1'
        )}>
          {/* Local Video */}
          {(layoutMode === 'grid' || !hasRemotePeers) && (
            <LocalVideo 
              className={cn(
                'h-full min-h-[200px]',
                layoutMode === 'spotlight' && hasRemotePeers && 'h-32'
              )}
              stream={localStream}
              videoEnabled={true}
              audioEnabled={true}
            />
          )}

          {/* Remote Videos */}
          {peerEntries.map(([peerId, peerConnection]) => (
            <RemoteVideo
              key={peerId}
              peerId={peerId}
              user={peerConnection.user}
              stream={peerConnection.stream}
              className="h-full min-h-[200px]"
              onVolumeToggle={handleVolumeToggle}
            />
          ))}
        </div>

        {/* Local Video in Spotlight Mode (Small) */}
        {layoutMode === 'spotlight' && hasRemotePeers && (
          <div className="absolute bottom-24 right-4 w-48">
            <LocalVideo 
              className="h-32" 
              stream={localStream}
              videoEnabled={true}
              audioEnabled={true}
            />
          </div>
        )}

        {/* Layout Toggle */}
        {hasRemotePeers && (
          <div className="absolute right-4 top-4">
            <button
              onClick={() => setLayoutMode(layoutMode === 'grid' ? 'spotlight' : 'grid')}
              className="rounded-lg bg-gray-800/80 px-3 py-2 text-sm text-white hover:bg-gray-700/80"
            >
              {layoutMode === 'grid' ? 'Spotlight' : 'Grid'}
            </button>
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="absolute left-4 top-4 rounded bg-black/50 p-2 text-xs text-white">
        <div>Local Stream: {localStream ? '✅' : '❌'}</div>
        <div>Peers: {Object.keys(peers).length}</div>
        <div>Initialized: {isInitialized ? '✅' : '❌'}</div>
        <div>Connecting: {isConnecting ? '🔄' : '✅'}</div>
        {Object.entries(peers).map(([peerId, peer]) => (
          <div key={peerId}>
            {peerId}: {peer.stream ? '📹' : '❌'}
          </div>
        ))}
      </div>

      {/* Call Controls */}
      <div className="flex justify-center p-4">
        <CallControls
          onSettingsClick={onSettingsClick}
          onParticipantsClick={onParticipantsClick}
          onChatClick={onChatClick}
        />
      </div>
    </div>
  );
}
