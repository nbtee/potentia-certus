'use server';

import { createClient } from '@/lib/supabase/server';

export interface SavedFilter {
  id: string;
  name: string;
  filter_state: {
    dateRangePreset: string;
    scope: {
      preset: string;
      selectedNodeIds: string[];
    };
  };
  is_default: boolean;
  created_at: string;
}

type ActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: string };

export async function loadFilters(): Promise<ActionResult<SavedFilter[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('saved_filters')
    .select('id, name, filter_state, is_default, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) return { error: error.message };
  return { data: (data ?? []) as SavedFilter[] };
}

export async function saveFilter(
  name: string,
  filterState: SavedFilter['filter_state']
): Promise<ActionResult<SavedFilter>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('saved_filters')
    .insert({
      user_id: user.id,
      name,
      filter_state: filterState,
    })
    .select('id, name, filter_state, is_default, created_at')
    .single();

  if (error) return { error: error.message };
  return { data: data as SavedFilter };
}

export async function deleteFilter(id: string): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('saved_filters')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  return { data: null };
}

export async function setDefaultFilter(id: string | null): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Clear all defaults for this user
  const { error: clearErr } = await supabase
    .from('saved_filters')
    .update({ is_default: false })
    .eq('user_id', user.id)
    .eq('is_default', true);

  if (clearErr) return { error: clearErr.message };

  // Set new default if provided
  if (id) {
    const { error: setErr } = await supabase
      .from('saved_filters')
      .update({ is_default: true })
      .eq('id', id)
      .eq('user_id', user.id);

    if (setErr) return { error: setErr.message };
  }

  return { data: null };
}
