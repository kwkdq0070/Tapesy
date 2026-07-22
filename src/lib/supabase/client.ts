'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// 브라우저(클라이언트 컴포넌트)에서 사용하는 Supabase 클라이언트.
// 컴포넌트 리렌더마다 새 GoTrueClient 인스턴스가 생기면 세션 상태가 어긋날 수 있어
// 모듈 스코프에 싱글턴으로 캐싱해 앱 전체에서 하나만 재사용한다.
let browserClient: SupabaseClient | undefined;

export function createClient() {
  if (browserClient) return browserClient;

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return browserClient;
}
