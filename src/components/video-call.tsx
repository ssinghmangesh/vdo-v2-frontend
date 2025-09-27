'use client';

import { useEffect, useState, useCallback } from 'react';
import { useCallStore } from '@/store/call-store';
import { useRoomStore } from '@/store/room-store';
import { useMedia } from '@/hooks/use-media';
import { usePeer } from '@/hooks/use-peer';
import { LocalVideo } from './local-video';
import { RemoteVideo } from './remote-video';
import { CallControls } from './call-controls';
import { cn } from '@/utils/common';

interface VideoCallProps {
  className?: string;
  onSettingsClick?: () => void;
  onParticipantsClick?: () => void;
  onChatClick?: () => void;
}

export function VideoCall({
  className,
  onSettingsClick,
  onParticipantsClick,
  onChatClick,
}: VideoCallProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'spotlight'>('grid');
  
  const { 
    localStream, 
    peers, 
    isInCall, 
    isConnecting, 
    error,
    setCallState 
  } = useCallStore();
  
  const { currentRoom } = useRoomStore();
  const { initializeMedia, error: mediaError } = useMedia();
  const { peersCount } = usePeer();

  // Initialize media when component mounts
  useEffect(() => {
    const initCall = async () => {
      if (!isInitialized && currentRoom) {
        try {
          setCallState(false, true); // Set connecting state
          await initializeMedia();
          setCallState(true, false); // Set in call state
          setIsInitialized(true);
        } catch (error) {
          console.error('Failed to initialize call:', error);
          setCallState(false, false);
        }
      }
    };

    initCall();
  }, [currentRoom, isInitialized, initializeMedia, setCallState]);

  // Handle volume toggle for remote videos
  const handleVolumeToggle = useCallback((peerId: string, muted: boolean) => {
    console.log(`${muted ? 'Muted' : 'Unmuted'} peer:`, peerId);
  }, []);

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
            <LocalVideo className="h-32" />
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

        {/* Call Info */}
        <div className="absolute left-4 top-4">
          <div className="rounded-lg bg-black/50 px-3 py-2 text-sm text-white">
            <div>{currentRoom?.name}</div>
            <div className="text-xs text-gray-300">
              {peersCount + 1} participant{peersCount !== 0 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* No other participants message */}
        {!hasRemotePeers && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
            <div className="mx-auto max-w-md rounded-lg bg-black/50 p-6 text-white">
              <h3 className="mb-2 text-lg font-semibold">
                Waiting for others to join
              </h3>
              <p className="text-sm text-gray-300">
                Share the room link with others to start your video call
              </p>
            </div>
          </div>
        )}
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
