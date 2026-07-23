import Link from 'next/link';

export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  return (
    <Link
      href="/notifications"
      aria-label="알림"
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:bg-black/5"
    >
      🔔
      {unreadCount > 0 && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-tape-accent" />
      )}
    </Link>
  );
}
