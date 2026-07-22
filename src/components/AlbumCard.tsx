import Link from 'next/link';
import { photoPublicUrl } from '@/lib/utils';
import type { AlbumWithOwner } from '@/lib/types';

export function AlbumCard({ album }: { album: AlbumWithOwner }) {
  const cover = album.cover?.storage_path
    ? photoPublicUrl(album.cover.storage_path)
    : null;

  return (
    <Link
      href={`/albums/${album.id}`}
      className="group block overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-tape-accentSoft">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={album.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">
            📼
          </div>
        )}
        {album.is_private && (
          <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
            🔒 비공개
          </span>
        )}
      </div>

      <div className="p-3">
        <h3 className="truncate font-semibold text-tape-ink">{album.title}</h3>
        <div className="mt-1 flex items-center gap-2 text-xs text-tape-muted">
          <span className="truncate">
            @{album.owner.username}
          </span>
          {typeof album.photo_count === 'number' && (
            <>
              <span>·</span>
              <span>{album.photo_count}장</span>
            </>
          )}
        </div>
        {album.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {album.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-full bg-tape-accentSoft px-2 py-0.5 text-[11px] text-tape-muted"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
