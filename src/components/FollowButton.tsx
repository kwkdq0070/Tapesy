'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// 프로필 팔로우/언팔로우 토글. 초기 상태는 서버에서 전달받는다.
export function FollowButton({
  targetId,
  initialFollowing,
}: {
  targetId: string;
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [me, setMe] = useState<string | null>(null);
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setMe(data.user?.id ?? null);
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 로그인 안했거나 본인 프로필이면 버튼 숨김
  if (ready && (!me || me === targetId)) return null;

  async function toggle() {
    if (!me) {
      router.push('/login');
      return;
    }
    setLoading(true);
    if (following) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', me)
        .eq('followee_id', targetId);
      setFollowing(false);
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: me, followee_id: targetId });
      setFollowing(true);
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading || !ready}
      className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
        following
          ? 'border border-black/10 bg-white text-tape-ink hover:bg-black/5'
          : 'bg-tape-accent text-white hover:brightness-95'
      }`}
    >
      {loading && (
        <span
          className={`h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent ${
            following ? 'border-tape-ink' : 'border-white'
          }`}
        />
      )}
      {following ? '팔로잉' : '팔로우'}
    </button>
  );
}
