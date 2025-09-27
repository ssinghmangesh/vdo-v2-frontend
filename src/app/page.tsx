'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Plus, Users, Globe, Shield, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { AuthForm } from '@/components/auth-form';
import { CreateRoomForm } from '@/components/create-room-form';
import { generateRoomId } from '@/utils/common';
import { Toaster } from 'react-hot-toast';

export default function Home() {
  const router = useRouter();
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { isAuthenticated, checkAuth } = useAuthStore();

  // Check authentication on app load
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect if already authenticated and has room
  useEffect(() => {
    // Check if there's a room ID in the URL params
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    if (roomId && isAuthenticated) {
      router.push(`/room/${roomId}`);
    }
  }, [isAuthenticated, router]);

  const handleQuickJoin = async () => {
    if (!joinRoomId.trim()) return;
    
    setIsJoining(true);
    try {
      // Navigate to room
      router.push(`/room/${joinRoomId.trim()}`);
    } catch (error) {
      console.error('Failed to join room:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleInstantMeeting = () => {
    const roomId = generateRoomId();
    router.push(`/room/${roomId}?instant=true`);
  };

  // Show authentication form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
          {/* Hero Section */}
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start mb-6">
              <Video className="h-12 w-12 text-blue-600 mr-4" />
              <h1 className="text-4xl font-bold text-gray-900">VideoCall</h1>
            </div>
            
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Connect instantly with high-quality video calls
            </h2>
            
            <p className="text-xl text-gray-600 mb-8">
              Secure, reliable, and easy-to-use video conferencing for teams and individuals
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="bg-white rounded-lg p-4 shadow-sm mb-3">
                  <Globe className="h-8 w-8 text-blue-600 mx-auto" />
                </div>
                <h3 className="font-semibold text-gray-900">Global Reach</h3>
                <p className="text-sm text-gray-600">Connect with anyone, anywhere</p>
              </div>
              
              <div className="text-center">
                <div className="bg-white rounded-lg p-4 shadow-sm mb-3">
                  <Shield className="h-8 w-8 text-green-600 mx-auto" />
                </div>
                <h3 className="font-semibold text-gray-900">Secure</h3>
                <p className="text-sm text-gray-600">End-to-end encrypted calls</p>
              </div>
              
              <div className="text-center">
                <div className="bg-white rounded-lg p-4 shadow-sm mb-3">
                  <Zap className="h-8 w-8 text-yellow-600 mx-auto" />
                </div>
                <h3 className="font-semibold text-gray-900">Lightning Fast</h3>
                <p className="text-sm text-gray-600">Instant connection setup</p>
              </div>
            </div>
          </div>

          {/* Authentication Form */}
          <div className="flex justify-center lg:justify-end">
            <AuthForm />
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard for authenticated users
  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Video className="h-8 w-8 text-blue-600 mr-3" />
                <h1 className="text-xl font-bold text-gray-900">VDO</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => useAuthStore.getState().logout()}
                  className="text-red-600 cursor-pointer hover:text-gray-900"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Start your meeting
            </h2>
            <p className="text-xl text-gray-600">
              Create a new room or join an existing one
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full p-6 w-20 h-20 mx-auto mb-4">
                  <Plus className="h-8 w-8 text-blue-600 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Create Room
                </h3>
                <p className="text-gray-600 mb-6">
                  Start a new video call room and invite others
                </p>
                <button
                  onClick={() => setShowCreateRoom(true)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Room
                </button>
              </div>
            </div>

            {/* Join Room */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-center">
                <div className="bg-green-100 rounded-full p-6 w-20 h-20 mx-auto mb-4">
                  <Users className="h-8 w-8 text-green-600 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Join Room
                </h3>
                <p className="text-gray-600 mb-4">
                  Enter a room ID to join an existing call
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter room ID"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={handleQuickJoin}
                    disabled={!joinRoomId.trim() || isJoining}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isJoining ? 'Joining...' : 'Join Room'}
                  </button>
                </div>
              </div>
            </div>

            {/* Instant Meeting */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow md:col-span-2 lg:col-span-1">
              <div className="text-center">
                <div className="bg-purple-100 rounded-full p-6 w-20 h-20 mx-auto mb-4">
                  <Zap className="h-8 w-8 text-purple-600 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Instant Meeting
                </h3>
                <p className="text-gray-600 mb-6">
                  Start a quick meeting right now
                </p>
                <button
                  onClick={handleInstantMeeting}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Start Now
                </button>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Why Choose VideoCall?
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <Video className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 mb-2">HD Video</h4>
                <p className="text-sm text-gray-600">Crystal clear video quality</p>
              </div>
              <div className="text-center">
                <Users className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 mb-2">Multiple Participants</h4>
                <p className="text-sm text-gray-600">Host up to 100 participants</p>
              </div>
              <div className="text-center">
                <Globe className="h-12 w-12 text-purple-600 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 mb-2">Screen Share</h4>
                <p className="text-sm text-gray-600">Share your screen with others</p>
              </div>
              <div className="text-center">
                <Shield className="h-12 w-12 text-red-600 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 mb-2">Secure</h4>
                <p className="text-sm text-gray-600">End-to-end encrypted calls</p>
              </div>
            </div>
          </div>
        </main>

        {/* Create Room Modal */}
        {showCreateRoom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <CreateRoomForm
              onSuccess={() => setShowCreateRoom(false)}
              onCancel={() => setShowCreateRoom(false)}
            />
          </div>
        )}
      </div>
    </>
  );
}