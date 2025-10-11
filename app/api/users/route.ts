import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { userIds } = await request.json();
  
  if (!userIds || !Array.isArray(userIds)) {
    return NextResponse.json({ error: 'Invalid user IDs' }, { status: 400 });
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  try {
    const userEmails: Record<string, string> = {};
    
    for (const userId of userIds) {
      const { data: userData, error } = await supabase.auth.admin.getUserById(userId);
      if (!error && userData.user) {
        userEmails[userId] = userData.user.email || 'Unknown';
      } else {
        userEmails[userId] = 'Unknown';
      }
    }

    return NextResponse.json({ userEmails });
  } catch (error) {
    console.error('Error fetching user emails:', error);
    return NextResponse.json({ error: 'Failed to fetch user emails' }, { status: 500 });
  }
}