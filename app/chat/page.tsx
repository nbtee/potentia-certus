import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ChatPageContent } from '@/components/ai-chat/chat-page-content';

export default async function ChatPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user's dashboards for the target selector
  const { data: dashboards } = await supabase
    .from('dashboards')
    .select('id, name, is_template')
    .or(`owner_id.eq.${user.id},is_shared.eq.true`)
    .eq('is_template', false)
    .order('updated_at', { ascending: false });

  return (
    <ChatPageContent dashboards={dashboards ?? []} />
  );
}
