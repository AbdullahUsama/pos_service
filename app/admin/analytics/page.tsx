import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AnalyticsInterface from '../../../components/admin/analytics-interface';

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/pos');
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <AnalyticsInterface userEmail={user.email || ''} />
    </div>
  );
}