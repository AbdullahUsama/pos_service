import { redirect } from 'next/navigation';
import { getServerCurrentUser, getServerUserProfile } from '@/lib/utils/server-auth';

export default async function Home() {
  const user = await getServerCurrentUser();
  
  if (!user) {
    redirect('/auth/login');
  }
  
  const profile = await getServerUserProfile(user.id);
  
  if (profile) {
    if (profile.role === 'admin') {
      redirect('/admin');
    } else {
      redirect('/pos');
    }
  } else {
    // If no profile exists, default to cashier role and redirect to POS
    redirect('/pos');
  }
}
