import { io, Socket } from 'socket.io-client';
import type { SocketEvents, User, Room, WebRTCSignal } from '@/types';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private token: string | null = null;
  private serverUrl: string = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3002';
  private eventHandlers: SocketEvents | null = null;

  /**
   * Connect to the signaling server
   */
  connect(
    serverUrl?: string,
    socketEventHandlers?: SocketEvents
  ): Socket {
    // Update stored values if provided
    if (serverUrl) {
      this.serverUrl = serverUrl;
    }
    if (socketEventHandlers) {
      this.eventHandlers = socketEventHandlers;
    }
    if (this.socket) {
      if (this.isConnected) {
        console.log('🔌 Socket already connected, reusing existing connection');
        return this.socket;
      }
      if (this.socket.connected) {
        console.log('🔌 Socket exists and is connected, updating state');
        this.isConnected = true;
        return this.socket;
      }
    }

    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }

    if (!this.token) {
      console.error('🔐 No auth token found - socket connection may fail');
    }

    console.log('🔌 Connecting to signaling server...', { serverUrl: this.serverUrl, hasToken: !!this.token });

    this.socket = io(this.serverUrl, {
      auth: {
        token: this.token,
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    if (this.eventHandlers) {
      this.setupConnectionEvents(this.eventHandlers);
    }

    return this.socket;
  }

  /**
   * Disconnect from the signaling server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Join a room
   */
  joinRoom(roomId: string, user: User): void {
    if (!this.isReady()) return;
    
    console.log('🚪 Joining room:', { roomId, userId: user.id });
    this.socket!.emit('room:join', { roomId, user });
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: string): void {
    if (!this.isReady()) return;
    
    console.log('🚪 Leaving room:', { roomId });
    this.socket!.emit('room:leave', roomId);
    this.socket!.disconnect();
    console.log("✅ Disconnected from socket");
  }

  /**
   * Create a new room
   */
  createRoom(room: Room): void {
    if (!this.isReady()) return;

    console.log('📝 Creating room:', { roomId: room.roomId, roomName: room.name });
    this.socket!.emit('room:create', room);
  }

  /**
   * Send call signal to a peer
   */
  sendCallSignal(to: string, signal: WebRTCSignal, user: User): void {
    if (!this.isReady()) return;
    this.socket!.emit('call-signal', { to, signal, user });
  }

  /**
   * Accept a call and send response signal
   */
  acceptCall(to: string, signal: WebRTCSignal): void {
    if (!this.isReady()) return;
    this.socket!.emit('accept-call', { to, signal });
  }

  /**
   * End a call
   */
  endCall(roomId: string): void {
    if (!this.isReady()) return;
    this.socket!.emit('end-call', roomId);
  }

  /**
   * Send typing indicator
   */
  sendTyping(roomId: string, isTyping: boolean): void {
    if (!this.isReady()) return;
    this.socket!.emit('typing', { roomId, isTyping });
  }

  /**
   * WebRTC Signaling Methods
   */
  sendWebRTCOffer(to: string, from: string, offer: RTCSessionDescriptionInit, roomId: string): void {
    if (!this.isReady()) return;
    console.log('📡 Sending WebRTC offer to:', to);
    this.socket!.emit('webrtc:offer', { to, from, offer, roomId });
  }

  sendWebRTCAnswer(to: string, from: string, answer: RTCSessionDescriptionInit, roomId: string): void {
    if (!this.isReady()) return;
    console.log('📡 Sending WebRTC answer to:', to);
    this.socket!.emit('webrtc:answer', { to, from, answer, roomId });
  }

  sendWebRTCIceCandidate(to: string, from: string, candidate: RTCIceCandidateInit, roomId: string): void {
    if (!this.isReady()) return;
    console.log('🧊 Sending ICE candidate to:', to);
    this.socket!.emit('webrtc:ice-candidate', { to, from, candidate, roomId });
  }

  /**
   * Register event listeners
   */
  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (!this.socket) {
      console.warn('🔌 Socket not initialized, connecting first...');
      this.connect();
      if (!this.socket) {
        console.error('🔌 Cannot register event listener: Failed to initialize socket');
        return;
      }
    }
    console.log(`📡 Registering event listener: ${event as string}`);
    this.socket.on(event as string, callback as (...args: unknown[]) => void);
  }

  /**
   * Remove event listeners
   */
  off<K extends keyof SocketEvents>(event: K, callback?: SocketEvents[K]): void {
    if (!this.socket) {
      console.warn('🔌 Cannot remove event listener: Socket not initialized');
      return;
    }
    console.log(`📡 Removing event listener: ${event as string}`);
    this.socket.off(event as string, callback as (...args: unknown[]) => void);
  }

  /**
   * Emit custom event
   */
  emit(event: string, data?: unknown): void {
    if (!this.isReady()) return;
    this.socket!.emit(event, data);
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Update authentication token and reconnect if needed
   */
  updateToken(token: string): void {
    this.token = token;
    if (this.socket && this.socket.connected) {
      // Reconnect with new token
      this.disconnect();
      this.connect();
    }
  }

  /**
   * Check if ready to emit events
   */
  private isReady(): boolean {
    if (!this.socket) {
      console.log('🔌 Socket not initialized');
      return false;
    }
    
    if (!this.isConnected) {
      console.log('🔌 Socket not connected to server');
      return false;
    }

    return true;
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionEvents(socketEventHandlers: SocketEvents): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to signaling server successfully');
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ Disconnected from signaling server:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      this.isConnected = false;
      
      // Check if it's an authentication error
      if (error.message?.includes('Authentication') || error.message?.includes('token')) {
        console.error('🔐 Authentication failed - check your login status');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected to signaling server after', attemptNumber, 'attempts');
      this.isConnected = true;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🔄 Reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('💀 Failed to reconnect to signaling server');
      this.isConnected = false;
    });

    // Add debugging for all events
    this.socket.onAny((eventName, ...args) => {
      console.log(`🔔 Socket event received: ${eventName}`, args);
      const handler = socketEventHandlers[eventName as keyof SocketEvents];
      if (typeof handler === 'function') {
        try {
          // Type assertion to handle the spread operator
          (handler as (...args: unknown[]) => void)(...args);
        } catch (error) {
          console.error(`❌ Error handling event ${eventName}:`, error);
        }
      }
    });
  }
}

// Export singleton instance
export const socketService = new SocketService();

// Export the class for testing purposes
export { SocketService };
