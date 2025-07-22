'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '../../lib/auth';
import AdminMemberManagement from '../../components/AdminMemberManagement';
import PageLayout from '../../components/PageLayout';
import { User } from '../../types/auth';

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = AuthService.getToken();
        if (!token) {
          router.push('/login');
          return;
        }

        const userData = await AuthService.fetchUserWithMember();
        setUser(userData);

        // Prüfe ob der Benutzer Admin-Berechtigung hat
        const hasAdminAccess = userData.mitglied?.attributes.benutzerrolle === 'admin' || 
                              userData.mitglied?.attributes.benutzerrolle === 'vorstand' ||
                              userData.mitglied?.attributes.mitgliedstyp === 'funktionaer';

        if (!hasAdminAccess) {
          router.push('/dashboard');
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </PageLayout>
    );
  }

  if (!isAuthorized) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">Zugriff verweigert</h1>
            <p className="text-slate-600">Sie haben keine Berechtigung für diesen Bereich.</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <AdminMemberManagement />
    </PageLayout>
  );
} 