import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>
        ) {
          try {
            console.log('[SERVER] setAll called with', cookiesToSet.length, 'cookies');
            cookiesToSet.forEach(({ name, value, options }) => {
              console.log('[SERVER] Setting cookie:', name);
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            console.error('[SERVER] Error setting cookies:', error);
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
