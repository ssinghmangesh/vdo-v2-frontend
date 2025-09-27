'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

import Header from '@/components/header';
import Dashboard from '@/components/dashboard';

export default function Home() {
  const router = useRouter();

  const handleLogout = () => {
    useAuthStore.getState().logout();
    router.push('/auth');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header handleLogout={handleLogout} />
      <Dashboard />
    </div>
  );
}