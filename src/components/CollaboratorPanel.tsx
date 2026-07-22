'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

type CollabProfile = Pick<
  Profile,
  'id' | 'username' | 'display_name' | 'avatar_url'
>;

type CollabEntry = {
  user_id: string;
  created_at: string;
  profile: CollabProfile;
};

export function CollaboratorPanel({
  albumId,
  isOwner,
  initialCollaborators,
}: {
  albumId: string;
  isOwner: boolean;
  initialCollaborators: CollabEntry[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<{
    kind: 'error' | 'success';
    text: string;
  } | null>(null);

  const collaborators = initialCollaborators;

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const handle = username.trim().replace(/^@/, '').toLowerCase();
    if (!handle) return;

    setInviting(true);
    setMessage(null);

    // 1) username 으로 프로필 조회 (없을 수 있으니 maybeSingle)
    const { data: target } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', handle)
      .maybeSingle();

    if (!target) {
      setMessage({ kind: 'error', text: `@${handle} 유저를 찾을 수 없어요.` });
      setInviting(false);
      return;
    }

    // 2) 공동작업자 추가 (소유자 본인/중복은 아래에서 걸러짐)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (target.id === user?.id) {
      setMessage({ kind: 'error', text: '자기 자신은 초대할 수 없어요.' });
      setInviting(false);
      return;
    }

    const { error } = await supabase.from('album_collaborators').insert({
      album_id: albumId,
      user_id: target.id,
      invited_by: user?.id,
    });

    if (error) {
      // 중복(pk 충돌) 등
      const dup = error.code === '23505';
      setMessage({
        kind: 'error',
        text: dup
          ? '이미 공유 작업자로 추가된 유저예요.'
          : '초대에 실패했습니다.',
      });
      setInviting(false);
      return;
    }

    setMessage({ kind: 'success', text: `@${handle} 님을 초대했어요.` });
    setUsername('');
    setInviting(false);
    router.refresh();
  }

  async function removeCollaborator(userId: string) {
    if (!confirm('이 작업자를 앨범에서 제거할까요?')) return;
    await supabase
      .from('album_collaborators')
      .delete()
      .eq('album_id', albumId)
      .eq('user_id', userId);
    router.refresh();
  }

  async function leave() {
    if (!confirm('이 공유 앨범에서 나갈까요?')) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('album_collaborators')
      .delete()
      .eq('album_id', albumId)
      .eq('user_id', user.id);
    router.refresh();
  }

  return (
    <div className="mb-6 rounded-2xl border border-black/5 bg-white p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-tape-ink">
          👥 공유 작업자
          <span className="rounded-full bg-tape-bg px-2 py-0.5 text-xs font-normal text-tape-muted">
            {collaborators.length}
          </span>
        </span>
        <span className="text-tape-muted">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {/* 목록 */}
          {collaborators.length > 0 ? (
            <ul className="space-y-2">
              {collaborators.map((c) => (
                <li
                  key={c.user_id}
                  className="flex items-center justify-between rounded-lg bg-tape-bg px-3 py-2"
                >
                  <span className="text-sm font-medium text-tape-ink">
                    @{c.profile?.username ?? c.user_id.slice(0, 8)}
                  </span>
                  {isOwner && (
                    <button
                      onClick={() => removeCollaborator(c.user_id)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      제거
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-tape-muted">
              아직 공유 작업자가 없어요.
            </p>
          )}

          {/* 초대 폼 (소유자만) */}
          {isOwner ? (
            <form onSubmit={invite} className="flex gap-2">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="초대할 유저의 아이디 (@username)"
                className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-tape-accent"
              />
              <button
                type="submit"
                disabled={inviting}
                className="flex items-center gap-2 rounded-lg bg-tape-ink px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
              >
                {inviting && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                초대
              </button>
            </form>
          ) : (
            <button
              onClick={leave}
              className="text-sm font-medium text-red-600 hover:underline"
            >
              이 앨범에서 나가기
            </button>
          )}

          {message && (
            <p
              className={`text-sm ${
                message.kind === 'error' ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {message.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
