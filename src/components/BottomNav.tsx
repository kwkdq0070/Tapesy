'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomNav({ username }: { username: string | null }) {
  const pathname = usePathname();

  const profileHref = username ? `/u/${username}` : '/login';
  const isProfileActive = username
    ? pathname === profileHref
    : pathname === '/login';

  const tabs = [
    { href: '/', label: '홈', icon: '🏠', active: pathname === '/' },
    {
      href: '/explore',
      label: '검색',
      icon: '🔍',
      active: pathname.startsWith('/explore'),
    },
    {
      href: profileHref,
      label: '프로필',
      icon: '👤',
      active: isProfileActive,
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-tape-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-stretch justify-around">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${
              tab.active ? 'text-tape-ink' : 'text-tape-muted'
            }`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
