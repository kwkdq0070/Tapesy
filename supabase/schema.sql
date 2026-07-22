-- ============================================================================
-- Tapesy (테이프시) — Supabase 스키마 & RLS
-- Supabase SQL Editor 에 통째로 붙여넣어 실행하세요.
-- 실행 순서: 확장 → 테이블 → 인덱스 → 함수/트리거 → RLS 정책 → Storage 정책
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. 확장
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. profiles — auth.users 와 1:1로 매핑되는 공개 프로필
--    (스키마 문서상 'users' 이지만, Supabase 예약 auth.users 와 구분하기 위해 profiles 사용)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text unique not null,
  display_name text,
  avatar_url  text,
  bio         text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. albums — 앨범(주제) 단위. 공개/비공개는 여기서 결정된다.
-- ---------------------------------------------------------------------------
create table if not exists public.albums (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  title         text not null,
  description   text,
  tags          text[] not null default '{}',
  is_private    boolean not null default false,
  cover_photo_id uuid,          -- photos.id 를 참조 (순환참조라 FK는 아래 ALTER로 지정)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. photos — 특정 앨범에 종속된 개별 사진
-- ---------------------------------------------------------------------------
create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  album_id     uuid not null references public.albums (id) on delete cascade,
  uploader_id  uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,          -- storage 버킷 내부 경로
  caption      text,
  width        int,
  height       int,
  pinned_at    timestamptz,           -- null 이면 미고정. 값이 있으면 업로드일과 무관하게 상단 고정
  created_at   timestamptz not null default now()
);

-- albums.cover_photo_id -> photos.id (사진 삭제 시 커버는 null 로)
alter table public.albums
  drop constraint if exists albums_cover_photo_id_fkey;
