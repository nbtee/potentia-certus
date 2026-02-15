import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Pattern from Supabase docs: create response that will be mutated by setAll
    let response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
            console.log('[ROUTE] setAll called with', cookiesToSet.length, 'cookies');
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });
            // Recreate response to ensure cookies are attached
            response = NextResponse.json({ success: true });
            cookiesToSet.forEach(({ name, value, options }) => {
              console.log('[ROUTE] Setting cookie:', name);
              response.cookies.set(name, value, options);
            });
            console.log('[ROUTE] Cookies set on response');
          },
        },
      }
    );

    console.log('[ROUTE] Auth client created, calling signInWithPassword');
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('[ROUTE] signInWithPassword result:', {
      error: error?.message,
      hasSession: !!data.session,
      hasUser: !!data.user
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.session) {
      console.error('[ROUTE] No session returned from Supabase!');
      return NextResponse.json({ error: 'No session created' }, { status: 500 });
    }

    console.log('[ROUTE] Returning response');
    return response;
  } catch (err) {
    console.error('Login API error:', err);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
