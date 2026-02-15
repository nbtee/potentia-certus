'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function login(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  console.log('Login action called');
  const supabase = await createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error, data: authData } = await supabase.auth.signInWithPassword(data);

  if (error) {
    console.error('Login error:', error);
    return { error: error.message };
  }

  console.log('Login successful for:', authData.user.email);
  console.log('Session:', authData.session);

  // Manually set the session since Server Actions don't persist cookies automatically
  if (authData.session) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    });

    if (sessionError) {
      console.error('Session error:', sessionError);
      return { error: 'Failed to establish session' };
    }

    console.log('Session set successfully');
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function logout() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/');
}
