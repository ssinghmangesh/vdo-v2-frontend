import { useState, useCallback } from 'react';
import { getUserMedia, stopMediaStream, isMediaSupported, getUserCamera, getUserAudio } from '@/utils/media';
import type { MediaConstraints } from '@/types';

export function useMedia() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

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
      const stream = await getUserMedia(constraints);
      
      setLocalStream(stream);

      // Ensure tracks are enabled by default
      const videoTrack = stream?.getVideoTracks()[0];
      const audioTrack = stream?.getAudioTracks()[0];

      if (videoTrack) {
        videoTrack.enabled = false;
      }
      if (audioTrack) {
        audioTrack.enabled = true;
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
  const toggleVideo = useCallback(async (enabled?: boolean) => {
    console.log('🎤 Toggling video:', enabled);
    const result = { newEnabled: false, error: null as string | null };
    if (videoStream && enabled) {
      const videoTracks = videoStream.getVideoTracks();

      if (videoTracks.length > 0) {
        videoTracks.forEach(videoTrack => {
          videoTrack.stop();
        });

        setVideoStream(null);
        result.newEnabled = false;
      }

    } else if (!isMediaSupported()) {
        const errorMsg = 'Your browser does not support camera';
        result.error = errorMsg;
    } else {
      const { stream, error } = await getUserCamera(); // always initialize both media streams
      
      if (error) {
        result.error = error;
      } else {
        setVideoStream(stream);
      }

      result.newEnabled = stream !== null;
    }
    return result;
  }, [videoStream]);

  /**
   * Toggle audio track on/off
   */
  const toggleAudio = useCallback(async (enabled?: boolean) => {
    const result = { newEnabled: false, error: null as string | null };
    if (audioStream && enabled) {
      const audioTracks = audioStream.getAudioTracks();

      if (audioTracks.length > 0) {
        audioTracks.forEach(audioTrack => {
          audioTrack.stop();
        });

        setAudioStream(null);
        result.newEnabled = false;
      }

    } else if (!isMediaSupported()) {
        const errorMsg = 'Your browser does not support microphone';
        result.error = errorMsg;
    } else {
      const { stream, error } = await getUserAudio(); // always initialize both media streams

      if (error) {
        result.error = error;
      } else {
        setAudioStream(stream);
      }

      result.newEnabled = stream !== null;
    }
    return result;
  }, [audioStream]);

  return {
    videoStream,
    audioStream,
    localStream,
    isLoading,
    error,
    initializeMedia,
    stopMedia,
    toggleVideo,
    toggleAudio,
  };
}