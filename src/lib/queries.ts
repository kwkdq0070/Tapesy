import type { SupabaseClient } from '@supabase/supabase-js';
import type { Album, AlbumWithOwner, Profile } from './types';

type OwnerLite = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;

const ALBUM_COLUMNS =
  'id, owner_id, title, description, tags, is_private, cover_photo_id, created_at, updated_at';

export const ALBUM_PAGE_SIZE = 12;

// 목록 화면(홈 피드/탐색)에서 재사용하는 필터 종류.
// 서버 컴포넌트의 최초 로드와 클라이언트의 "더 보기" 요청이 동일한 조건으로
// 조회해야 하므로, 조건을 이 직렬화 가능한 값으로 표현해 양쪽에서 공유한다.
export type AlbumFilter =
  | { type: 'public' }
  | { type: 'tag'; tag: string }
  | {
      type: 'feed';
      followedIds: string[];
      followedTags: string[];
      followedAlbumIds?: string[];
    };

function albumsBaseQuery(supabase: SupabaseClient, filter: AlbumFilter) {
  const q = supabase.from('albums').select(ALBUM_COLUMNS);
  switch (filter.type) {
    case 'public':
      return q.eq('is_private', false);
    case 'tag':
      return q.contains('tags', [filter.tag]);
    case 'feed': {
      const orParts: string[] = [];
      if (filter.followedIds.length)
        orParts.push(`owner_id.in.(${filter.followedIds.join(',')})`);
      if (filter.followedTags.length)
        orParts.push(`tags.ov.{${filter.followedTags.join(',')}}`);
      if (filter.followedAlbumIds?.length)
        orParts.push(`id.in.(${filter.followedAlbumIds.join(',')})`);
      return q.eq('is_private', false).or(orParts.join(','));
    }
  }
}

// created_at 기준 커서 페이지네이션으로 앨범 한 페이지를 가져온다.
// cursor 를 넘기면 그보다 더 오래된(과거) 앨범부터 이어서 가져온다.
export async function fetchAlbumPage(
  supabase: SupabaseClient,
  filter: AlbumFilter,
  cursor?: string | null
): Promise<{ page: Album[]; hasMore: boolean }> {
  let q = albumsBaseQuery(supabase, filter)
    .order('created_at', { ascending: false })
    .limit(ALBUM_PAGE_SIZE + 1);
  if (cursor) q = q.lt('created_at', cursor);

  const { data } = await q;
  const rows = (data as Album[]) ?? [];
  const hasMore = rows.length > ALBUM_PAGE_SIZE;
  return { page: hasMore ? rows.slice(0, ALBUM_PAGE_SIZE) : rows, hasMore };
}

// 앨범 제목 / 태그 / 소유자의 아이디·닉네임 으로 통합 검색한다.
// PostgREST 의 .or() 는 값을 직접 문자열로 조립해야 해서 사용자 입력(쉼표, 괄호 등)이
// 섞이면 필터 구문이 깨질 수 있다. 그래서 .or() 대신 개별 쿼리 여러 개를 병렬로 보내고
// 결과를 앱 코드에서 합쳐 중복 제거하는 방식으로 그 위험을 피한다.
export async function searchAlbums(
  supabase: SupabaseClient,
  query: string,
  limit = 30
): Promise<Album[]> {
  const like = `%${query}%`;

  const [{ data: byTitle }, { data: byUsername }, { data: byDisplayName }] =
    await Promise.all([
      supabase
        .from('albums')
        .select(ALBUM_COLUMNS)
        .eq('is_private', false)
        .ilike('title', like)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase.from('profiles').select('id').ilike('username', like),
      supabase.from('profiles').select('id').ilike('display_name', like),
    ]);

  const ownerIds = Array.from(
    new Set([
      ...(byUsername ?? []).map((p) => p.id),
      ...(byDisplayName ?? []).map((p) => p.id),
    ])
  );

  const { data: byOwner } = ownerIds.length
    ? await supabase
        .from('albums')
        .select(ALBUM_COLUMNS)
        .eq('is_private', false)
        .in('owner_id', ownerIds)
        .order('created_at', { ascending: false })
        .limit(limit)
    : { data: [] as Album[] };

  const merged = new Map<string, Album>();
  for (const a of [...((byTitle as Album[]) ?? []), ...((byOwner as Album[]) ?? [])]) {
    merged.set(a.id, a);
  }
  return Array.from(merged.values())
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

// 앨범 행 목록을 받아 소유자/커버/사진수를 배치로 채워 AlbumWithOwner[] 로 만든다.
// (albums→photos 관계가 두 개(cover_photo_id, album_id)라 임베드 모호성을 피하려고 수동 조인)
// viewerId 를 넘기면, 그 유저가 이 앨범들에 설정해둔 개인 별칭(title/description)이
// 있을 경우 album 원본 값 대신 별칭으로 덮어써서 반환한다.
export async function decorateAlbums(
  supabase: SupabaseClient,
  albums: Album[],
  viewerId?: string | null
): Promise<AlbumWithOwner[]> {
  if (albums.length === 0) return [];

  const ownerIds = Array.from(new Set(albums.map((a) => a.owner_id)));
  const albumIds = albums.map((a) => a.id);
  const coverIds = albums
    .map((a) => a.cover_photo_id)
    .filter((v): v is string => !!v);

  const [ownersRes, coversRes, countsRes, labelsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', ownerIds),
    coverIds.length
      ? supabase.from('photos').select('id, storage_path').in('id', coverIds)
      : Promise.resolve({ data: [] as { id: string; storage_path: string }[] }),
    supabase.from('photos').select('album_id').in('album_id', albumIds),
    viewerId
      ? supabase
          .from('album_member_labels')
          .select('album_id, title, description')
          .eq('user_id', viewerId)
          .in('album_id', albumIds)
      : Promise.resolve({
          data: [] as { album_id: string; title: string | null; description: string | null }[],
        }),
  ]);

  const ownerMap = new Map<string, OwnerLite>(
    (ownersRes.data ?? []).map((o) => [o.id, o as OwnerLite])
  );
  const coverMap = new Map<string, { id: string; storage_path: string }>(
    (coversRes.data ?? []).map((c) => [c.id, c])
  );
  const countMap = new Map<string, number>();
  for (const row of countsRes.data ?? []) {
    const k = (row as { album_id: string }).album_id;
    countMap.set(k, (countMap.get(k) ?? 0) + 1);
  }
  const labelMap = new Map(
    (labelsRes.data ?? []).map((l) => [l.album_id, l])
  );

  return albums.map((a) => {
    const label = labelMap.get(a.id);
    return {
      ...a,
      title: label?.title || a.title,
      description: label?.description ?? a.description,
      owner:
        ownerMap.get(a.owner_id) ??
        ({ id: a.owner_id, username: 'unknown', display_name: null, avatar_url: null } as OwnerLite),
      cover: a.cover_photo_id ? coverMap.get(a.cover_photo_id) ?? null : null,
      photo_count: countMap.get(a.id) ?? 0,
    };
  });
}
