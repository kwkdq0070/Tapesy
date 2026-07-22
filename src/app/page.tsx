import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { decorateAlbums, fetchAlbumPage, type AlbumFilter } from '@/lib/queries';
import { LoadMoreAlbums } from '@/components/LoadMoreAlbums';
import { ProfileTabs } from '@/components/ProfileTabs';
import { AlbumCard } from '@/components/AlbumCard';
import type { Album } from '@/lib/types';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 비로그인: 랜딩 + 최신 공개 앨범
  if (!user) {
    const filter: AlbumFilter = { type: 'public' };
    const { page, hasMore } = await fetchAlbumPage(supabase, filter);
    const albums = await decorateAlbums(supabase, page);

    return (
      <main>
        <section className="mb-10 rounded-3xl bg-white p-8 text-center shadow-sm sm:p-12">
          <span className="text-4xl">📼</span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-tape-ink sm:text-4xl">
            주제로 기록하고, 주제로 구독하다
          </h1>
          <p className="mx-auto mt-3 max-w-md text-tape-muted">
            사람이 아닌 <b className="text-tape-ink">앨범</b>을 팔로우하세요.
            공개·비공개를 앨범 단위로 정하고, 친구와 함께 하나의 앨범을 꾸밀 수
            있어요.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-full bg-tape-accent px-6 py-3 font-semibold text-white transition hover:brightness-95"
          >
            Google로 시작하기
          </Link>
        </section>

        <h2 className="mb-4 text-lg font-bold text-tape-ink">
          최근 올라온 공개 앨범
        </h2>
        <LoadMoreAlbums
          filter={filter}
          initialAlbums={albums}
          initialHasMore={hasMore}
          emptyText="아직 공개된 앨범이 없어요."
        />
      </main>
    );
  }

  // 로그인: 홈 = 내 앨범(라이브러리).
  //   구독 피드는 팔로우가 0명인 신규 유저에게는 항상 비어 보이는 화면이라,
  //   홈 자리는 "내가 만든 것"으로 채우고 구독 피드는 /explore 의 팔로잉 토글로 옮겼다.
  const [{ data: publicRows }, { data: privateRows }] = await Promise.all([
    supabase
      .from('albums')
      .select(
        'id, owner_id, title, description, tags, is_private, cover_photo_id, created_at, updated_at'
      )
      .eq('owner_id', user.id)
      .eq('is_private', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('albums')
      .select(
        'id, owner_id, title, description, tags, is_private, cover_photo_id, created_at, updated_at'
      )
      .eq('owner_id', user.id)
      .eq('is_private', true)
      .order('created_at', { ascending: false }),
  ]);

  const [publicAlbums, privateAlbums] = await Promise.all([
    decorateAlbums(supabase, (publicRows as Album[]) ?? [], user.id),
    decorateAlbums(supabase, (privateRows as Album[]) ?? [], user.id),
  ]);

  // 공유받은 앨범(내가 소유자는 아니지만 공동작업자로 초대된 것) —
  // 초대받은 앨범을 발견할 수 있는 유일한 목록이라, 여기서도 내 별칭이 보이게 한다.
  const { data: collabRows } = await supabase
    .from('album_collaborators')
    .select('album_id')
    .eq('user_id', user.id);
  const collabAlbumIds = (collabRows ?? []).map((c) => c.album_id);

  let sharedAlbums: Awaited<ReturnType<typeof decorateAlbums>> = [];
  if (collabAlbumIds.length > 0) {
    const { data: sharedRows } = await supabase
      .from('albums')
      .select(
        'id, owner_id, title, description, tags, is_private, cover_photo_id, created_at, updated_at'
      )
      .in('id', collabAlbumIds)
      .order('created_at', { ascending: false });
    sharedAlbums = await decorateAlbums(
      supabase,
      (sharedRows as Album[]) ?? [],
      user.id
    );
  }

  return (
    <main>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-tape-ink">내 앨범</h1>
        <Link
          href="/albums/new"
          className="rounded-full bg-tape-accent px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
        >
          + 새 앨범 만들기
        </Link>
      </div>

      <ProfileTabs
        publicAlbums={publicAlbums}
        privateAlbums={privateAlbums}
        canSeePrivate
        showCreateTile
      />

      {sharedAlbums.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-tape-ink">
            공유받은 앨범
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {sharedAlbums.map((a) => (
              <AlbumCard key={a.id} album={a} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
