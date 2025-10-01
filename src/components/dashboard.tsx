import { useState } from "react";
import { generateRoomId } from "@/utils/common";
import { Video, Users, Globe, Shield, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import CreateMeeting from "./create-meet";

const Footer = () => (
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
        <h4 className="font-semibold text-gray-900 mb-2">
          Multiple Participants
        </h4>
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
);

const Dashboard = () => {
  const router = useRouter();
  const [joinRoomId, setJoinRoomId] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleQuickJoin = async () => {
    if (!joinRoomId.trim()) return;

    setIsJoining(true);
    try {
      // Navigate to room
      router.push(`/room/${joinRoomId.trim()}`);
    } catch (error) {
      console.error("Failed to join room:", error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleInstantMeeting = () => {
    const roomId = generateRoomId();
    router.push(`/room/${roomId}?instant=true`);
  };
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Start your meeting
        </h2>
        <p className="text-xl text-gray-600">
          Create a new meeting or join an existing one
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        <CreateMeeting />

        {/* Join Room */}
        <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
          <div className="text-center">
            <div className="bg-green-100 rounded-full p-6 w-20 h-20 mx-auto mb-4">
              <Users className="h-8 w-8 text-green-600 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Join Meeting
            </h3>
            <p className="text-gray-600 mb-4">
              Enter a meeting ID to join an existing call
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter meeting ID"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                className="w-full text-green-800 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={handleQuickJoin}
                disabled={!joinRoomId.trim() || isJoining}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isJoining ? "Joining..." : "Join Meeting"}
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
      <Footer />
    </main>
  );
};

export default Dashboard;
