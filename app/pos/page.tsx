import { redirect } from 'next/navigation';
import { getServerCurrentUser, getServerUserProfile } from '@/lib/utils/server-auth';
import POSInterface from '@/components/pos/pos-interface';

export default async function POSPage() {
  const user = await getServerCurrentUser();
  
  if (!user) {
    redirect('/auth/login');
  }
  
  const profile = await getServerUserProfile(user.id);
  
  if (!profile || profile.role === 'admin') {
    redirect('/admin');
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <POSInterface userId={user.id} userEmail={user.email || ''} />
    </div>
  );
}