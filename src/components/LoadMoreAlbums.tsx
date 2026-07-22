'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { decorateAlbums, fetchAlbumPage, type AlbumFilter } from '@/lib/queries';
import { AlbumCard } from './AlbumCard';
import type { AlbumWithOwner } from '@/lib/types';

export function LoadMoreAlbums({
  filter,
  initialAlbums,
  initialHasMore,
  emptyText,
}: {
  filter: AlbumFilter;
  initialAlbums: AlbumWithOwner[];
  initialHasMore: boolean;
  emptyText: string;
}) {
  const supabase = createClient();
  const [albums, setAlbums] = useState(initialAlbums);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    setLoading(true);
    const cursor = albums[albums.length - 1]?.created_at ?? null;
    const { page, hasMore: more } = await fetchAlbumPage(supabase, filter, cursor);
    const decorated = await decorateAlbums(supabase, page);
    setAlbums((prev) => [...prev, ...decorated]);
    setHasMore(more);
    setLoading(false);
  }

  if (albums.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 py-16 text-center text-sm text-tape-muted">
        {emptyText}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {albums.map((a) => (
          <AlbumCard key={a.id} album={a} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-semibold text-tape-ink transition hover:bg-black/5 disabled:opacity-60"
          >
            {loading && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-tape-ink border-t-transparent" />
            )}
            더 보기
          </button>
        </div>
      )}
    </div>
  );
}
