import { Device } from 'mediasoup-client';
import { Transport, Producer, Consumer, RtpCapabilities } from 'mediasoup-client/lib/types';
import { socketService } from './socket';
import { logger } from './logger';

export interface SFUClientConfig {
  roomId: string;
  peerId: string;
  userName: string;
  isHost: boolean;
}

export interface MediaState {
  video: boolean;
  audio: boolean;
  screenShare: boolean;
}

export interface RemoteParticipant {
  peerId: string;
  userName: string;
  consumer: Consumer | null;
  stream: MediaStream | null;
  mediaState: MediaState;
}

export class SFUClient {
  private device: Device;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private producer: Producer | null = null;
  private consumers = new Map<string, Consumer>();
  private remoteParticipants = new Map<string, RemoteParticipant>();
  
  public localStream: MediaStream | null = null;
  public isConnected = false;
  public config: SFUClientConfig;

  // Event callbacks
  public onRemoteStream?: (peerId: string, stream: MediaStream, participant: RemoteParticipant) => void;
  public onRemoteStreamRemoved?: (peerId: string) => void;
  public onConnectionStateChange?: (state: 'connecting' | 'connected' | 'disconnected' | 'failed') => void;
  public onError?: (error: Error) => void;
  public onParticipantJoined?: (participant: RemoteParticipant) => void;
  public onParticipantLeft?: (peerId: string) => void;

