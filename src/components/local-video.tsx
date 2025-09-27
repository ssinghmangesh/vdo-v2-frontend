'use client';

import { useRef, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorX } from 'lucide-react';
import { useCallStore } from '@/store/call-store';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/utils/common';

interface LocalVideoProps {
  className?: string;
  showControls?: boolean;
  muted?: boolean;
}

export function LocalVideo({ 
  className, 
  showControls = true, 
  muted = true 
}: LocalVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { localStream, callSettings } = useCallStore();
  const { user } = useAuthStore();

  // Set up video stream
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const { videoEnabled, audioEnabled, screenShareEnabled } = callSettings;

  return (
    <div className={cn(
      'relative overflow-hidden rounded-lg bg-gray-900',
      className
    )}>
      {/* Video Element */}
      {localStream && videoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="h-full w-full object-cover"
          style={{ transform: screenShareEnabled ? 'none' : 'scaleX(-1)' }} // Mirror for camera, not for screen share
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-800">
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-700">
              <span className="text-lg font-semibold text-white">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <p className="text-sm text-gray-300">
              {videoEnabled ? 'No video' : 'Camera off'}
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
            audioEnabled 
              ? 'bg-green-600/80 text-white' 
              : 'bg-red-600/80 text-white'
          )}
        >
          {audioEnabled ? (
            <Mic className="h-3 w-3" />
          ) : (
            <MicOff className="h-3 w-3" />
          )}
        </div>

        {/* Video Status */}
        <div
          className={cn(
            'flex items-center justify-center rounded-full p-1.5',
            videoEnabled 
              ? 'bg-green-600/80 text-white' 
              : 'bg-red-600/80 text-white'
          )}
        >
          {videoEnabled ? (
            <Video className="h-3 w-3" />
          ) : (
            <VideoOff className="h-3 w-3" />
          )}
        </div>

        {/* Screen Share Status */}
        {screenShareEnabled && (
          <div className="flex items-center justify-center rounded-full bg-blue-600/80 p-1.5 text-white">
            <Monitor className="h-3 w-3" />
          </div>
        )}
      </div>

      {/* User Label */}
      <div className="absolute bottom-2 right-2">
        <div className="rounded bg-black/50 px-2 py-1 text-xs text-white">
          You
        </div>
      </div>

      {/* Connection Status Indicator */}
      <div className="absolute right-2 top-2">
        <div className="h-2 w-2 rounded-full bg-green-500"></div>
      </div>
    </div>
  );
}
