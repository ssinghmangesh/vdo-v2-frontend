'use client';

import { useState } from 'react';
import { Users, Lock, Unlock } from 'lucide-react';
import { useRoom } from '@/hooks/use-room';
import { isValidRoomName, cn } from '@/utils/common';

interface CreateRoomFormProps {
  className?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateRoomForm({ 
  className, 
  onSuccess, 
  onCancel 
}: CreateRoomFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    isPrivate: false,
    maxParticipants: 10,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { createRoom, isCreating } = useRoom();

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

    const room = await createRoom(formData);
    if (room) {
      onSuccess?.();
    }
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
            disabled={isCreating}
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
              disabled={isCreating}
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
              disabled={isCreating}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            disabled={isCreating}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isCreating ? (
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
