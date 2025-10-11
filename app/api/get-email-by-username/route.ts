import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { username } = await request.json();
  
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
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
    // Get the user ID from profiles table using username
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();
    
    if (profileError || !profileData) {
      return NextResponse.json({ error: 'Username not found' }, { status: 404 });
    }
    
    // Get the email from auth.users using the service role
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profileData.id);
    
    if (userError || !userData.user || !userData.user.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ email: userData.user.email });
  } catch (error) {
    console.error('Error fetching user email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}