alter table public.albums
  add constraint albums_cover_photo_id_fkey
  foreign key (cover_photo_id) references public.photos (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 4. album_collaborators — 공유 앨범 공동 작업자 매핑 (Phase 3)
-- ---------------------------------------------------------------------------
create table if not exists public.album_collaborators (
  album_id   uuid not null references public.albums (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null default 'editor' check (role in ('editor')),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (album_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 4-1. album_member_labels — 공유 앨범을 유저마다 다른 이름/설명으로 부르기
--   (예: 소유자는 "가족", 공동작업자는 "우리 이쁜 가족"으로 각자 다르게 표시)
--   row 가 없으면 albums.title/description 원본을 그대로 사용한다.
-- ---------------------------------------------------------------------------
create table if not exists public.album_member_labels (
  album_id    uuid not null references public.albums (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  title       text,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (album_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 5. follows — 유저 간 프로필 구독
-- ---------------------------------------------------------------------------
create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

-- ---------------------------------------------------------------------------
-- 6. tag_follows — 태그(주제) 구독
-- ---------------------------------------------------------------------------
create table if not exists public.tag_follows (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  tag        text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, tag)
);

-- ---------------------------------------------------------------------------
-- 인덱스
-- ---------------------------------------------------------------------------
create index if not exists idx_albums_owner       on public.albums (owner_id);
create index if not exists idx_albums_tags         on public.albums using gin (tags);
create index if not exists idx_albums_created       on public.albums (created_at desc);
create index if not exists idx_photos_album         on public.photos (album_id);
create index if not exists idx_photos_album_pinned  on public.photos (album_id, pinned_at desc);
create index if not exists idx_collab_user          on public.album_collaborators (user_id);
create index if not exists idx_album_labels_user     on public.album_member_labels (user_id);
create index if not exists idx_follows_followee      on public.follows (followee_id);
create index if not exists idx_tag_follows_tag       on public.tag_follows (tag);

-- ---------------------------------------------------------------------------
-- 함수 / 트리거
-- ---------------------------------------------------------------------------

-- 신규 auth.user 생성 시 profiles 자동 생성 (username 은 이메일 앞부분 + 랜덤 접미)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := lower(regexp_replace(split_part(coalesce(new.email, 'user'), '@', 1), '[^a-z0-9_]', '', 'g'));
  if base_username = '' then base_username := 'user'; end if;
  final_username := base_username;

  -- username 중복 회피
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', final_username),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_albums_touch on public.albums;
create trigger trg_albums_touch
  before update on public.albums
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_album_labels_touch on public.album_member_labels;
create trigger trg_album_labels_touch
  before update on public.album_member_labels
  for each row execute function public.touch_updated_at();

-- 앨범 접근 권한 헬퍼: 현재 유저가 해당 앨범을 볼 수 있는가?
--   공개 앨범이거나, 소유자거나, 공동작업자이면 true
create or replace function public.can_view_album(a_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.albums a
    where a.id = a_id
      and (
        a.is_private = false
        or a.owner_id = auth.uid()
        or exists (
          select 1 from public.album_collaborators c
          where c.album_id = a.id and c.user_id = auth.uid()
        )
      )
  );
$$;

-- 앨범 편집 권한 헬퍼: 소유자 또는 공동작업자
create or replace function public.can_edit_album(a_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.albums a
    where a.id = a_id
      and (
        a.owner_id = auth.uid()
        or exists (
          select 1 from public.album_collaborators c
          where c.album_id = a.id and c.user_id = auth.uid()
        )
      )
  );
$$;

-- 공동작업자 여부만 확인하는 헬퍼.
--   album_collaborators 만 조회하고 albums 는 건드리지 않으므로,
--   albums 의 SELECT/UPDATE 정책에서 써도 RLS 재귀가 없다.
--   또한 albums 를 재조회하지 않아 INSERT ... RETURNING 시 스냅샷 가시성 문제도 없다.
create or replace function public.is_collaborator(a_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.album_collaborators c
    where c.album_id = a_id and c.user_id = auth.uid()
  );
$$;

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================
alter table public.profiles            enable row level security;
alter table public.albums              enable row level security;
alter table public.photos              enable row level security;
alter table public.album_collaborators enable row level security;
alter table public.album_member_labels enable row level security;
alter table public.follows             enable row level security;
alter table public.tag_follows         enable row level security;

-- ---- profiles: 계정은 공개. 본인만 수정 ----
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (true);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---- albums ----
-- 주의: albums 자기 자신의 정책은 함수로 albums 를 재조회하면 안 된다.
--   can_view_album 은 STABLE 이라 INSERT ... RETURNING 시 문(statement) 시작 시점
--   스냅샷을 보게 되어 방금 삽입한 행을 못 찾고 SELECT 정책이 거부 → 42501 발생.
--   따라서 여기서는 평가 대상 '행의 컬럼(is_private, owner_id)'을 직접 참조하고,
--   공동작업자 판별만 album_collaborators 를 보는 is_collaborator() 로 위임한다.
drop policy if exists albums_select on public.albums;
create policy albums_select on public.albums
  for select using (
    is_private = false
    or owner_id = auth.uid()
    or public.is_collaborator(id)
  );

drop policy if exists albums_insert on public.albums;
create policy albums_insert on public.albums
  for insert with check (owner_id = auth.uid());

-- 소유자 또는 공동작업자가 수정 가능
drop policy if exists albums_update on public.albums;
create policy albums_update on public.albums
  for update using (
    owner_id = auth.uid() or public.is_collaborator(id)
  )
  with check (
    owner_id = auth.uid() or public.is_collaborator(id)
  );

drop policy if exists albums_delete on public.albums;
create policy albums_delete on public.albums
  for delete using (owner_id = auth.uid());

-- ---- photos ----
drop policy if exists photos_select on public.photos;
create policy photos_select on public.photos
  for select using (public.can_view_album(album_id));

-- 업로드: 편집 권한 있는 앨범에, 본인이 업로더로
drop policy if exists photos_insert on public.photos;
create policy photos_insert on public.photos
  for insert with check (
    uploader_id = auth.uid() and public.can_edit_album(album_id)
  );

drop policy if exists photos_update on public.photos;
create policy photos_update on public.photos
  for update using (public.can_edit_album(album_id))
  with check (public.can_edit_album(album_id));

-- 삭제: 편집 권한자(소유자/작업자) 또는 본인이 올린 사진
drop policy if exists photos_delete on public.photos;
create policy photos_delete on public.photos
  for delete using (public.can_edit_album(album_id) or uploader_id = auth.uid());

-- ---- album_collaborators ----
-- 조회: 앨범 소유자 또는 본인이 작업자인 경우
drop policy if exists collab_select on public.album_collaborators;
create policy collab_select on public.album_collaborators
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.albums a where a.id = album_id and a.owner_id = auth.uid())
  );

-- 초대(insert): 앨범 소유자만
drop policy if exists collab_insert on public.album_collaborators;
create policy collab_insert on public.album_collaborators
  for insert with check (
    exists (select 1 from public.albums a where a.id = album_id and a.owner_id = auth.uid())
  );

-- 제거(delete): 앨범 소유자, 또는 본인이 스스로 나가기
drop policy if exists collab_delete on public.album_collaborators;
create policy collab_delete on public.album_collaborators
  for delete using (
    user_id = auth.uid()
    or exists (select 1 from public.albums a where a.id = album_id and a.owner_id = auth.uid())
  );

-- ---- album_member_labels: 본인 것만 보고/쓰고, 편집 권한 있는 앨범에만 설정 가능 ----
drop policy if exists album_labels_select on public.album_member_labels;
create policy album_labels_select on public.album_member_labels
  for select using (user_id = auth.uid());

drop policy if exists album_labels_insert on public.album_member_labels;
create policy album_labels_insert on public.album_member_labels
  for insert with check (
    user_id = auth.uid() and public.can_edit_album(album_id)
  );

drop policy if exists album_labels_update on public.album_member_labels;
create policy album_labels_update on public.album_member_labels
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists album_labels_delete on public.album_member_labels;
create policy album_labels_delete on public.album_member_labels
  for delete using (user_id = auth.uid());

-- ---- follows ----
drop policy if exists follows_select on public.follows;
create policy follows_select on public.follows
  for select using (true);

drop policy if exists follows_insert on public.follows;
create policy follows_insert on public.follows
  for insert with check (follower_id = auth.uid());

drop policy if exists follows_delete on public.follows;
create policy follows_delete on public.follows
  for delete using (follower_id = auth.uid());

-- ---- tag_follows ----
drop policy if exists tag_follows_select on public.tag_follows;
create policy tag_follows_select on public.tag_follows
  for select using (true);

drop policy if exists tag_follows_insert on public.tag_follows;
create policy tag_follows_insert on public.tag_follows
  for insert with check (user_id = auth.uid());

drop policy if exists tag_follows_delete on public.tag_follows;
create policy tag_follows_delete on public.tag_follows
  for delete using (user_id = auth.uid());

-- ============================================================================
-- Storage — 'photos' 버킷 (공개 읽기, 인증 유저 쓰기)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- 공개 읽기
drop policy if exists "photos public read" on storage.objects;
create policy "photos public read" on storage.objects
  for select using (bucket_id = 'photos');

-- 업로드: 로그인한 유저가 '자신의 uid/...' 경로에만 업로드 가능
drop policy if exists "photos user upload" on storage.objects;
create policy "photos user upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 삭제: 본인이 올린 경로만
drop policy if exists "photos user delete" on storage.objects;
create policy "photos user delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 끝.
