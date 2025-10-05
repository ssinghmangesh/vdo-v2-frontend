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
import toast from 'react-hot-toast';
import { getUserMedia } from '@/utils/media';

interface VideoCallProps {
  className?: string;
  leaveRoom: () => void;
}

export function VideoCall({
  className,
  leaveRoom
}: VideoCallProps) {
  // Local state for call functionality
  const [layoutMode, setLayoutMode] = useState<'grid' | 'spotlight'>('grid');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  // Media control state
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isTogglingVideo, setIsTogglingVideo] = useState(false);
  const [isTogglingAudio, setIsTogglingAudio] = useState(false);
  const [isTogglingScreenShare, setIsTogglingScreenShare] = useState(false);
  
  // Store references
  const { currentRoom, error: roomError } = useRoomStore();
  const { user: currentUser } = useAuthStore();
  const { videoStream, audioStream, initializeMedia, toggleVideo, toggleAudio, error: mediaError } = useMedia();
  const { 
    peers, 
    isConnecting: webrtcConnecting, 
    setLocalStream: setWebRTCLocalStream,
    connectToAllParticipants,
  } = useWebRTC();
  
  const error = callError || roomError;
  const isConnecting = webrtcConnecting;

  console.log('🔍 Peers:', peers);
  console.log('🔍 Current Room:', currentRoom);

  // setting the webRTC local stream
  useEffect(() => {
    if (videoStream && audioStream) {
      getUserMedia()
        .then((stream) => {
          setWebRTCLocalStream(stream);
        })
        .catch((err) => {
          console.error('Error getting user media:', err);
          setWebRTCLocalStream(null);
          toast.error(err.message);
        });
    } else if (!videoStream && !audioStream) {
      setWebRTCLocalStream(null);
    } else {
      console.log('🔄 Setting local stream:', videoStream || audioStream);
      setWebRTCLocalStream(videoStream || audioStream);
    }
  }, [videoStream, audioStream, setWebRTCLocalStream]);

  // Connect to other participants when room participants change
  useEffect(() => {
    if (currentRoom && currentUser) {
      
      // Small delay to ensure all participants are properly loaded
      const timer = setTimeout(() => {
        connectToAllParticipants();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [ 
    currentRoom, 
    currentUser, 
    connectToAllParticipants
  ]);

  // Handle volume toggle for remote videos
  const handleVolumeToggle = useCallback((peerId: string, muted: boolean) => {
    console.log(`${muted ? 'Muted' : 'Unmuted'} peer:`, peerId);
  }, []);

  // Media control functions
  const handleToggleVideo = useCallback(async () => {
    if (isTogglingVideo) return;

    setIsTogglingVideo(true);
    const { newEnabled, error } = await toggleVideo(videoEnabled);

    if (error) {
      toast.error(error);
    } else {
      setVideoEnabled(newEnabled);
    }

    setIsTogglingVideo(false);
  }, [videoEnabled, toggleVideo, isTogglingVideo]);

  const handleToggleAudio = useCallback(async () => {
    if (isTogglingAudio) return;
    
    setIsTogglingAudio(true);
    const { newEnabled, error } = await toggleAudio(audioEnabled);

    if (error) {
      toast.error(error);
    } else {
      setAudioEnabled(newEnabled);
    }

    setIsTogglingAudio(false);
  }, [audioEnabled, toggleAudio, isTogglingAudio]);

  const handleToggleScreenShare = useCallback(async () => {
    if (isTogglingScreenShare) return;
    
    setIsTogglingScreenShare(true);
    try {
      if (isScreenSharing) {
        // Stop screen sharing - revert to camera
        console.log('🖥️ Stopping screen share, reverting to camera');
        const stream = await initializeMedia();
        if (stream) {
          setLocalStream(stream);
          setWebRTCLocalStream(stream);
          setIsScreenSharing(false);
          setVideoEnabled(true);
        }
      } else {
        // Start screen sharing
        console.log('🖥️ Starting screen share');
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          });
          
          // Add audio track from current stream if available
          if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack && !screenStream.getAudioTracks().length) {
              screenStream.addTrack(audioTrack);
            }
          }
          
          // Handle screen share ending (user clicks browser's stop button)
          screenStream.getVideoTracks()[0].addEventListener('ended', async () => {
            console.log('🖥️ Screen share ended by user');
            setIsScreenSharing(false);
            // Revert to camera
            try {
              const stream = await initializeMedia();
              if (stream) {
                setLocalStream(stream);
                setWebRTCLocalStream(stream);
                setVideoEnabled(true);
              }
            } catch (error) {
              console.error('❌ Failed to revert to camera after screen share ended:', error);
            }
          });
          
          setLocalStream(screenStream);
          setWebRTCLocalStream(screenStream);
          setIsScreenSharing(true);
          setVideoEnabled(true);
          
        } catch (screenError) {
          console.log('❌ Screen share cancelled or failed:', screenError);
        }
      }
    } catch (error) {
      console.error('❌ Failed to toggle screen share:', error);
    } finally {
      setIsTogglingScreenShare(false);
    }
  }, [isScreenSharing, localStream, initializeMedia, setWebRTCLocalStream, isTogglingScreenShare]);

  const handleLeaveCall = useCallback(() => {
    if (window.confirm('Are you sure you want to leave the call?')) {
      console.log('🚪 User confirmed leaving the call');
      
      // Set global leaving flag to prevent any auto-rejoin
      window.__LEAVING_ROOM__ = true;
      
      // Leave the room IMMEDIATELY to prevent auto-rejoin
      leaveRoom();
      
      // Clean up streams after navigation is initiated
      setTimeout(() => {
        if (localStream) {
          localStream.getTracks().forEach(track => {
            track.stop();
            console.log(`🛑 Stopped ${track.kind} track`);
          });
          setLocalStream(null);
        }
        // Clear the flag after cleanup
        window.__LEAVING_ROOM__ = false;
      }, 100);
    } else {
      console.log('❌ User cancelled leaving the call');
    }
  }, [localStream, leaveRoom]);

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
  if (isConnecting) {
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
              stream={videoStream}
              videoEnabled={videoEnabled}
              audioEnabled={audioEnabled}
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
              videoEnabled={videoEnabled}
              audioEnabled={audioEnabled}
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

      {/* Call Controls */}
      <div className="flex justify-center p-4">
        <CallControls
          videoEnabled={videoEnabled}
          audioEnabled={audioEnabled}
          isScreenSharing={isScreenSharing}
          onToggleVideo={handleToggleVideo}
          onToggleAudio={handleToggleAudio}
          onToggleScreenShare={handleToggleScreenShare}
          onLeaveCall={handleLeaveCall}
          isTogglingVideo={isTogglingVideo}
          isTogglingAudio={isTogglingAudio}
          isTogglingScreenShare={isTogglingScreenShare}
        />
      </div>
    </div>
  );
}
