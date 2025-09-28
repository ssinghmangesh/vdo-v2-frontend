import { useState, useCallback } from 'react';
import { getUserMedia, stopMediaStream, isMediaSupported } from '@/utils/media';
import type { MediaConstraints } from '@/types';

export function useMedia() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  /**
   * Initialize user media stream
   */
  const initializeMedia = useCallback(async (constraints?: MediaConstraints) => {
    if (!isMediaSupported()) {
      const errorMsg = 'Your browser does not support camera and microphone access';
      setError(errorMsg);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🎥 Getting user media with constraints:', constraints);
      const stream = await getUserMedia(constraints);
      console.log('🎥 Successfully got media stream:', !!stream);
      console.log('🎥 Stream tracks:', stream?.getTracks().map(t => `${t.kind}: ${t.enabled}`));
      
      setLocalStream(stream);

      // Ensure tracks are enabled by default
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (videoTrack) {
        videoTrack.enabled = true;
        console.log('📹 Video track enabled:', videoTrack.enabled);
      }
      if (audioTrack) {
        audioTrack.enabled = true;
        console.log('🎤 Audio track enabled:', audioTrack.enabled);
      }

      return stream;
    } catch (err) {
      console.error('❌ Failed to get user media:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to access camera and microphone';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Stop user media stream
   */
  const stopMedia = useCallback(() => {
    if (localStream) {
      console.log('🛑 Stopping media stream');
      stopMediaStream(localStream);
      setLocalStream(null);
    }
  }, [localStream]);

  /**
   * Toggle video track on/off
   */
  const toggleVideo = useCallback((enabled?: boolean) => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled !== undefined ? enabled : !videoTrack.enabled;
        console.log('📹 Video track toggled:', videoTrack.enabled);
        return videoTrack.enabled;
      }
    }
    return false;
  }, [localStream]);

  /**
   * Toggle audio track on/off
   */
  const toggleAudio = useCallback((enabled?: boolean) => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled !== undefined ? enabled : !audioTrack.enabled;
        console.log('🎤 Audio track toggled:', audioTrack.enabled);
        return audioTrack.enabled;
      }
    }
    return false;
  }, [localStream]);

  return {
    localStream,
    isLoading,
    error,
    initializeMedia,
    stopMedia,
    toggleVideo,
    toggleAudio,
  };
}