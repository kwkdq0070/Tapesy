'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function MarkAllReadButton() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function markAllRead() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={markAllRead}
      disabled={loading}
      className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm font-medium text-tape-muted transition hover:bg-black/5 disabled:opacity-60"
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-tape-ink border-t-transparent" />
      )}
      모두 읽음으로 표시
    </button>
  );
}
