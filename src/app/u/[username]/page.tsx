import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { decorateAlbums } from '@/lib/queries';
import { ProfileTabs } from '@/components/ProfileTabs';
import { FollowButton } from '@/components/FollowButton';
import { BackButton } from '@/components/BackButton';
import type { Album } from '@/lib/types';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  // 세션 확인과 프로필 조회는 서로 의존관계가 없으니 병렬로.
  const [
    {
      data: { user },
    },
    { data: profile },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, created_at')
      .eq('username', username.toLowerCase())
      .maybeSingle(),
  ]);

  if (!profile) {
    notFound();
  }

  const isSelf = !!user && user.id === profile.id;

  // 아래는 전부 profile.id(+user.id) 만 있으면 되고 서로 의존관계가 없으므로 한 번에 병렬로.
  const [
    { data: publicRows },
    { data: privateRows },
    { count: followers },
    { count: following },
    initialFollowing,
  ] = await Promise.all([
    // 공개 앨범
    supabase
      .from('albums')
      .select(
        'id, owner_id, title, description, tags, is_private, cover_photo_id, created_at, updated_at'
      )
      .eq('owner_id', profile.id)
      .eq('is_private', false)
      .order('created_at', { ascending: false }),
    // 비공개 앨범 — RLS 가 접근 가능한 것만 반환한다(본인 것/공동작업 중인 것).
    supabase
      .from('albums')
      .select(
        'id, owner_id, title, description, tags, is_private, cover_photo_id, created_at, updated_at'
      )
      .eq('owner_id', profile.id)
      .eq('is_private', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('followee_id', profile.id),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profile.id),
    // 팔로우 상태
    user && !isSelf
      ? supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('followee_id', profile.id)
          .maybeSingle()
          .then((r) => !!r.data)
      : Promise.resolve(false),
  ]);

  const [publicAlbums, privateAlbums] = await Promise.all([
    decorateAlbums(supabase, (publicRows as Album[]) ?? []),
    decorateAlbums(supabase, (privateRows as Album[]) ?? []),
  ]);

  const canSeePrivate = isSelf || privateAlbums.length > 0;

  return (
    <main>
      <BackButton />

      {/* 프로필 헤더 */}
      <div className="mb-8 flex flex-wrap items-center gap-4">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={profile.username}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-tape-accentSoft text-2xl font-bold text-tape-accent">
            {(profile.display_name ?? profile.username).charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-tape-ink">
            {profile.display_name ?? profile.username}
          </h1>
          <p className="text-sm text-tape-muted">@{profile.username}</p>
          {profile.bio && (
            <p className="mt-1 text-sm text-tape-ink">{profile.bio}</p>
          )}
          <div className="mt-2 flex gap-4 text-sm">
            <span>
              <b className="text-tape-ink">{followers ?? 0}</b>{' '}
              <span className="text-tape-muted">팔로워</span>
            </span>
            <span>
              <b className="text-tape-ink">{following ?? 0}</b>{' '}
              <span className="text-tape-muted">팔로잉</span>
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {isSelf ? (
            <>
              <Link
                href="/albums/new"
                className="rounded-full bg-tape-accent px-4 py-1.5 text-sm font-semibold text-white hover:brightness-95"
              >
                + 새 앨범
              </Link>
              <SignOutButton />
            </>
          ) : (
            <FollowButton targetId={profile.id} initialFollowing={initialFollowing} />
          )}
        </div>
      </div>

      <ProfileTabs
        publicAlbums={publicAlbums}
        privateAlbums={privateAlbums}
        canSeePrivate={canSeePrivate}
        showCreateTile={isSelf}
      />
    </main>
  );
}

function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="rounded-lg border border-black/10 bg-white px-4 py-1.5 text-sm font-medium text-tape-muted hover:bg-black/5"
      >
        로그아웃
      </button>
    </form>
  );
}
