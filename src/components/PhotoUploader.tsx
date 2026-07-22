'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';
import { PHOTOS_BUCKET } from '@/lib/types';

type Status = {
  name: string;
  state: 'compressing' | 'uploading' | 'done' | 'error';
};

export function PhotoUploader({ albumId }: { albumId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;

    setError(null);
    setIsUploading(true);
    setStatuses(list.map((f) => ({ name: f.name, state: 'compressing' })));

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('세션이 만료되었습니다. 다시 로그인해 주세요.');
      setIsUploading(false);
      return;
    }

    let anySuccess = false;

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      try {
        // 1) 브라우저 단 압축 (최대 1.5MB, 긴 변 1920px)
        setStatuses((s) =>
          s.map((st, idx) => (idx === i ? { ...st, state: 'compressing' } : st))
        );
        const compressed = await imageCompression(file, {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });

        const dims = await readDimensions(compressed);

        // 2) 스토리지 업로드 — 경로 첫 세그먼트는 반드시 uid (Storage RLS 조건)
        setStatuses((s) =>
          s.map((st, idx) => (idx === i ? { ...st, state: 'uploading' } : st))
        );
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${user.id}/${albumId}/${crypto.randomUUID()}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .upload(path, compressed, {
            contentType: compressed.type || 'image/jpeg',
            upsert: false,
          });
        if (upErr) throw upErr;

        // 3) DB 레코드 삽입
        const { error: insErr } = await supabase.from('photos').insert({
          album_id: albumId,
          uploader_id: user.id,
          storage_path: path,
          width: dims?.width ?? null,
          height: dims?.height ?? null,
        });
        if (insErr) throw insErr;

        anySuccess = true;
        setStatuses((s) =>
          s.map((st, idx) => (idx === i ? { ...st, state: 'done' } : st))
        );
      } catch (err) {
        console.error('upload failed', err);
        setStatuses((s) =>
          s.map((st, idx) => (idx === i ? { ...st, state: 'error' } : st))
        );
      }
    }

    setIsUploading(false);
    if (anySuccess) {
      router.refresh();
      // 잠시 후 상태 목록 정리
      setTimeout(() => setStatuses([]), 1500);
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="mb-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !isUploading && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
          dragOver
            ? 'border-tape-accent bg-tape-accentSoft'
            : 'border-black/10 bg-white hover:border-tape-accent/50'
        } ${isUploading ? 'pointer-events-none opacity-70' : ''}`}
      >
        <span className="text-3xl">📷</span>
        <p className="mt-2 text-sm font-medium text-tape-ink">
          사진을 드래그하거나 클릭해서 업로드
        </p>
        <p className="text-xs text-tape-muted">
          업로드 전 브라우저에서 자동으로 압축돼요
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {statuses.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {statuses.map((s, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs"
            >
              <span className="truncate text-tape-ink">{s.name}</span>
              <StatusBadge state={s.state} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ state }: { state: Status['state'] }) {
  const map = {
    compressing: { label: '압축 중', cls: 'text-tape-muted' },
    uploading: { label: '업로드 중', cls: 'text-tape-accent' },
    done: { label: '완료', cls: 'text-green-600' },
    error: { label: '실패', cls: 'text-red-600' },
  } as const;
  const { label, cls } = map[state];
  const spinning = state === 'compressing' || state === 'uploading';
  return (
    <span className={`flex items-center gap-1.5 font-medium ${cls}`}>
      {spinning && (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {label}
    </span>
  );
}

// 압축 결과 이미지의 실제 픽셀 크기를 읽는다.
function readDimensions(
  file: File
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
