'use client';

import { useState } from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorX, 
  PhoneOff, 
  Settings,
  Users,
  MessageCircle,
  MoreVertical
} from 'lucide-react';
import { useCallStore } from '@/store/call-store';
import { useRoomStore } from '@/store/room-store';
import { useMedia } from '@/hooks/use-media';
import { useRoom } from '@/hooks/use-room';
import { cn } from '@/utils/common';

interface CallControlsProps {
  className?: string;
  onSettingsClick?: () => void;
  onParticipantsClick?: () => void;
  onChatClick?: () => void;
}

export function CallControls({
  className,
  onSettingsClick,
  onParticipantsClick,
  onChatClick,
}: CallControlsProps) {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const { callSettings, isInCall } = useCallStore();
  const { currentRoom } = useRoomStore();
  const { 
    toggleVideo, 
    toggleAudio, 
    startScreenShare, 
    stopScreenShare, 
    isScreenSharing 
  } = useMedia();
  const { leaveRoom } = useRoom();

  const { videoEnabled, audioEnabled } = callSettings;

  const handleToggleVideo = () => {
    toggleVideo();
  };

  const handleToggleAudio = () => {
    toggleAudio();
  };

  const handleToggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await stopScreenShare();
      } else {
        await startScreenShare();
      }
    } catch (error) {
      console.error('Failed to toggle screen share:', error);
    }
  };

  const handleEndCall = () => {
    if (window.confirm('Are you sure you want to leave the call?')) {
      leaveRoom();
    }
  };

  const participantCount = currentRoom?.participants.length || 0;

  return (
    <div className={cn(
      'flex items-center justify-center space-x-4 rounded-xl bg-gray-900/90 p-4 backdrop-blur-sm',
      className
    )}>
      {/* Audio Toggle */}
      <button
        onClick={handleToggleAudio}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200',
          audioEnabled
            ? 'bg-gray-700 text-white hover:bg-gray-600'
            : 'bg-red-600 text-white hover:bg-red-700'
        )}
        title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {audioEnabled ? (
          <Mic className="h-5 w-5" />
        ) : (
          <MicOff className="h-5 w-5" />
        )}
      </button>

      {/* Video Toggle */}
      <button
        onClick={handleToggleVideo}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200',
          videoEnabled
            ? 'bg-gray-700 text-white hover:bg-gray-600'
            : 'bg-red-600 text-white hover:bg-red-700'
        )}
        title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        {videoEnabled ? (
          <Video className="h-5 w-5" />
        ) : (
          <VideoOff className="h-5 w-5" />
        )}
      </button>

      {/* Screen Share Toggle */}
      <button
        onClick={handleToggleScreenShare}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200',
          isScreenSharing
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-700 text-white hover:bg-gray-600'
        )}
        title={isScreenSharing ? 'Stop screen share' : 'Share screen'}
      >
        {isScreenSharing ? (
          <MonitorX className="h-5 w-5" />
        ) : (
          <Monitor className="h-5 w-5" />
        )}
      </button>

      {/* End Call */}
      <button
        onClick={handleEndCall}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white transition-all duration-200 hover:bg-red-700"
        title="End call"
      >
        <PhoneOff className="h-5 w-5" />
      </button>
    </div>
  );
}
