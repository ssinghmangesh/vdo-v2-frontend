'use client';

import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorX,
  PhoneOff
} from 'lucide-react';
import { cn } from '@/utils/common';

interface CallControlsProps {
  className?: string;
  // Media state
  videoEnabled: boolean;
  audioEnabled: boolean;
  isScreenSharing: boolean;
  // Media control functions
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onLeaveCall: () => void;
  // Loading states
  isTogglingVideo?: boolean;
  isTogglingAudio?: boolean;
  isTogglingScreenShare?: boolean;
}

export function CallControls({
  className,
  videoEnabled,
  audioEnabled,
  isScreenSharing,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onLeaveCall,
  isTogglingVideo = false,
  isTogglingAudio = false,
  isTogglingScreenShare = false,
}: CallControlsProps) {

  return (
    <div className={cn(
      'flex items-center justify-center space-x-4 rounded-xl bg-gray-900/90 p-4 backdrop-blur-sm',
      className
    )}>
      {/* Audio Toggle */}
      <button
        onClick={onToggleAudio}
        disabled={isTogglingAudio}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          audioEnabled
            ? 'bg-gray-700 text-white hover:bg-gray-600'
            : 'bg-red-600 text-white hover:bg-red-700'
        )}
        title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {isTogglingAudio ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : audioEnabled ? (
          <Mic className="h-5 w-5" />
        ) : (
          <MicOff className="h-5 w-5" />
        )}
      </button>

      {/* Video Toggle */}
      <button
        onClick={onToggleVideo}
        disabled={isTogglingVideo}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          videoEnabled
            ? 'bg-gray-700 text-white hover:bg-gray-600'
            : 'bg-red-600 text-white hover:bg-red-700'
        )}
        title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        {isTogglingVideo ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : videoEnabled ? (
          <Video className="h-5 w-5" />
        ) : (
          <VideoOff className="h-5 w-5" />
        )}
      </button>

      {/* Screen Share Toggle */}
      <button
        onClick={onToggleScreenShare}
        disabled={isTogglingScreenShare}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isScreenSharing
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-700 text-white hover:bg-gray-600'
        )}
        title={isScreenSharing ? 'Stop screen share' : 'Share screen'}
      >
        {isTogglingScreenShare ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : isScreenSharing ? (
          <MonitorX className="h-5 w-5" />
        ) : (
          <Monitor className="h-5 w-5" />
        )}
      </button>

      {/* Leave Call */}
      <button
        onClick={onLeaveCall}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white transition-all duration-200 hover:bg-red-700"
        title="Leave call"
      >
        <PhoneOff className="h-5 w-5" />
      </button>
    </div>
  );
}