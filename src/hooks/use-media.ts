import { useState, useEffect, useRef, useCallback } from 'react';
import { useCallStore } from '@/store/call-store';
import { getUserMedia, getScreenShare, stopMediaStream, isMediaSupported } from '@/utils/media';
import type { MediaConstraints } from '@/types';

export function useMedia() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenShareStreamRef = useRef<MediaStream | null>(null);

  const {
    localStream,
    setLocalStream,
    callSettings,
    updateCallSettings,
    setError: setCallError,
  } = useCallStore();

  /**
   * Initialize user media stream
   */
  const initializeMedia = useCallback(async (constraints?: MediaConstraints) => {
    if (!isMediaSupported()) {
      const errorMsg = 'Your browser does not support camera and microphone access';
      setError(errorMsg);
      setCallError(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);
    setCallError(null);

    try {
      const stream = await getUserMedia(constraints);
      setLocalStream(stream);

      // Apply initial settings
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (videoTrack) {
        videoTrack.enabled = callSettings.videoEnabled;
      }
      if (audioTrack) {
        audioTrack.enabled = callSettings.audioEnabled;
      }

      return stream;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to access camera and microphone';
      setError(errorMsg);
      setCallError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [callSettings, setLocalStream, setCallError]);

  /**
   * Stop user media stream
   */
  const stopMedia = useCallback(() => {
    if (localStream) {
      stopMediaStream(localStream);
      setLocalStream(null);
    }
    
    if (screenShareStreamRef.current) {
      stopMediaStream(screenShareStreamRef.current);
      screenShareStreamRef.current = null;
      setIsScreenSharing(false);
    }
  }, [localStream, setLocalStream]);

  /**
   * Toggle video on/off
   */
  const toggleVideo = useCallback(() => {
    updateCallSettings({ videoEnabled: !callSettings.videoEnabled });
  }, [callSettings.videoEnabled, updateCallSettings]);

  /**
   * Toggle audio on/off
   */
  const toggleAudio = useCallback(() => {
    updateCallSettings({ audioEnabled: !callSettings.audioEnabled });
  }, [callSettings.audioEnabled, updateCallSettings]);

  /**
   * Start screen sharing
   */
  const startScreenShare = useCallback(async () => {
    try {
      setIsLoading(true);
      const screenStream = await getScreenShare();
      
      // Stop current video if it's on
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          localStream.removeTrack(videoTrack);
        }
      }

      // Add screen share track to existing stream or create new one
      const screenVideoTrack = screenStream.getVideoTracks()[0];
      if (localStream && screenVideoTrack) {
        localStream.addTrack(screenVideoTrack);
      } else {
        setLocalStream(screenStream);
      }

      screenShareStreamRef.current = screenStream;
      setIsScreenSharing(true);
      updateCallSettings({ screenShareEnabled: true });

      // Listen for screen share end
      screenVideoTrack.addEventListener('ended', () => {
        stopScreenShare();
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start screen sharing';
      setError(errorMsg);
      setCallError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [localStream, setLocalStream, updateCallSettings, setCallError]);

  /**
   * Stop screen sharing
   */
  const stopScreenShare = useCallback(async () => {
    if (screenShareStreamRef.current) {
      stopMediaStream(screenShareStreamRef.current);
      screenShareStreamRef.current = null;
    }

    setIsScreenSharing(false);
    updateCallSettings({ screenShareEnabled: false });

    // Restart camera if it was enabled before screen sharing
    if (callSettings.videoEnabled) {
      try {
        const cameraStream = await getUserMedia();
        setLocalStream(cameraStream);
      } catch (err) {
        console.error('Failed to restart camera after screen sharing:', err);
      }
    }
  }, [callSettings.videoEnabled, updateCallSettings, setLocalStream]);

  /**
   * Switch camera (front/back on mobile)
   */
  const switchCamera = useCallback(async () => {
    if (!localStream) return;

    try {
      setIsLoading(true);
      
      const videoTrack = localStream.getVideoTracks()[0];
      const currentFacingMode = videoTrack.getSettings().facingMode;
      
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
      
      const newStream = await getUserMedia({
        video: {
          facingMode: newFacingMode,
        },
        audio: true,
      });

      // Replace the video track
      const newVideoTrack = newStream.getVideoTracks()[0];
      const audioTrack = localStream.getAudioTracks()[0];

      // Create new stream with new video track and existing audio track
      const combinedStream = new MediaStream();
      if (newVideoTrack) combinedStream.addTrack(newVideoTrack);
      if (audioTrack) combinedStream.addTrack(audioTrack);

      // Stop old video track
      videoTrack.stop();
      
      setLocalStream(combinedStream);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to switch camera';
      setError(errorMsg);
      setCallError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [localStream, setLocalStream, setCallError]);

  /**
   * Get available devices
   */
  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        videoInputs: devices.filter(device => device.kind === 'videoinput'),
        audioInputs: devices.filter(device => device.kind === 'audioinput'),
        audioOutputs: devices.filter(device => device.kind === 'audiooutput'),
      };
    } catch (err) {
      console.error('Failed to get devices:', err);
      return { videoInputs: [], audioInputs: [], audioOutputs: [] };
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMedia();
    };
  }, [stopMedia]);

  return {
    localStream,
    isLoading,
    error,
    isScreenSharing,
    initializeMedia,
    stopMedia,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    switchCamera,
    getDevices,
  };
}
