'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { parseTags } from '@/lib/utils';
import { BackButton } from '@/components/BackButton';

export default function NewAlbumPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 로그인 확인
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login?next=/albums/new');
      } else {
        setCheckingAuth(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewTags = parseTags(tagInput);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('앨범 제목을 입력해 주세요.');
      return;
    }
    setIsLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    const { data, error } = await supabase
      .from('albums')
      .insert({
        owner_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        tags: previewTags,
        is_private: isPrivate,
      })
      .select('id')
      .single();

    if (error || !data) {
      setError('앨범 생성에 실패했습니다. 다시 시도해 주세요.');
      setIsLoading(false);
      return;
    }

    // 생성 후 상세 페이지로 이동 (거기서 사진 업로드)
    router.push(`/albums/${data.id}`);
  }

  if (checkingAuth) {
    return <CenterSpinner />;
  }

  return (
    <main className="mx-auto max-w-xl">
      <BackButton />
      <h1 className="mb-1 text-2xl font-bold text-tape-ink">새 앨범 만들기</h1>
      <p className="mb-6 text-sm text-tape-muted">
        주제를 정하고 기록을 시작하세요. 앨범 단위로 공개 여부를 설정할 수 있어요.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="제목" required>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="예: 2026 여름 필름 카메라 기록"
            className="input"
          />
        </Field>

        <Field label="설명">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="이 앨범은 어떤 기록인가요?"
            className="input resize-none"
          />
        </Field>

        <Field label="태그">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="쉼표 또는 공백으로 구분 (예: 여행, 카페, 필름)"
            className="input"
          />
          {previewTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {previewTags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-tape-accentSoft px-2.5 py-0.5 text-xs font-medium text-tape-accent"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </Field>

        <div className="flex items-center justify-between rounded-xl border border-black/10 bg-white p-4">
          <div>
            <p className="text-sm font-medium text-tape-ink">비공개 앨범</p>
            <p className="text-xs text-tape-muted">
              나와 공유 작업자만 볼 수 있어요.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPrivate}
            onClick={() => setIsPrivate((v) => !v)}
            className={`relative h-6 w-11 rounded-full transition ${
              isPrivate ? 'bg-tape-accent' : 'bg-black/15'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                isPrivate ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-tape-accent px-4 py-3 font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {isLoading && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {isLoading ? '만드는 중...' : '앨범 만들기'}
        </button>
      </form>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: #fff;
          padding: 0.65rem 0.85rem;
          font-size: 0.9rem;
          outline: none;
        }
        .input:focus {
          border-color: #e8622c;
          box-shadow: 0 0 0 3px rgba(232, 98, 44, 0.12);
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-tape-ink">
        {label}
        {required && <span className="ml-0.5 text-tape-accent">*</span>}
      </span>
      {children}
    </label>
  );
}

function CenterSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-tape-accent border-t-transparent" />
    </div>
  );
}