  constructor(config: SFUClientConfig) {
    this.config = config;
    this.device = new Device();
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Router RTP capabilities received
    socket.on('sfu:router-rtp-capabilities', async (data) => {
      try {
        await this.device.load({ routerRtpCapabilities: data.rtpCapabilities });
        logger.info('Device loaded with router RTP capabilities');
        
        // Join SFU room
        socket.emit('sfu:join-room', {
          roomId: this.config.roomId,
          rtpCapabilities: this.device.rtpCapabilities,
          participant: {
            peerId: this.config.peerId,
            userId: this.config.peerId,
            socketId: socket.id || '',
            user: {
              _id: this.config.peerId,
              name: this.config.userName,
              email: '',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            joinedAt: new Date(),
            isConnected: true,
            mediaState: {
              videoEnabled: true,
              audioEnabled: true,
              screenShareEnabled: false,
            },
          },
        });
      } catch (error) {
        logger.error('Failed to load device:', error);
        this.onError?.(error as Error);
      }
    });

    // Transport created
    socket.on('sfu:transport-created', async (data) => {
      try {
        if (data.direction === 'send') {
          this.sendTransport = this.device.createSendTransport({
            id: data.id,
            iceParameters: data.iceParameters,
            iceCandidates: data.iceCandidates,
            dtlsParameters: data.dtlsParameters,
          });

          this.setupTransportListeners(this.sendTransport, 'send');
        } else {
          this.recvTransport = this.device.createRecvTransport({
            id: data.id,
            iceParameters: data.iceParameters,
            iceCandidates: data.iceCandidates,
            dtlsParameters: data.dtlsParameters,
          });

          this.setupTransportListeners(this.recvTransport, 'recv');
        }

        logger.info(`${data.direction} transport created:`, data.id);
      } catch (error) {
        logger.error('Failed to create transport:', error);
        this.onError?.(error as Error);
      }
    });

    // Transport connected
    socket.on('sfu:transport-connected', () => {
      logger.info('Transport connected');
    });

    // Producer created
    socket.on('sfu:producer-created', (data) => {
      logger.info('Producer created:', data.id);
      this.onConnectionStateChange?.('connected');
      this.isConnected = true;
    });

    // New producer available
    socket.on('sfu:new-producer', async (data) => {
      try {
        await this.consume(data.producerId);
        logger.info('Started consuming new producer:', data.producerId);
      } catch (error) {
        logger.error('Failed to consume new producer:', error);
      }
    });

    // Consumer created
    socket.on('sfu:consumer-created', async (data) => {
      try {
        const consumer = this.consumers.get(data.id);
        if (consumer) {
          const stream = new MediaStream([consumer.track]);
          
          // Update or create remote participant
          let participant = this.remoteParticipants.get(data.producerPeerId);
          if (!participant) {
            participant = {
              peerId: data.producerPeerId,
              userName: `User ${data.producerPeerId}`,
              consumer: consumer,
              stream: stream,
              mediaState: {
                video: data.kind === 'video',
                audio: data.kind === 'audio',
                screenShare: false,
              },
            };
            this.remoteParticipants.set(data.producerPeerId, participant);
            this.onParticipantJoined?.(participant);
          } else {
            participant.consumer = consumer;
            participant.stream = stream;
          }

          this.onRemoteStream?.(data.producerPeerId, stream, participant);

          // Resume the consumer
          socketService.getSocket()?.emit('sfu:resume-consumer', {
            consumerId: data.id,
          });
        }
      } catch (error) {
        logger.error('Failed to handle consumer created:', error);
      }
    });

    // Consumer resumed
    socket.on('sfu:consumer-resumed', (data) => {
      logger.info('Consumer resumed:', data.consumerId);
    });

    // Consumer closed
    socket.on('sfu:consumer-closed', (data) => {
      const consumer = this.consumers.get(data.consumerId);
      if (consumer) {
        consumer.close();
        this.consumers.delete(data.consumerId);
      }

      // Find and remove participant
      for (const [peerId, participant] of this.remoteParticipants.entries()) {
        if (participant.consumer && participant.consumer.id === data.consumerId) {
          this.remoteParticipants.delete(peerId);
          this.onRemoteStreamRemoved?.(peerId);
          this.onParticipantLeft?.(peerId);
          break;
        }
      }

      logger.info('Consumer closed:', data.consumerId);
    });

    // Producer paused/resumed
    socket.on('sfu:producer-paused', (data) => {
      logger.info(`Producer ${data.paused ? 'paused' : 'resumed'}:`, data.producerId);
    });
  }

  private setupTransportListeners(transport: Transport, direction: 'send' | 'recv') {
    transport.on('connect', ({ dtlsParameters }, callback, errback) => {
      socketService.getSocket()?.emit('sfu:connect-transport', {
        dtlsParameters,
      });

      // Wait for server confirmation
      const socket = socketService.getSocket();
      if (socket) {
        socket.once('sfu:transport-connected', () => {
          callback();
        });

        socket.once('error', (error) => {
          errback(new Error(error.message));
        });
      }
    });

    if (direction === 'send') {
      transport.on('produce', ({ kind, rtpParameters }, callback, errback) => {
        socketService.getSocket()?.emit('sfu:produce', {
          kind,
          rtpParameters,
        });

        // Wait for server response
        const socket = socketService.getSocket();
        if (socket) {
          socket.once('sfu:producer-created', (data) => {
            callback({ id: data.id });
          });

          socket.once('error', (error) => {
            errback(new Error(error.message));
          });
        }
      });
    }

    transport.on('connectionstatechange', (state) => {
      logger.info(`${direction} transport connection state:`, state);
      
      if (state === 'connected') {
        this.onConnectionStateChange?.('connected');
      } else if (state === 'failed' || state === 'disconnected') {
        this.onConnectionStateChange?.('disconnected');
        this.isConnected = false;
      }
    });
  }

  async initialize(): Promise<void> {
    try {
      this.onConnectionStateChange?.('connecting');
      
      // Request router RTP capabilities
      const socket = socketService.getSocket();
      if (!socket) {
        throw new Error('Socket connection required');
      }

      // This will trigger the 'sfu:router-rtp-capabilities' event
      logger.info('Initializing SFU client for room:', this.config.roomId);
      
    } catch (error) {
      logger.error('SFU initialization failed:', error);
      this.onError?.(error as Error);
      throw error;
    }
  }

  async startLocalVideo(videoElement?: HTMLVideoElement): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { min: 15, ideal: 30, max: 60 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.localStream = stream;

      if (videoElement) {
        videoElement.srcObject = stream;
      }

      // Create send transport if not exists
      if (!this.sendTransport) {
        socketService.getSocket()?.emit('sfu:create-transport', {
          direction: 'send',
        });
      } else {
        await this.produce();
      }

      return stream;
    } catch (error) {
      logger.error('Failed to start local video:', error);
      this.onError?.(error as Error);
      throw error;
    }
  }

