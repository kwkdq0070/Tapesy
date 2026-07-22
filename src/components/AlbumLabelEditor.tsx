'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// 공유 앨범을 나만 다른 이름/설명으로 부르기 위한 개인화 설정.
// 다른 소유자/공동작업자의 화면에는 영향을 주지 않는다.
export function AlbumLabelEditor({
  albumId,
  defaultTitle,
  defaultDescription,
  initialTitle,
  initialDescription,
  hasCustomLabel,
}: {
  albumId: string;
  defaultTitle: string;
  defaultDescription: string;
  initialTitle: string;
  initialDescription: string;
  hasCustomLabel: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('album_member_labels').upsert({
      album_id: albumId,
      user_id: user.id,
      title: title.trim() || null,
      description: description.trim() || null,
    });

    setSaving(false);
    if (error) {
      setError('저장에 실패했습니다.');
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function resetToDefault() {
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('album_member_labels')
      .delete()
      .eq('album_id', albumId)
      .eq('user_id', user.id);

    setSaving(false);
    if (error) {
      setError('되돌리기에 실패했습니다.');
      return;
    }
    setTitle(defaultTitle);
    setDescription(defaultDescription);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm font-medium text-tape-muted transition hover:bg-black/5 hover:text-tape-ink"
      >
        {hasCustomLabel ? '내 별칭 수정' : '나만의 이름 붙이기'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-bold text-tape-ink">
              나만 보이는 이름
            </h2>
            <p className="mb-4 text-xs text-tape-muted">
              다른 소유자·공동작업자에게는 영향 없이, 나에게만 이 앨범이 이렇게
              보여요.
            </p>

            <div className="space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={defaultTitle}
                maxLength={80}
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-tape-accent"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={defaultDescription || '설명 없음'}
                maxLength={500}
                className="w-full resize-none rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-tape-accent"
              />
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex items-center justify-between">
              {hasCustomLabel ? (
                <button
                  onClick={resetToDefault}
                  disabled={saving}
                  className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
                >
                  기본값으로 되돌리기
                </button>
              ) : (
                <span />
              )}
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
