'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// 태그(주제) 구독 토글.
export function TagFollowButton({
  tag,
  initialFollowing,
}: {
  tag: string;
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [me, setMe] = useState<string | null>(null);
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle() {
    if (!me) {
      router.push('/login');
      return;
    }
    setLoading(true);
    if (following) {
      await supabase
        .from('tag_follows')
        .delete()
        .eq('user_id', me)
        .eq('tag', tag);
      setFollowing(false);
    } else {
      await supabase.from('tag_follows').insert({ user_id: me, tag });
      setFollowing(true);
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
        following
          ? 'border border-tape-accent bg-white text-tape-accent'
          : 'bg-tape-accent text-white hover:brightness-95'
      }`}
    >
      {loading && (
        <span
          className={`h-3 w-3 animate-spin rounded-full border-2 border-t-transparent ${
            following ? 'border-tape-accent' : 'border-white'
          }`}
        />
      )}
      {following ? '구독 중' : `#${tag} 구독`}
    </button>
  );
}
