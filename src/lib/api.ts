// API client for backend communication

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

interface VideoCall {
  _id: string;
  title: string;
  description?: string;
  hostId: string;
  host: User;
  participants: Participant[];
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  status: 'scheduled' | 'waiting' | 'live' | 'ended' | 'cancelled';
  type: 'public' | 'private' | 'invited_only';
  settings: CallSettings;
  roomId: string;
  joinLink: string;
  passcode?: string;
  maxParticipants: number;
  recordingEnabled: boolean;
  recordingUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface Participant {
  userId: string;
  user: User;
  joinedAt: string;
  leftAt?: string;
  role: 'host' | 'moderator' | 'participant' | 'guest';
  isConnected: boolean;
  connectionId?: string;
}

interface CallSettings {
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenShareEnabled: boolean;
  chatEnabled: boolean;
  waitingRoomEnabled: boolean;
  recordingEnabled: boolean;
  backgroundBlurEnabled?: boolean;
  noiseReductionEnabled?: boolean;
  allowParticipantScreenShare: boolean;
  allowParticipantUnmute: boolean;
  autoAdmitGuests: boolean;
}

interface AuthResponse {
  user: User;
  token: string;
  expiresIn: string;
}

export class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') {
    this.baseURL = baseURL;
    
    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}/api${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add authorization header if token exists
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Token management
  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  // Authentication endpoints
  async register(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: {
    email: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Store token on successful login
    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });

    // Clear token on logout
    this.clearToken();
    return response;
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/profile');
  }

  async updateProfile(data: {
    name?: string;
    email?: string;
  }): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<ApiResponse> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    // Update token on successful refresh
    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  // Video call endpoints
  async createCall(data: {
    title: string;
    description?: string;
    scheduledAt?: string;
    type?: 'public' | 'private' | 'invited_only';
    settings?: Partial<CallSettings>;
    maxParticipants?: number;
    passcode?: string;
    invitedUserIds?: string[];
  }): Promise<ApiResponse<VideoCall>> {
    return this.request<VideoCall>('/video-calls', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCalls(params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<VideoCall>> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/video-calls${searchParams.toString() ? `?${searchParams}` : ''}`;
    return this.request<VideoCall[]>(endpoint);
  }

  async getCall(id: string): Promise<ApiResponse<VideoCall>> {
    return this.request<VideoCall>(`/video-calls/${id}`);
  }

  async getCallByRoomId(roomId: string): Promise<ApiResponse<VideoCall>> {
    return this.request<VideoCall>(`/video-calls/room/${roomId}`);
  }

  async updateCall(id: string, data: Partial<VideoCall>): Promise<ApiResponse<VideoCall>> {
    return this.request<VideoCall>(`/video-calls/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCall(id: string): Promise<ApiResponse> {
    return this.request(`/video-calls/${id}`, {
      method: 'DELETE',
    });
  }

  async joinCall(data: {
    roomId: string;
    passcode?: string;
    guestName?: string;
  }): Promise<ApiResponse<{
    call: VideoCall;
    user: User;
    isGuest: boolean;
  }>> {
    return this.request('/video-calls/join', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async endCall(id: string): Promise<ApiResponse<{
    duration: number;
    endedAt: string;
  }>> {
    return this.request(`/video-calls/${id}/end`, {
      method: 'POST',
    });
  }

  async getCallStats(id: string): Promise<ApiResponse<any>> {
    return this.request(`/video-calls/${id}/stats`);
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.request('/health');
  }

  // User stats
  async getUserStats(): Promise<ApiResponse<{
    totalHosted: number;
    totalParticipated: number;
    totalCalls: number;
    activeCalls: number;
    thisMonthCalls: number;
  }>> {
    return this.request('/auth/stats');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types for use in components
export type {
  ApiResponse,
  PaginatedResponse,
  User,
  VideoCall,
  Participant,
  CallSettings,
  AuthResponse,
};
