'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AlbumCard } from './AlbumCard';
import type { AlbumWithOwner } from '@/lib/types';

// 공개 앨범 탭 / 비공개 앨범 탭. 비공개 탭은 접근 권한 있는 뷰어에게만 데이터가 채워져 온다.
export function ProfileTabs({
  publicAlbums,
  privateAlbums,
  canSeePrivate,
  showCreateTile = false,
}: {
  publicAlbums: AlbumWithOwner[];
  privateAlbums: AlbumWithOwner[];
  canSeePrivate: boolean;
  // 본인 소유 목록일 때만 true — 그리드에 "+ 새 앨범" 타일을 끼워넣어
  // 앨범이 적을 때 그리드가 빈 여백으로 뚝 끊기지 않고 항상 다음 행동으로 이어지게 한다.
  showCreateTile?: boolean;
}) {
  const [tab, setTab] = useState<'public' | 'private'>('public');
  const albums = tab === 'public' ? publicAlbums : privateAlbums;

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-black/10">
        <TabButton
          active={tab === 'public'}
          onClick={() => setTab('public')}
          label="공개 앨범"
          count={publicAlbums.length}
        />
        {canSeePrivate && (
          <TabButton
            active={tab === 'private'}
            onClick={() => setTab('private')}
            label="비공개 앨범"
            count={privateAlbums.length}
          />
        )}
      </div>

      {albums.length === 0 && !showCreateTile ? (
        <div className="rounded-2xl border border-dashed border-black/10 py-16 text-center text-sm text-tape-muted">
          {tab === 'public'
            ? '공개된 앨범이 아직 없어요.'
            : '비공개 앨범이 없어요.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {showCreateTile && <CreateAlbumTile />}
          {albums.map((a) => (
            <AlbumCard key={a.id} album={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateAlbumTile() {
  return (
    <Link
      href="/albums/new"
      className="group flex flex-col overflow-hidden rounded-2xl border-2 border-dashed border-black/15 bg-white transition hover:border-tape-ink"
    >
      <div className="flex aspect-[4/3] w-full items-center justify-center text-3xl text-black/20 transition group-hover:text-tape-ink">
        ＋
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-tape-muted transition group-hover:text-tape-ink">
          새 앨범 만들기
        </p>
      </div>
    </Link>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
        active
          ? 'border-tape-accent text-tape-ink'
          : 'border-transparent text-tape-muted hover:text-tape-ink'
      }`}
    >
      {label}
      <span className="ml-1.5 text-xs text-tape-muted">{count}</span>
    </button>
  );
}
