import React from 'react'
import { Video, Globe, Shield, Zap } from 'lucide-react'
import { AuthForm } from '@/components/auth-form';


export default function AuthPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
                {/* Hero Section */}
                <div className="text-center lg:text-left hidden lg:block">
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
