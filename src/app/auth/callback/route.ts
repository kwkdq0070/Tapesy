import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Google OAuth 리다이렉트 콜백. code 를 세션으로 교환한 뒤 next 경로로 보낸다.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 실패 시 로그인 페이지로
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
