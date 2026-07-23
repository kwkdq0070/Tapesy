import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { PhotoUploader } from '@/components/PhotoUploader';
import { PhotoGrid } from '@/components/PhotoGrid';
import { CollaboratorPanel } from '@/components/CollaboratorPanel';
import { AlbumActions } from '@/components/AlbumActions';
import { AlbumLabelEditor } from '@/components/AlbumLabelEditor';
import { BackButton } from '@/components/BackButton';
import type { Photo, Profile } from '@/lib/types';

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // 세션 확인과 앨범 조회는 서로 의존관계가 없으니 병렬로.
  const [
    {
      data: { user },
    },
    { data: album },
  ] = await Promise.all([
    supabase.auth.getUser(),
    // RLS 로 인해 볼 수 없는 앨범이면 결과가 없다 → notFound
    supabase
      .from('albums')
      .select(
        'id, owner_id, title, description, tags, is_private, cover_photo_id, created_at, updated_at'
      )
      .eq('id', id)
      .maybeSingle(),
  ]);

  if (!album) {
    notFound();
  }

  // 소유자/사진/공동작업자 조회는 서로 의존관계가 없으므로 병렬로 보낸다
  // (순차로 하면 쿼리 수만큼 네트워크 왕복시간이 그대로 누적된다).
  const [{ data: owner }, { data: photos }, { data: collabRows }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', album.owner_id)
        .maybeSingle(),
      // 고정된 사진을 먼저(고정한 시점 최신순), 그다음 나머지를 업로드 최신순으로.
      supabase
        .from('photos')
        .select(
          'id, album_id, uploader_id, storage_path, caption, width, height, pinned_at, created_at'
        )
        .eq('album_id', album.id)
        .order('pinned_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }),
      // 공동작업자 목록 (조인)
      supabase
        .from('album_collaborators')
        .select('user_id, created_at, profiles:user_id (id, username, display_name, avatar_url)')
        .eq('album_id', album.id),
    ]);

  const collaborators =
    collabRows?.map((r) => ({
      user_id: r.user_id,
      created_at: r.created_at,
      profile: (r as unknown as { profiles: CollabProfile }).profiles,
    })) ?? [];

  // 권한 계산: 소유자 or 공동작업자면 편집 가능
  const isOwner = !!user && user.id === album.owner_id;
  const isCollaborator =
    !!user && collaborators.some((c) => c.user_id === user.id);
  const canEdit = isOwner || isCollaborator;

  const photoList: Photo[] = photos ?? [];

  // 내가 이 앨범에 설정해둔 개인 별칭이 있으면 그걸로 덮어써서 보여준다.
  let myLabel: { title: string | null; description: string | null } | null = null;
  if (canEdit && user) {
    const { data } = await supabase
      .from('album_member_labels')
      .select('title, description')
      .eq('album_id', album.id)
      .eq('user_id', user.id)
      .maybeSingle();
    myLabel = data;
  }
  const displayTitle = myLabel?.title || album.title;
  const displayDescription = myLabel?.description ?? album.description;

  return (
    <main>
      <BackButton />

      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              {album.is_private ? (
                <span className="rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
                  🔒 비공개
                </span>
              ) : (
                <span className="rounded-md bg-tape-accentSoft px-2 py-0.5 text-xs font-medium text-tape-accent">
                  공개
                </span>
              )}
              {isCollaborator && !isOwner && (
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                  공유 작업 중
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-tape-ink">{displayTitle}</h1>
            {displayDescription && (
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-tape-muted">
                {displayDescription}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2 text-sm">
              {owner && (
                <Link
                  href={`/u/${owner.username}`}
                  className="font-medium text-tape-ink hover:underline"
                >
                  @{owner.username}
                </Link>
              )}
              <span className="text-tape-muted">·</span>
              <span className="text-tape-muted">
                {formatDate(album.created_at)}
              </span>
              <span className="text-tape-muted">·</span>
              <span className="text-tape-muted">{photoList.length}장</span>
            </div>
            {album.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {album.tags.map((t: string) => (
                  <Link
                    key={t}
                    href={`/explore?tag=${encodeURIComponent(t)}`}
                    className="rounded-full bg-white px-2.5 py-0.5 text-xs text-tape-muted transition hover:text-tape-accent"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 gap-2">
            {canEdit && (
              <AlbumLabelEditor
                albumId={album.id}
                defaultTitle={album.title}
                defaultDescription={album.description ?? ''}
                initialTitle={myLabel?.title ?? ''}
                initialDescription={myLabel?.description ?? ''}
                hasCustomLabel={!!myLabel}
              />
            )}
            {isOwner && <AlbumActions album={album} />}
          </div>
        </div>
      </div>

      {/* Phase 3: 공유 작업자 패널 (소유자만 관리) */}
      {canEdit && (
        <CollaboratorPanel
          albumId={album.id}
          isOwner={isOwner}
          initialCollaborators={collaborators}
        />
      )}

      {/* 업로더 (편집 권한자만) */}
      {canEdit && <PhotoUploader albumId={album.id} />}

      {/* 사진 그리드 */}
      <PhotoGrid
        albumId={album.id}
        photos={photoList}
        coverPhotoId={album.cover_photo_id}
        canEdit={canEdit}
      />

      {photoList.length === 0 && !canEdit && (
        <div className="rounded-2xl border border-dashed border-black/10 py-16 text-center text-tape-muted">
          아직 사진이 없어요.
        </div>
      )}
    </main>
  );
}

type CollabProfile = Pick<
  Profile,
  'id' | 'username' | 'display_name' | 'avatar_url'
>;
