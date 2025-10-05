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
): Promise<MediaStream | null> {
  const { state: cameraState } = await navigator.permissions.query({ name: 'camera' as PermissionName });

  if (cameraState === 'denied') constraints.video = false;

  const { state: microphoneState } = await navigator.permissions.query({ name: 'microphone' as PermissionName });

  if (microphoneState === 'denied') constraints.audio = false;

  const stream = cameraState === 'denied' && microphoneState === 'denied' ? null : await navigator.mediaDevices.getUserMedia(constraints);
  return stream;
}

/**
 * Get user camera stream only (video, no audio)
 */
export async function getUserCamera(): Promise<{ stream: MediaStream | null, error: string | null }> {
  const result = { stream: null as MediaStream | null, error: null as string | null };
  try {
    const { state: cameraState } = await navigator.permissions.query({ name: 'camera' as PermissionName });

    if (cameraState === 'denied') {
      result.error = 'Camera access denied';
      return result;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: DEFAULT_CONSTRAINTS.video, audio: false });

    result.stream = stream;
  } catch (error) {
    console.error('Error accessing camera stream:', error);
    result.error = 'Failed to access camera stream';
  }
  return result;
};

/**
 * Get user microphone stream only (audio, no video)
 */
export async function getUserAudio(): Promise<{ stream: MediaStream | null, error: string | null }> {
  const result = { stream: null as MediaStream | null, error: null as string | null };
  try {
    const { state: microphoneState } = await navigator.permissions.query({ name: 'microphone' as PermissionName });

    if (microphoneState === 'denied') {
      result.error = 'Microphone access denied';
      return result;
    }

    result.stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: DEFAULT_CONSTRAINTS.audio });
    return result;
  } catch (error) {
    console.error('Error accessing microphone stream:', error);
    result.error = 'Failed to access microphone stream';
    return result;
  }
}

/**
 * Get screen sharing media stream
 */
export async function getScreenShare(): Promise<MediaStream> {
  try {
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
