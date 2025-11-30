import { redirect } from 'next/navigation';
import { getServerCurrentUser, getServerUserProfile } from '@/lib/utils/server-auth';
import AnalyticsInterface from '../../../components/admin/analytics-interface';

export default async function CashierAnalyticsPage() {
  const user = await getServerCurrentUser();
  
  if (!user) {
    redirect('/auth/login');
  }
  
  const profile = await getServerUserProfile(user.id);
  
  if (!profile || profile.role === 'admin') {
    redirect('/admin');
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <AnalyticsInterface userEmail={user.email || ''} />
    </div>
  );
}
