'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// 앨범 단위 구독 토글. 구독하면 이 앨범에 새 사진이 올라올 때 알림을 받는다.
export function AlbumFollowButton({
  albumId,
  initialFollowing,
}: {
  albumId: string;
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      setLoading(false);
      return;
    }

    if (following) {
      await supabase
        .from('album_follows')
        .delete()
        .eq('user_id', user.id)
        .eq('album_id', albumId);
      setFollowing(false);
    } else {
      await supabase
        .from('album_follows')
        .insert({ user_id: user.id, album_id: albumId });
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
          : 'border border-black/10 bg-white text-tape-ink hover:bg-black/5'
      }`}
    >
      {loading && (
        <span
          className={`h-3 w-3 animate-spin rounded-full border-2 border-t-transparent ${
            following ? 'border-tape-accent' : 'border-tape-ink'
          }`}
        />
      )}
      {following ? '🔔 구독 중' : '🔔 이 앨범 구독'}
    </button>
  );
}
