import { redirect } from 'next/navigation';
import { getServerCurrentUser, getServerUserProfile } from '@/lib/utils/server-auth';
import SalesReportInterface from '../../../components/admin/sales-report-interface';

export default async function AdminSalesPage() {
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
      <SalesReportInterface userEmail={user.email || ''} />
    </div>
  );
}