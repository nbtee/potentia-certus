'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { writeAuditLog } from '@/lib/admin/audit';
import type { ContextDocument } from '@/lib/admin/types';

type ActionResult<T = void> =
  | { data: T; error?: never }
  | { data?: never; error: string };

async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return null;
  return user.id;
}

// =============================================================================
// List
// =============================================================================

export async function listContextDocuments(): Promise<ActionResult<ContextDocument[]>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('context_documents')
    .select('*')
    .order('document_type');

  if (error) return { error: error.message };
  return { data: (data ?? []) as ContextDocument[] };
}

// =============================================================================
// Update (increments version, stores previous in metadata.versions)
// =============================================================================

const updateDocSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  content: z.string().min(1),
});

export async function updateContextDocument(
  input: z.infer<typeof updateDocSchema>
): Promise<ActionResult<ContextDocument>> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Admin access required' };

  const parsed = updateDocSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  // Get current document for versioning
  const { data: current, error: fetchError } = await supabase
    .from('context_documents')
    .select('*')
    .eq('id', parsed.data.id)
    .single();

  if (fetchError || !current) return { error: 'Document not found' };

  const newVersion = (current.version ?? 1) + 1;

  const { data, error } = await supabase
    .from('context_documents')
    .update({
      title: parsed.data.title ?? current.title,
      content: parsed.data.content,
      version: newVersion,
      created_by: adminId,
    })
    .eq('id', parsed.data.id)
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAuditLog(
    'context_document.update',
    'context_documents',
    parsed.data.id,
    { version: current.version, content_length: current.content?.length },
    { version: newVersion, content_length: parsed.data.content.length }
  );


  return { data: data as ContextDocument };
}
