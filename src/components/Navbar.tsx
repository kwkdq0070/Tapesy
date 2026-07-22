import Link from 'next/link';
import type { Profile } from '@/lib/types';

type NavProfile = Pick<
  Profile,
  'id' | 'username' | 'display_name' | 'avatar_url'
> | null;

export function Navbar({ profile }: { profile: NavProfile }) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-tape-bg/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-tape-ink">
          Tapesy
        </Link>

        {profile ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-tape-ink">
              <b className="font-semibold">
                {profile.display_name ?? profile.username}
              </b>
              님 환영합니다!
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="font-medium text-tape-muted transition hover:text-tape-ink"
              >
                로그아웃
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-full bg-tape-ink px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            로그인
          </Link>
        )}
      </nav>
    </header>
  );
}
