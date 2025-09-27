import { io, Socket } from 'socket.io-client';
import type { SocketEvents, User, Room } from '@/types';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  /**
   * Connect to the signaling server
   */
  connect(serverUrl: string = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3002'): Socket {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupConnectionEvents();

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
    if (this.socket) {
      this.socket.emit('room:join', { roomId, user });
    }
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: string): void {
    if (this.socket) {
      this.socket.emit('leave-room', roomId);
    }
  }

  /**
   * Create a new room
   */
  createRoom(room: Omit<Room, 'id' | 'createdAt'>): void {
    if (this.socket) {
      this.socket.emit('room:join', room);
    }
  }

  /**
   * Send call signal to a peer
   */
  sendCallSignal(to: string, signal: any, user: User): void {
    if (this.socket) {
      this.socket.emit('call-signal', { to, signal, user });
    }
  }

  /**
   * Accept a call and send response signal
   */
  acceptCall(to: string, signal: any): void {
    if (this.socket) {
      this.socket.emit('accept-call', { to, signal });
    }
  }

  /**
   * End a call
   */
  endCall(roomId: string): void {
    if (this.socket) {
      this.socket.emit('end-call', roomId);
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping(roomId: string, isTyping: boolean): void {
    if (this.socket) {
      this.socket.emit('typing', { roomId, isTyping });
    }
  }

  /**
   * Register event listeners
   */
  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Remove event listeners
   */
  off<K extends keyof SocketEvents>(event: K, callback?: SocketEvents[K]): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Emit custom event
   */
  emit(event: string, data?: any): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
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
   * Setup connection event handlers
   */
  private setupConnectionEvents(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from signaling server:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.isConnected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected to signaling server after', attemptNumber, 'attempts');
      this.isConnected = true;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect to signaling server');
      this.isConnected = false;
    });
  }
}

// Export singleton instance
export const socketService = new SocketService();

// Export the class for testing purposes
export { SocketService };
