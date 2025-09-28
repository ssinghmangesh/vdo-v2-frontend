'use client';

import { useEffect, useState } from 'react';
import { Users, Lock, Unlock, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { useRoom } from '@/hooks/use-room';
import { isValidRoomName, cn } from '@/utils/common';
import toast from 'react-hot-toast';

interface CreateRoomFormProps {
  className?: string;
  onCancel?: () => void;
}

export function CreateRoomForm({ 
  className, 
  onCancel 
}: CreateRoomFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    isPrivate: false,
    maxParticipants: 10,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdRoomUrl, setCreatedRoomUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  
  const { createRoomWithUrl, isLoading, currentRoom } = useRoom();

  useEffect(() => {
    if (currentRoom) {
      const url = `${window.location.origin}/room/${currentRoom.id}`;
      setCreatedRoomUrl(url);
      toast.success('Meeting created successfully!');
    }
  }, [currentRoom]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Meeting agenda is required';
    } else if (!isValidRoomName(formData.name)) {
      newErrors.name = 'Meeting agenda must be between 3 and 50 characters';
    }

    if (formData.maxParticipants < 2 || formData.maxParticipants > 100) {
      newErrors.maxParticipants = 'Max participants must be between 2 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    await createRoomWithUrl(formData);
  };

  const handleInputChange = (field: keyof typeof formData, value: unknown) => {
    if (value && field === 'maxParticipants' && (value as number) > 100) return;  
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const numberInputOnWheelPreventChange = (e: React.WheelEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).blur()

    e.stopPropagation()

    setTimeout(() => {
        (e.target as HTMLInputElement).focus()
    }, 0)
  }

  const handleCopyUrl = async () => {
    if (!createdRoomUrl) return;
    
    try {
      await navigator.clipboard.writeText(createdRoomUrl);
      setIsCopied(true);
      toast.success('Room URL copied to clipboard!');
      
      // Reset copy state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  const handleJoinRoom = () => {
    if (createdRoomUrl) {
      window.location.href = createdRoomUrl;
    }
  };

  const handleCreateAnother = () => {
    setCreatedRoomUrl('');
    setFormData({
      name: '',
      isPrivate: false,
      maxParticipants: 10,
    });
    setErrors({});
    setIsCopied(false);
  };

  // If room URL is created, show the success screen
  if (createdRoomUrl) {
    return (
      <div className={cn(
        'w-full max-w-md rounded-lg bg-white p-6 shadow-lg',
        className
      )}>
        <div className="mb-6 text-center">
          <div className="mb-4 mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Meeting Created Successfully!
          </h2>
          <p className="text-gray-600">
            Share this link with others to invite them to join
          </p>
        </div>

        {/* Room URL Display */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meeting URL
          </label>
          <div className="flex">
            <input
              type="text"
              value={createdRoomUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-gray-900 text-sm"
            />
            <button
              onClick={handleCopyUrl}
              className={cn(
                "px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg transition-colors",
                isCopied
                  ? "bg-green-100 text-green-700"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              )}
              title="Copy URL"
            >
              {isCopied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3">
          <button
            onClick={handleJoinRoom}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Join Meeting Now
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={handleCreateAnother}
              className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Create Another
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default form view
  return (
    <div className={cn(
      'w-full max-w-md rounded-lg bg-white p-6 shadow-lg',
      className
    )}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Create New Meeting
        </h2>
        <p className="text-gray-600">
          Set up a new video call and invite others to join
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Room Name */}
        <div>
          <label 
            htmlFor="roomName" 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Meeting Agenda
          </label>
          <input
            id="roomName"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500',
              errors.name ? 'border-red-500' : 'border-gray-300'
            )}
            placeholder="Enter meeting agenda"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Privacy Settings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Privacy
          </label>
          <div className="space-y-2">
            <div 
              className={cn(
                'flex items-center rounded-lg border p-3 cursor-pointer transition-colors',
                !formData.isPrivate ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              )}
              onClick={() => handleInputChange('isPrivate', false)}
            >
              <Unlock className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <div className="font-medium text-gray-900">Public Meet</div>
                <div className="text-sm text-gray-600">
                  Anyone with the link can join
                </div>
              </div>
            </div>
            
            <div 
              className={cn(
                'flex items-center rounded-lg border p-3 cursor-pointer transition-colors',
                formData.isPrivate ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              )}
              onClick={() => handleInputChange('isPrivate', true)}
            >
              <Lock className="h-5 w-5 text-orange-600 mr-3" />
              <div>
                <div className="font-medium text-gray-900">Private Meet</div>
                <div className="text-sm text-gray-600">
                  Only invited users can join
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Max Participants */}
        <div>
          <label 
            htmlFor="maxParticipants" 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Maximum Participants
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="maxParticipants"
              type="number"
              min="2"
              max="100"
              onWheel={numberInputOnWheelPreventChange}
              value={formData.maxParticipants}
              onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value) || e.target.value)}
              className={cn(
                'w-full rounded-lg border px-10 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500',
                errors.maxParticipants ? 'border-red-500' : 'border-gray-300'
              )}
              disabled={isLoading}
            />
          </div>
          {errors.maxParticipants && (
            <p className="mt-1 text-sm text-red-600">{errors.maxParticipants}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Creating...
              </div>
            ) : (
              'Create Room'
            )}
          </button>
        </div>
      </form>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Room will be created instantly and you can start inviting participants
        </p>
      </div>
    </div>
  );
}
