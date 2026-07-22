'use client';

import { useRouter } from 'next/navigation';

// 목록/피드에서 "들어간" 화면(앨범 상세, 프로필, 앨범 생성 등) 상단에 붙이는 뒤로가기.
export function BackButton({ className = '' }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      aria-label="뒤로 가기"
      className={`mb-3 flex items-center gap-1 text-sm font-medium text-tape-muted transition hover:text-tape-ink ${className}`}
    >
      <span className="text-base leading-none">←</span>
      뒤로
    </button>
  );
}
