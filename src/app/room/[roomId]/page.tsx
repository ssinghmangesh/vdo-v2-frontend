'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useRoom } from '@/hooks/use-room';
import { VideoCall } from '@/components/video-call';
import { copyToClipboard } from '@/utils/common';
import { Share, Users, X } from 'lucide-react';

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;
  
  const [showParticipants, setShowParticipants] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const hasJoinedOnceRef = useRef(false);
  const isLeavingRef = useRef(false);
  
  const { user } = useAuthStore();
  const { currentRoom, joinRoom, isJoining, getRoomShareUrl } = useRoom();

  useEffect(() => {
    // Check global leaving flag to prevent auto-rejoin
    const isGlobalLeaving = window.__LEAVING_ROOM__ || false;
    
    // Only join if we haven't joined before and we don't have a current room and we're not leaving
    console.log('🔍 Room join check:', {
      currentRoom: !!currentRoom,
      roomId,
      hasJoinedOnce: hasJoinedOnceRef.current,
      isLeaving: isLeavingRef.current,
      isGlobalLeaving,
      shouldJoin: !currentRoom && roomId && !hasJoinedOnceRef.current && !isLeavingRef.current && !isGlobalLeaving
    });
    
    if (!currentRoom && roomId && !hasJoinedOnceRef.current && !isLeavingRef.current && !isGlobalLeaving) {
      console.log('✅ First time joining room:', roomId);
      hasJoinedOnceRef.current = true;
      joinRoom(roomId);
    }
  }, [currentRoom, roomId, joinRoom]);

  // Reset the join flag if we're in a different room
  useEffect(() => {
    if (currentRoom && currentRoom.roomId !== roomId) {
      hasJoinedOnceRef.current = false;
    }
  }, [currentRoom, roomId]);

  // Detect when we're about to leave this component (cleanup)
  useEffect(() => {
    return () => {
      console.log('🚪 Room page component unmounting, setting leaving flag');
      isLeavingRef.current = true;
    };
  }, []);

  // Reset leaving flag when currentRoom changes to non-null (successful join)
  useEffect(() => {
    if (currentRoom) {
      console.log('🏠 Successfully in room, resetting leaving flag');
      isLeavingRef.current = false;
    }
  }, [currentRoom]);

  // Handle room sharing
  const handleShareRoom = async () => {
    const shareUrl = getRoomShareUrl();
    const success = await copyToClipboard(shareUrl);
    setCopySuccess(success);
    
    if (success) {
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Show loading state
  if (isJoining) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Joining room...
          </h2>
          <p className="text-gray-300">
            Setting up your connection
          </p>
        </div>
      </div>
    );
  }

  console.log("currentRoom", currentRoom);
  console.log("isJoining", isJoining);

  // Show error if room join failed (but not if we're leaving)
  if (!currentRoom && !isJoining && !window.__LEAVING_ROOM__) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="max-w-md text-center">
          <div className="mb-4 text-6xl">🚫</div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Unable to join room
          </h2>
          <p className="text-gray-300 mb-6">
            The room &quot;{roomId}&quot; might not exist or you don&apos;t have permission to join it.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                // Reset all flags before retrying
                window.__LEAVING_ROOM__ = false;
                hasJoinedOnceRef.current = false;
                isLeavingRef.current = false;
                joinRoom(roomId);
              }}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full border border-gray-600 text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold text-white">VDO</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Share className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
            
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="flex items-center space-x-2 bg-gray-700 text-white px-3 py-1.5 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">
                {currentRoom?.participants.length || 0}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex relative">
        {/* Video Call Area */}
        <div className={`flex-1 ${showParticipants ? 'mr-80' : ''}`}>
          <VideoCall
            className="h-full"
          />
        </div>

        {/* Participants Sidebar */}
        {showParticipants && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-800 border-l border-gray-700 z-10">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Participants</h3>
              <button
                onClick={() => setShowParticipants(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              {currentRoom?.participants.map((participant) => {
                // Handle both User and Participant types
                const isParticipant = 'userId' in participant;
                const participantData = isParticipant ? participant.user : participant;
                const participantId = isParticipant ? participant.userId : participant.id;
                const participantKey = isParticipant ? participant.userId : participant.id;
                
                return (
                  <div
                    key={participantKey}
                    className="flex items-center space-x-3 p-2 bg-gray-700 rounded-lg"
                  >
                    <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">
                        {participantData.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {participantData.name}
                        {participantId === user?.id && ' (You)'}
                        {participantId === currentRoom?.hostId && ' (Host)'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {participantData.email}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Share Room
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              Share this link with others to invite them to the room:
            </p>
            
            <div className="mb-4">
              <input
                type="text"
                value={getRoomShareUrl()}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-black"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleShareRoom}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  copySuccess
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {copySuccess ? 'Copied!' : 'Copy Link'}
              </button>
              
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
