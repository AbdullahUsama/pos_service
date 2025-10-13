import { redirect } from 'next/navigation';
import { getServerCurrentUser, getServerUserProfile } from '@/lib/utils/server-auth';
import AdminInterface from '@/components/admin/admin-interface';

export default async function AdminPage() {
  const user = await getServerCurrentUser();
  
  if (!user) {
    redirect('/auth/login');
  }
  
  const profile = await getServerUserProfile(user.id);
  
  if (!profile || profile.role !== 'admin') {
    redirect('/pos');
  }
  
  return (
    <div className="min-h-screen bg-background">
      <AdminInterface userEmail={user.email || ''} />
    </div>
  );
}