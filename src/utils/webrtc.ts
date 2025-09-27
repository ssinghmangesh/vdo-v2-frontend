import SimplePeer from 'simple-peer';

/**
 * STUN/TURN server configuration for WebRTC
 * In production, you should use your own TURN servers
 */
export const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

/**
 * Create a new peer connection
 */
export function createPeer(
  initiator: boolean,
  trickle: boolean = true,
  stream?: MediaStream
): SimplePeer.Instance {
  const config: SimplePeer.Options = {
    initiator,
    trickle,
    config: ICE_SERVERS,
  };

  if (stream) {
    config.stream = stream;
  }

  return new SimplePeer(config);
}

/**
 * Create an offer peer (initiator)
 */
export function createOfferPeer(stream?: MediaStream): SimplePeer.Instance {
  return createPeer(true, true, stream);
}

/**
 * Create an answer peer (receiver)
 */
export function createAnswerPeer(stream?: MediaStream): SimplePeer.Instance {
  return createPeer(false, true, stream);
}

/**
 * Handle peer connection events
 */
export function setupPeerEvents(
  peer: SimplePeer.Instance,
  callbacks: {
    onSignal?: (signal: SimplePeer.SignalData) => void;
    onConnect?: () => void;
    onData?: (data: any) => void;
    onStream?: (stream: MediaStream) => void;
    onError?: (error: Error) => void;
    onClose?: () => void;
  }
): void {
  if (callbacks.onSignal) {
    peer.on('signal', callbacks.onSignal);
  }

  if (callbacks.onConnect) {
    peer.on('connect', callbacks.onConnect);
  }

  if (callbacks.onData) {
    peer.on('data', callbacks.onData);
  }

  if (callbacks.onStream) {
    peer.on('stream', callbacks.onStream);
  }

  if (callbacks.onError) {
    peer.on('error', callbacks.onError);
  }

  if (callbacks.onClose) {
    peer.on('close', callbacks.onClose);
  }
}

/**
 * Clean up peer connection
 */
export function destroyPeer(peer: SimplePeer.Instance | null): void {
  if (peer && !peer.destroyed) {
    try {
      peer.destroy();
    } catch (error) {
      console.warn('Error destroying peer:', error);
    }
  }
}

/**
 * Check if WebRTC is supported
 */
export function isWebRTCSupported(): boolean {
  return !!(
    window.RTCPeerConnection ||
    // @ts-ignore - legacy browser support
    window.webkitRTCPeerConnection ||
    // @ts-ignore - legacy browser support
    window.mozRTCPeerConnection
  );
}

/**
 * Get WebRTC statistics
 */
export async function getPeerStats(peer: SimplePeer.Instance): Promise<RTCStatsReport | null> {
  try {
    // @ts-ignore - _pc is internal property of SimplePeer
    const pc = peer._pc as RTCPeerConnection;
    if (pc && pc.getStats) {
      return await pc.getStats();
    }
    return null;
  } catch (error) {
    console.warn('Error getting peer stats:', error);
    return null;
  }
}

/**
 * Parse WebRTC statistics for useful metrics
 */
export function parseStats(stats: RTCStatsReport): {
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
  packetsLost: number;
  connectionType: string;
} {
  let bytesReceived = 0;
  let bytesSent = 0;
  let packetsReceived = 0;
  let packetsSent = 0;
  let packetsLost = 0;
  let connectionType = 'unknown';

  stats.forEach((report) => {
    if (report.type === 'inbound-rtp') {
      bytesReceived += report.bytesReceived || 0;
      packetsReceived += report.packetsReceived || 0;
      packetsLost += report.packetsLost || 0;
    } else if (report.type === 'outbound-rtp') {
      bytesSent += report.bytesSent || 0;
      packetsSent += report.packetsSent || 0;
    } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      // Get connection type from the successful candidate pair
      const localCandidate = stats.get(report.localCandidateId);
      if (localCandidate) {
        connectionType = localCandidate.candidateType || 'unknown';
      }
    }
  });

  return {
    bytesReceived,
    bytesSent,
    packetsReceived,
    packetsSent,
    packetsLost,
    connectionType,
  };
}
