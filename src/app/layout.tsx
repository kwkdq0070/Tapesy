import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Tapesy — 주제별 앨범 아카이빙',
  description:
    "'사람'이 아닌 '주제별 앨범'을 구독하고 탐색하는 사진/기록 아카이빙 플랫폼",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  let unreadCount = 0;
  if (user) {
    const [{ data }, { count }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null),
    ]);
    profile = data;
    unreadCount = count ?? 0;
  }

  return (
    <html lang="ko">
      <body className="font-sans antialiased">
        <Navbar profile={profile} unreadCount={unreadCount} />
        <div className="mx-auto max-w-5xl px-4 pb-24 pt-6">{children}</div>
        <BottomNav username={profile?.username ?? null} />
      </body>
    </html>
  );
}
