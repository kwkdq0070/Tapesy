import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// @supabase/ssr 이 넘겨주는 쿠키 배열 형태.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CookieToSet = { name: string; value: string; options?: any };

// 서버 컴포넌트 / 라우트 핸들러에서 사용하는 Supabase 클라이언트.
// Next 14 App Router 의 cookies() 는 서버 컴포넌트에서 읽기 전용일 수 있으므로,
// set 은 try/catch 로 감싼다 (미들웨어가 세션 갱신을 담당).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 서버 컴포넌트에서 호출된 경우 — 미들웨어에서 세션이 갱신되므로 무시 가능.
          }
        },
      },
    }
  );
}
