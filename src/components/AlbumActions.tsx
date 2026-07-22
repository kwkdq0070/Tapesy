'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { parseTags } from '@/lib/utils';
import { PHOTOS_BUCKET, type Album } from '@/lib/types';

export function AlbumActions({ album }: { album: Album }) {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(album.title);
  const [description, setDescription] = useState(album.description ?? '');
  const [tagInput, setTagInput] = useState(album.tags.join(', '));
  const [isPrivate, setIsPrivate] = useState(album.is_private);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!title.trim()) {
      setError('제목을 비울 수 없습니다.');
      return;
    }
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from('albums')
      .update({
        title: title.trim(),
        description: description.trim() || null,
        tags: parseTags(tagInput),
        is_private: isPrivate,
      })
      .eq('id', album.id);
    setSaving(false);
    if (error) {
      setError('저장에 실패했습니다.');
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (
      !confirm(
        '앨범과 모든 사진이 삭제됩니다. 이 작업은 되돌릴 수 없어요. 삭제할까요?'
      )
    )
      return;
    setDeleting(true);

    // albums 를 지우면 photos row 는 FK cascade 로 같이 지워지지만,
    // Storage 의 실제 파일은 별도 API 호출로 지워야 해서 albums 삭제 전에
    // 이 앨범의 사진 경로를 먼저 모아 Storage 에서 먼저 제거해둔다.
    const { data: photos } = await supabase
      .from('photos')
      .select('storage_path')
      .eq('album_id', album.id);

    if (photos && photos.length > 0) {
      await supabase.storage
        .from(PHOTOS_BUCKET)
        .remove(photos.map((p) => p.storage_path));
    }

    const { error } = await supabase.from('albums').delete().eq('id', album.id);
    if (error) {
      setError('삭제에 실패했습니다.');
      setDeleting(false);
      return;
    }
    router.push(`/`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm font-medium text-tape-ink transition hover:bg-black/5"
      >
        관리
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-tape-ink">앨범 관리</h2>

            <div className="space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목"
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-tape-accent"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="설명"
                className="w-full resize-none rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-tape-accent"
              />
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="태그 (쉼표로 구분)"
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-tape-accent"
              />

              <label className="flex items-center justify-between rounded-xl border border-black/10 px-3 py-2.5">
                <span className="text-sm text-tape-ink">비공개 앨범</span>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="h-4 w-4 accent-tape-accent"
                />
              </label>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}

            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={remove}
                disabled={deleting}
                className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
              >
                {deleting ? '삭제 중...' : '앨범 삭제'}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-tape-muted hover:bg-black/5"
                >
                  취소
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-tape-accent px-4 py-1.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
                >
                  {saving && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
