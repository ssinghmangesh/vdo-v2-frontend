'use client';

import { useRef, useEffect, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/utils/common';
import type { User } from '@/types';

interface RemoteVideoProps {
  peerId: string;
  user: User;
  stream?: MediaStream;
  className?: string;
  onVolumeToggle?: (peerId: string, muted: boolean) => void;
}

export function RemoteVideo({ 
  peerId, 
  user, 
  stream, 
  className,
  onVolumeToggle 
}: RemoteVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Set up video stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      setConnectionStatus('connected');
    }
  }, [stream]);

  // Monitor track status
  useEffect(() => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      setIsVideoEnabled(videoTrack?.enabled || false);
      setIsAudioEnabled(audioTrack?.enabled || false);

      // Listen for track changes
      const handleVideoChange = () => setIsVideoEnabled(videoTrack?.enabled || false);
      const handleAudioChange = () => setIsAudioEnabled(audioTrack?.enabled || false);

      if (videoTrack) {
        videoTrack.addEventListener('ended', handleVideoChange);
        videoTrack.addEventListener('mute', handleVideoChange);
        videoTrack.addEventListener('unmute', handleVideoChange);
      }

      if (audioTrack) {
        audioTrack.addEventListener('ended', handleAudioChange);
        audioTrack.addEventListener('mute', handleAudioChange);
        audioTrack.addEventListener('unmute', handleAudioChange);
      }

      return () => {
        if (videoTrack) {
          videoTrack.removeEventListener('ended', handleVideoChange);
          videoTrack.removeEventListener('mute', handleVideoChange);
          videoTrack.removeEventListener('unmute', handleVideoChange);
        }
        if (audioTrack) {
          audioTrack.removeEventListener('ended', handleAudioChange);
          audioTrack.removeEventListener('mute', handleAudioChange);
          audioTrack.removeEventListener('unmute', handleAudioChange);
        }
      };
    }
  }, [stream]);

  const handleVolumeToggle = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    // Control the video element volume
    if (videoRef.current) {
      videoRef.current.muted = newMutedState;
    }

    onVolumeToggle?.(peerId, newMutedState);
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getUserInitial = () => {
    return user.name?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <div className={cn(
      'relative overflow-hidden rounded-lg bg-gray-900',
      className
    )}>
      {/* Video Element */}
      {stream && isVideoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-800">
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-gray-700">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-semibold text-white">
                  {getUserInitial()}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-300">
              {isVideoEnabled ? 'No video' : 'Camera off'}
            </p>
          </div>
        </div>
      )}

      {/* Status Indicators */}
      <div className="absolute bottom-2 left-2 flex space-x-1">
        {/* Audio Status */}
        <div
          className={cn(
            'flex items-center justify-center rounded-full p-1.5',
            isAudioEnabled 
              ? 'bg-green-600/80 text-white' 
              : 'bg-red-600/80 text-white'
          )}
        >
          {isAudioEnabled ? (
            <Mic className="h-3 w-3" />
          ) : (
            <MicOff className="h-3 w-3" />
          )}
        </div>

        {/* Video Status */}
        <div
          className={cn(
            'flex items-center justify-center rounded-full p-1.5',
            isVideoEnabled 
              ? 'bg-green-600/80 text-white' 
              : 'bg-red-600/80 text-white'
          )}
        >
          {isVideoEnabled ? (
            <Video className="h-3 w-3" />
          ) : (
            <VideoOff className="h-3 w-3" />
          )}
        </div>
      </div>

      {/* Volume Control */}
      <div className="absolute bottom-2 right-2">
        <button
          onClick={handleVolumeToggle}
          className={cn(
            'flex items-center justify-center rounded-full p-1.5 transition-colors',
            isMuted
              ? 'bg-red-600/80 text-white hover:bg-red-600'
              : 'bg-gray-600/80 text-white hover:bg-gray-600'
          )}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX className="h-3 w-3" />
          ) : (
            <Volume2 className="h-3 w-3" />
          )}
        </button>
      </div>

      {/* User Label */}
      <div className="absolute left-2 top-2">
        <div className="rounded bg-black/50 px-2 py-1 text-xs text-white">
          {user.name || 'Unknown'}
        </div>
      </div>

      {/* Connection Status Indicator */}
      <div className="absolute right-2 top-2">
        <div className={cn('h-2 w-2 rounded-full', getConnectionStatusColor())}></div>
      </div>

      {/* Connection Status Overlay */}
      {connectionStatus === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <div className="mb-2 h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            <p className="text-sm text-white">Connecting...</p>
          </div>
        </div>
      )}

      {connectionStatus === 'disconnected' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <p className="text-sm text-white">Disconnected</p>
          </div>
        </div>
      )}
    </div>
  );
}
