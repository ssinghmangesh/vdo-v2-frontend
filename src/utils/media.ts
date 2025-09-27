import type { MediaConstraints } from '@/types';

/**
 * Default media constraints for video calling
 */
export const DEFAULT_CONSTRAINTS: MediaConstraints = {
  video: {
    width: { ideal: 1280, min: 640 },
    height: { ideal: 720, min: 480 },
    frameRate: { ideal: 30, min: 15 },
    facingMode: 'user',
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

/**
 * Screen sharing constraints
 */
export const SCREEN_SHARE_CONSTRAINTS: MediaConstraints = {
  video: {
    cursor: 'always',
  } as MediaTrackConstraints,
  audio: true,
};

/**
 * Get user media stream with specified constraints
 */
export async function getUserMedia(
  constraints: MediaConstraints = DEFAULT_CONSTRAINTS
): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error) {
    console.error('Error accessing user media:', error);
    throw new Error(getMediaErrorMessage(error as DOMException));
  }
}

/**
 * Get screen sharing media stream
 */
export async function getScreenShare(): Promise<MediaStream> {
  try {
    // @ts-ignore - getDisplayMedia exists but might not be in all type definitions
    const stream = await navigator.mediaDevices.getDisplayMedia(SCREEN_SHARE_CONSTRAINTS);
    return stream;
  } catch (error) {
    console.error('Error accessing screen share:', error);
    throw new Error('Failed to start screen sharing. Please check your browser permissions.');
  }
}

/**
 * Stop all tracks in a media stream
 */
export function stopMediaStream(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
}

/**
 * Toggle video track enabled state
 */
export function toggleVideo(stream: MediaStream | null, enabled: boolean): void {
  if (stream) {
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = enabled;
    }
  }
}

/**
 * Toggle audio track enabled state
 */
export function toggleAudio(stream: MediaStream | null, enabled: boolean): void {
  if (stream) {
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = enabled;
    }
  }
}

/**
 * Check if user media is supported
 */
export function isMediaSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Check if screen sharing is supported
 */
export function isScreenShareSupported(): boolean {
  // @ts-ignore - getDisplayMedia might not be in type definitions
  return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
}

/**
 * Get available media devices
 */
export async function getAvailableDevices(): Promise<{
  videoInputs: MediaDeviceInfo[];
  audioInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    return {
      videoInputs: devices.filter(device => device.kind === 'videoinput'),
      audioInputs: devices.filter(device => device.kind === 'audioinput'),
      audioOutputs: devices.filter(device => device.kind === 'audiooutput'),
    };
  } catch (error) {
    console.error('Error enumerating devices:', error);
    return {
      videoInputs: [],
      audioInputs: [],
      audioOutputs: [],
    };
  }
}

/**
 * Get user-friendly error message from media errors
 */
function getMediaErrorMessage(error: DOMException): string {
  switch (error.name) {
    case 'NotFoundError':
      return 'No camera or microphone found. Please connect a device and try again.';
    case 'NotAllowedError':
      return 'Camera and microphone access denied. Please allow permissions and try again.';
    case 'NotReadableError':
      return 'Camera or microphone is already in use by another application.';
    case 'OverconstrainedError':
      return 'Camera or microphone does not meet the required constraints.';
    case 'SecurityError':
      return 'Media access denied due to security restrictions.';
    default:
      return 'Failed to access camera or microphone. Please check your device and try again.';
  }
}