  private async produce(): Promise<void> {
    if (!this.localStream || !this.sendTransport) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    const audioTrack = this.localStream.getAudioTracks()[0];

    try {
      if (videoTrack && this.device.canProduce('video')) {
        this.producer = await this.sendTransport.produce({
          track: videoTrack,
        });
      }

      if (audioTrack && this.device.canProduce('audio')) {
        await this.sendTransport.produce({
          track: audioTrack,
        });
      }
    } catch (error) {
      logger.error('Failed to produce media:', error);
      throw error;
    }
  }

  private async consume(producerId: string): Promise<void> {
    if (!this.recvTransport) {
      // Create receive transport if not exists
      socketService.getSocket()?.emit('sfu:create-transport', {
        direction: 'recv',
      });
      return;
    }

    try {
      socketService.getSocket()?.emit('sfu:consume', {
        producerId,
        rtpCapabilities: this.device.rtpCapabilities,
      });

    } catch (error) {
      logger.error('Failed to consume:', error);
      throw error;
    }
  }

  async toggleVideo(enabled: boolean): Promise<void> {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = enabled;
    }

    if (this.producer && this.producer.kind === 'video') {
      if (enabled) {
        await this.producer.resume();
      } else {
        await this.producer.pause();
      }

      socketService.getSocket()?.emit('sfu:pause-producer', {
        pause: !enabled,
      });
    }
  }

  async toggleAudio(enabled: boolean): Promise<void> {
    if (!this.localStream) return;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = enabled;
    }

    // Find audio producer and pause/resume
    socketService.getSocket()?.emit('sfu:pause-producer', {
      pause: !enabled,
    });
  }

  async startScreenShare(): Promise<MediaStream> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { max: 1920 },
          height: { max: 1080 },
          frameRate: { max: 30 },
        },
        audio: true,
      });

      // Replace video track with screen share
      if (this.producer && this.sendTransport) {
        const videoTrack = screenStream.getVideoTracks()[0];
        await this.producer.replaceTrack({ track: videoTrack });
      }

      return screenStream;
    } catch (error) {
      logger.error('Failed to start screen share:', error);
      this.onError?.(error as Error);
      throw error;
    }
  }

  async stopScreenShare(): Promise<void> {
    if (!this.localStream) return;

    // Get original video track
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (this.producer && videoTrack) {
      await this.producer.replaceTrack({ track: videoTrack });
    }
  }

  getRemoteParticipants(): RemoteParticipant[] {
    return Array.from(this.remoteParticipants.values());
  }

  async disconnect(): Promise<void> {
    try {
      // Close all consumers
      for (const consumer of this.consumers.values()) {
        consumer.close();
      }
      this.consumers.clear();

      // Close producer
      if (this.producer) {
        this.producer.close();
        this.producer = null;
      }

      // Close transports
      if (this.sendTransport) {
        this.sendTransport.close();
        this.sendTransport = null;
      }

      if (this.recvTransport) {
        this.recvTransport.close();
        this.recvTransport = null;
      }

      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Clear participants
      this.remoteParticipants.clear();

      this.isConnected = false;
      this.onConnectionStateChange?.('disconnected');

      logger.info('SFU client disconnected');
    } catch (error) {
      logger.error('Error during disconnect:', error);
      throw error;
    }
  }
}

// Export for use in components
export { Device } from 'mediasoup-client';
