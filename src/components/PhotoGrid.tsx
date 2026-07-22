'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { photoPublicUrl } from '@/lib/utils';
import { PHOTOS_BUCKET, type Photo } from '@/lib/types';

export function PhotoGrid({
  albumId,
  photos,
  coverPhotoId,
  canEdit,
}: {
  albumId: string;
  photos: Photo[];
  coverPhotoId: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  async function setAsCover(photo: Photo) {
    setOpenMenuId(null);
    setBusyId(photo.id);
    await supabase
      .from('albums')
      .update({ cover_photo_id: photo.id })
      .eq('id', albumId);
    setBusyId(null);
    router.refresh();
  }

  async function togglePin(photo: Photo) {
    setOpenMenuId(null);
    setBusyId(photo.id);
    await supabase
      .from('photos')
      .update({ pinned_at: photo.pinned_at ? null : new Date().toISOString() })
      .eq('id', photo.id);
    setBusyId(null);
    router.refresh();
  }

  async function deletePhoto(photo: Photo) {
    setOpenMenuId(null);
    if (!confirm('이 사진을 삭제할까요?')) return;
    setBusyId(photo.id);
    // 스토리지 → DB 순서로 삭제 (DB 삭제 실패 시 스토리지도 남지 않도록)
    await supabase.storage.from(PHOTOS_BUCKET).remove([photo.storage_path]);
    await supabase.from('photos').delete().eq('id', photo.id);
    setBusyId(null);
    router.refresh();
  }

  if (photos.length === 0) {
    return canEdit ? (
      <div className="rounded-2xl border border-dashed border-black/10 py-12 text-center text-sm text-tape-muted">
        첫 사진을 업로드해 이 앨범을 시작해 보세요.
      </div>
    ) : null;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo) => {
          const isCover = photo.id === coverPhotoId;
          const isPinned = !!photo.pinned_at;
          const busy = busyId === photo.id;
          const menuOpen = openMenuId === photo.id;

          return (
            <div
              key={photo.id}
              className="relative aspect-square overflow-hidden rounded-xl bg-tape-accentSoft"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPublicUrl(photo.storage_path)}
                alt={photo.caption ?? ''}
                onClick={() => setLightbox(photo)}
                className="h-full w-full cursor-zoom-in object-cover"
              />

              {isCover && (
                <span className="absolute left-2 top-2 rounded-md bg-tape-accent px-2 py-0.5 text-[11px] font-semibold text-white">
                  ★ 대표
                </span>
              )}

              {isPinned && (
                <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
                  📌 고정
                </span>
              )}

              {/* 항상 보이는 점세개 메뉴 — 호버가 없는 터치 기기에서도 동작하도록 */}
              {canEdit && (
                <div className="absolute right-2 top-2">
                  {busy ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(menuOpen ? null : photo.id);
                      }}
                      aria-label="사진 옵션"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-base font-bold leading-none text-white transition hover:bg-black/70"
                    >
                      ⋮
                    </button>
                  )}

                  {menuOpen && (
                    <>
                      {/* 메뉴 밖 클릭 시 닫기용 오버레이 */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                        }}
                      />
                      <div className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-lg border border-black/10 bg-white shadow-lg">
                        {!isCover && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAsCover(photo);
                            }}
                            className="block w-full px-3 py-2 text-left text-xs font-medium text-tape-ink hover:bg-tape-bg"
                          >
                            대표 사진으로 설정
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(photo);
                          }}
                          className="block w-full px-3 py-2 text-left text-xs font-medium text-tape-ink hover:bg-tape-bg"
                        >
                          {isPinned ? '고정 해제' : '상단에 고정'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePhoto(photo);
                          }}
                          className="block w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-tape-bg"
                        >
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 라이트박스 */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoPublicUrl(lightbox.storage_path)}
            alt={lightbox.caption ?? ''}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}
