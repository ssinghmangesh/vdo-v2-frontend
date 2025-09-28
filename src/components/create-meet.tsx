import { Plus } from "lucide-react";
import React, { useState } from "react";
import { CreateRoomForm } from "@/components/create-room-form";
import ReactModal from 'react-modal';

const CreateMeeting = () => {
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  return (
    <>
        <ReactModal
            isOpen={showCreateRoom}
            onRequestClose={() => setShowCreateRoom(false)}
            className="w-full max-w-md rounded-lg bg-white shadow-xl drop-shadow-xl mx-auto mt-8"
            contentLabel="Create Meeting"
            ariaHideApp={false}
            preventScroll={true}
        >
            <CreateRoomForm onCancel={() => setShowCreateRoom(false)} />
        </ReactModal>
        <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
        <div className="text-center">
            <div className="bg-blue-100 rounded-full p-6 w-20 h-20 mx-auto mb-4">
            <Plus className="h-8 w-8 text-blue-600 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Create Meeting
            </h3>
            <p className="text-gray-600 mb-6">
            Start a new video call and invite others
            </p>
            <button
            onClick={() => setShowCreateRoom(true)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
            Create Meeting
            </button>
        </div>
        </div>
    </>
  );
};

export default CreateMeeting;
