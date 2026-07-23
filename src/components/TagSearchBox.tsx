'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function TagSearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      router.push('/explore');
      return;
    }
    // '#'로 시작하면 그 태그 하나만 정확히 보는 모드(구독 버튼 포함),
    // 그 외엔 태그/유저 아이디·닉네임/앨범 제목을 아우르는 통합 검색.
    if (trimmed.startsWith('#')) {
      router.push(`/explore?tag=${encodeURIComponent(trimmed.slice(1).toLowerCase())}`);
    } else {
      router.push(`/explore?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <div className="flex flex-1 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2.5">
        <span className="text-tape-muted">🔍</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="태그, 유저, 앨범 이름으로 검색 (예: #카페, @user, 우리집)"
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      <button
        type="submit"
        className="rounded-xl bg-tape-ink px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
      >
        검색
      </button>
    </form>
  );
}
