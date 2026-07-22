'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function TagSearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim().replace(/^#/, '').toLowerCase();
    if (q) router.push(`/explore?tag=${encodeURIComponent(q)}`);
    else router.push('/explore');
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <div className="flex flex-1 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2.5">
        <span className="text-tape-muted">🔍</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="태그로 검색 (예: 여행, 필름, 카페)"
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
