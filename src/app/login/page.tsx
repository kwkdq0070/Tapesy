'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setIsLoading(true);
    setError(null);
    const supabase = createClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
      setError('로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      setIsLoading(false);
    }
    // 성공 시 브라우저가 Google 로 리다이렉트되므로 여기서 추가 처리 없음.
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-tape-accent text-xl font-black text-white">
            T
          </div>
          <h1 className="text-2xl font-bold text-tape-ink">Tapesy</h1>
          <p className="mt-1 text-sm text-tape-muted">
            주제별 앨범으로 기록하는 아카이빙 공간
          </p>
        </div>

        <button
          onClick={signInWithGoogle}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-medium text-tape-ink transition hover:bg-tape-bg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-tape-accent border-t-transparent" />
          ) : (
            <GoogleIcon />
          )}
          <span>{isLoading ? '연결 중...' : 'Google로 계속하기'}</span>
        </button>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-tape-muted">
          계속하면 Tapesy의 이용약관에 동의하게 됩니다.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
