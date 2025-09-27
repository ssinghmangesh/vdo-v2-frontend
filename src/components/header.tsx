import { Video } from 'lucide-react'
import React from 'react'

const Header = ({ handleLogout }: { handleLogout: () => void }) => {
  return (
    <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
                <Video className="h-8 w-8 text-blue-600 mr-3" />
                <h1 className="text-xl font-bold text-gray-900">VDO</h1>
            </div>
            
            <div className="flex items-center space-x-4">
                <button 
                    onClick={handleLogout}
                    className="text-red-600 cursor-pointer hover:text-gray-900"
                >
                    Sign out
                </button>
            </div>
        </div>
        </div>
    </header>
  )
}

export default Header