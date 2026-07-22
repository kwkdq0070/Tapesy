// Tapesy 도메인 타입 — DB 스키마(schema.sql)와 1:1로 대응.

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export type Album = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  tags: string[];
  is_private: boolean;
  cover_photo_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Photo = {
  id: string;
  album_id: string;
  uploader_id: string;
  storage_path: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  pinned_at: string | null;
  created_at: string;
};

export type AlbumCollaborator = {
  album_id: string;
  user_id: string;
  role: 'editor';
  invited_by: string | null;
  created_at: string;
};

// 유저마다 공유 앨범을 다른 이름/설명으로 부르기 위한 개인화 레이블.
// row 가 없으면 album 의 title/description 원본을 그대로 쓴다.
export type AlbumMemberLabel = {
  album_id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Follow = {
  follower_id: string;
  followee_id: string;
  created_at: string;
};

export type TagFollow = {
  user_id: string;
  tag: string;
  created_at: string;
};

// 조회 시 조인해서 쓰는 뷰 타입
export type AlbumWithOwner = Album & {
  owner: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  cover?: Pick<Photo, 'id' | 'storage_path'> | null;
  photo_count?: number;
};

export const PHOTOS_BUCKET = 'photos';
