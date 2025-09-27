'use client';
import { useAuthStore } from '@/store/auth-store';
import React, { useLayoutEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation';

const LoadingRedirect = ({ logout }: { logout: () => void }) => {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Loading, Wait a moment...
          </h2>
          <p className="text-gray-300 pb-2">
            If you are not redirected, please click the button below.
          </p>
          <button
            onClick={logout}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Sign in
          </button>
        </div>
      </div>
    )
}

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, checkAuth, isLoading } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();

    const isPublicRoute = ['/auth'].includes(pathname);
    
    useLayoutEffect(() => {
      checkAuth();
    }, [checkAuth]);
  
    useLayoutEffect(() => {
      if (isAuthenticated) {
        router.push('/');
      } else if (!isPublicRoute) {
        router.push('/auth');
      }
    }, [isAuthenticated, router, isPublicRoute]);

    const handleLogout = () => {
        useAuthStore.getState().logout();
        router.push('/auth');
    }

    return (isLoading || !isAuthenticated) && !isPublicRoute ? ( 
        <LoadingRedirect logout={handleLogout} /> 
    ) : (
        <>{children}</>
    )
}

export default AuthProvider;