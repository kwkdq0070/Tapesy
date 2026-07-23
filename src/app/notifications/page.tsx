import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NotificationItem } from '@/components/NotificationItem';
import { MarkAllReadButton } from '@/components/MarkAllReadButton';
import { BackButton } from '@/components/BackButton';
import type { Profile } from '@/lib/types';

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/notifications');
  }

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, user_id, type, actor_id, album_id, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const list = notifications ?? [];

  const actorIds = Array.from(
    new Set(list.map((n) => n.actor_id).filter((v): v is string => !!v))
  );
  const albumIds = Array.from(
    new Set(list.map((n) => n.album_id).filter((v): v is string => !!v))
  );

  const [{ data: actors }, { data: albums }] = await Promise.all([
    actorIds.length
      ? supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', actorIds)
      : Promise.resolve({
          data: [] as Pick<
            Profile,
            'id' | 'username' | 'display_name' | 'avatar_url'
          >[],
        }),
    albumIds.length
      ? supabase.from('albums').select('id, title').in('id', albumIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);

  const actorMap = new Map((actors ?? []).map((a) => [a.id, a]));
  const albumMap = new Map((albums ?? []).map((a) => [a.id, a.title]));

  const unreadCount = list.filter((n) => !n.read_at).length;

  return (
    <main>
      <BackButton />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-tape-ink">알림</h1>
        {unreadCount > 0 && <MarkAllReadButton />}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 py-16 text-center text-sm text-tape-muted">
          아직 알림이 없어요.
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              actor={n.actor_id ? actorMap.get(n.actor_id) ?? null : null}
              albumTitle={n.album_id ? albumMap.get(n.album_id) ?? null : null}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
