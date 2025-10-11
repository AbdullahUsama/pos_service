import { redirect } from 'next/navigation';
import { getServerCurrentUser, getServerUserProfile } from '@/lib/utils/server-auth';
import InventoryInterface from '../../../components/admin/inventory-interface';

export default async function AdminInventoryPage() {
  const user = await getServerCurrentUser();
  
  if (!user) {
    redirect('/auth/login');
  }
  
  const profile = await getServerUserProfile(user.id);
  
  if (!profile || profile.role !== 'admin') {
    redirect('/pos');
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <InventoryInterface userEmail={user.email || ''} />
    </div>
  );
}