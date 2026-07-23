'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import type { Notification, Profile } from '@/lib/types';

type ActorLite = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;

export function NotificationItem({
  notification,
  actor,
  albumTitle,
}: {
  notification: Notification;
  actor: ActorLite | null;
  albumTitle: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [read, setRead] = useState(!!notification.read_at);

  const actorName = actor?.display_name ?? actor?.username ?? '누군가';

  let message = '';
  let href = '/';
  switch (notification.type) {
    case 'new_follower':
      message = `${actorName}님이 나를 팔로우했습니다`;
      href = actor ? `/u/${actor.username}` : '/';
      break;
    case 'album_invite':
      message = `${actorName}님이 '${albumTitle ?? '앨범'}'에 공동작업자로 초대했습니다`;
      href = notification.album_id ? `/albums/${notification.album_id}` : '/';
      break;
    case 'new_photo':
      message = `${actorName}님이 '${albumTitle ?? '앨범'}'에 새 사진을 올렸습니다`;
      href = notification.album_id ? `/albums/${notification.album_id}` : '/';
      break;
  }

  async function handleClick() {
    if (!read) {
      setRead(true);
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notification.id);
    }
    router.push(href);
  }

  return (
    <li>
      <button
        onClick={handleClick}
        className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
          read
            ? 'border-black/5 bg-white'
            : 'border-tape-accent/30 bg-tape-accentSoft'
        }`}
      >
        {!read && (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-tape-accent" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-tape-ink">{message}</p>
          <p className="mt-0.5 text-xs text-tape-muted">
            {formatDate(notification.created_at)}
          </p>
        </div>
      </button>
    </li>
  );
}
