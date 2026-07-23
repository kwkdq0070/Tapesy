import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { decorateAlbums, fetchAlbumPage, type AlbumFilter } from '@/lib/queries';
import { LoadMoreAlbums } from '@/components/LoadMoreAlbums';
import { TagFollowButton } from '@/components/TagFollowButton';
import { TagSearchBox } from '@/components/TagSearchBox';

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; feed?: string }>;
}) {
  const { tag: rawTag, feed: rawFeed } = await searchParams;
  const tag = rawTag?.trim().replace(/^#/, '').toLowerCase() || '';
  const feedMode = rawFeed === 'following' ? 'following' : 'all';
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 태그 검색 중이면 항상 전체 공개 검색(발견 모드), 아니면 전체/팔로잉 토글을 따른다.
  let filter: AlbumFilter = { type: 'public' };
  let hasSubscriptions = false;

  if (tag) {
    filter = { type: 'tag', tag };
  } else if (feedMode === 'following' && user) {
    const [{ data: follows }, { data: tagFollows }] = await Promise.all([
      supabase.from('follows').select('followee_id').eq('follower_id', user.id),
      supabase.from('tag_follows').select('tag').eq('user_id', user.id),
    ]);
    const followedIds = (follows ?? []).map((f) => f.followee_id);
    const followedTags = (tagFollows ?? []).map((t) => t.tag);
    hasSubscriptions = followedIds.length > 0 || followedTags.length > 0;
    if (hasSubscriptions) filter = { type: 'feed', followedIds, followedTags };
  }

  // "팔로잉" 탭인데 구독이 하나도 없으면, 헷갈리지 않게 전체 공개 결과로 몰래 대체하지 않고
  // 명시적으로 "아직 구독이 없어요" 빈 상태를 보여준다.
  const showFollowingEmpty =
    feedMode === 'following' && !tag && user && !hasSubscriptions;

  // 아래 세 조회는 서로 의존관계가 없으므로 병렬로 보낸다.
  const [{ page, hasMore }, totalCount, tagFollowing] = await Promise.all([
    showFollowingEmpty
      ? Promise.resolve({ page: [], hasMore: false })
      : fetchAlbumPage(supabase, filter),
    // 태그일 때는 실제 전체 개수를 별도로 센다 (페이지 길이와 다를 수 있어서).
    tag
      ? supabase
          .from('albums')
          .select('*', { count: 'exact', head: true })
          .contains('tags', [tag])
          .then((r) => r.count ?? 0)
      : Promise.resolve(null),
    // 태그 구독 여부
    user && tag
      ? supabase
          .from('tag_follows')
          .select('tag')
          .eq('user_id', user.id)
          .eq('tag', tag)
          .maybeSingle()
          .then((r) => !!r.data)
      : Promise.resolve(false),
  ]);
  const decorated = await decorateAlbums(supabase, page);

  // 인기 태그: 현재 페이지 기준 태그 빈도 집계 (간단 버전)
  const tagCounts = new Map<string, number>();
  for (const a of page) {
    for (const t of a.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  }
  const popularTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([t]) => t);

  return (
    <main>
      <h1 className="mb-1 text-2xl font-bold text-tape-ink">탐색</h1>
      <p className="mb-5 text-sm text-tape-muted">
        태그를 검색하거나, 구독한 유저·태그의 최신 앨범을 모아보세요.
      </p>

      <TagSearchBox initial={tag} />

      {user && !tag && (
        <div className="mt-4 flex gap-2">
          <Link
            href="/explore"
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              feedMode === 'all'
                ? 'bg-tape-ink text-white'
                : 'bg-white text-tape-muted hover:text-tape-ink'
            }`}
          >
            전체
          </Link>
          <Link
            href="/explore?feed=following"
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              feedMode === 'following'
                ? 'bg-tape-ink text-white'
                : 'bg-white text-tape-muted hover:text-tape-ink'
            }`}
          >
            팔로잉
          </Link>
        </div>
      )}

      {!tag && feedMode === 'all' && popularTags.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-tape-muted">인기 태그</p>
          <div className="flex flex-wrap gap-2">
            {popularTags.map((t) => (
              <Link
                key={t}
                href={`/explore?tag=${encodeURIComponent(t)}`}
                className="rounded-full bg-white px-3 py-1 text-sm text-tape-ink shadow-sm transition hover:text-tape-accent"
              >
                #{t}
              </Link>
            ))}
          </div>
        </div>
      )}

      {tag && (
        <div className="mt-5 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
          <div>
            <p className="text-lg font-bold text-tape-ink">#{tag}</p>
            <p className="text-sm text-tape-muted">
              공개 앨범 {totalCount ?? 0}개
            </p>
          </div>
          <TagFollowButton tag={tag} initialFollowing={tagFollowing} />
        </div>
      )}

      <div className="mt-6">
        {showFollowingEmpty ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white p-10 text-center">
            <p className="text-tape-ink">아직 구독한 유저나 태그가 없어요.</p>
            <p className="mt-1 text-sm text-tape-muted">
              유저를 팔로우하거나 태그를 구독하면 여기 모아볼 수 있어요.
            </p>
            <Link
              href="/explore"
              className="mt-4 inline-block rounded-full bg-tape-accent px-5 py-2.5 text-sm font-semibold text-white hover:brightness-95"
            >
              전체 둘러보기
            </Link>
          </div>
        ) : (
          <LoadMoreAlbums
            filter={filter}
            initialAlbums={decorated}
            initialHasMore={hasMore}
            emptyText={
              tag ? `#${tag} 앨범이 아직 없어요.` : '표시할 앨범이 없어요.'
            }
          />
        )}
      </div>
    </main>
  );
}
