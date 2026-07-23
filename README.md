# CLAUDE.md



Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.



**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.



## 1. Think Before Coding



**Don't assume. Don't hide confusion. Surface tradeoffs.**



Before implementing:

- State your assumptions explicitly. If uncertain, ask.

- If multiple interpretations exist, present them - don't pick silently.

- If a simpler approach exists, say so. Push back when warranted.

- If something is unclear, stop. Name what's confusing. Ask.



## 2. Simplicity First



**Minimum code that solves the problem. Nothing speculative.**



- No features beyond what was asked.

- No abstractions for single-use code.

- No "flexibility" or "configurability" that wasn't requested.

- No error handling for impossible scenarios.

- If you write 200 lines and it could be 50, rewrite it.



Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.



## 3. Surgical Changes



**Touch only what you must. Clean up only your own mess.**



When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.

- Don't refactor things that aren't broken.

- Match existing style, even if you'd do it differently.

- If you notice unrelated dead code, mention it - don't delete it.



When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.

- Don't remove pre-existing dead code unless asked.



The test: Every changed line should trace directly to the user's request.



## 4. Goal-Driven Execution



**Define success criteria. Loop until verified.**



Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"

- "Fix the bug" → "Write a test that reproduces it, then make it pass"

- "Refactor X" → "Ensure tests pass before and after"



For multi-step tasks, state a brief plan:

```

1. [Step] → verify: [check]

2. [Step] → verify: [check]

3. [Step] → verify: [check]

```



Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.



# 📼 Tapesy (테이프시)

'사람'이 아닌 **주제별 앨범**을 구독하고 탐색하는 사진/기록 아카이빙 플랫폼.

- **앨범 단위 프라이버시**: 계정은 공개, 공개/비공개는 앨범마다 설정
- **공유 앨범**: 지인을 공유 작업자로 초대해 하나의 앨범을 함께 기록
- **다중 구독**: 유저(프로필) 팔로우 + 태그(주제) 구독 → 개인화 홈 피드

## 기술 스택

- Next.js 14 (App Router) · React · TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + RLS, Auth, Storage)
- browser-image-compression (클라이언트 이미지 압축)
- 배포: Vercel

---

## 시작하기

### 1. Supabase 프로젝트 준비

1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성
2. **SQL Editor** 열고 [`supabase/schema.sql`](supabase/schema.sql) 전체를 붙여넣어 실행
   - 테이블, RLS 정책, `photos` 스토리지 버킷/정책, 트리거가 한 번에 생성됩니다.
3. **Authentication > Providers > Google** 활성화
   - Google Cloud 콘솔에서 OAuth 클라이언트 생성 후 Client ID/Secret 입력
   - **Authorized redirect URI** 에 아래 두 개 추가:
     - `https://<프로젝트-ref>.supabase.co/auth/v1/callback` (Supabase 콘솔이 안내)
     - 로컬 개발용: `http://localhost:3000/auth/callback`
4. **Authentication > URL Configuration** 의 Site URL / Redirect URLs 에
   `http://localhost:3000` (및 배포 도메인) 추가

### 2. 환경 변수

```bash
cp .env.local.example .env.local
```

`.env.local` 을 열어 Supabase 프로젝트 값으로 채웁니다 (Project Settings > API):

```
NEXT_PUBLIC_SUPABASE_URL=https://<프로젝트-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. 실행

```bash
npm install
npm run dev
```

`http://localhost:3000` 접속 → Google 로그인 → 앨범 만들기.

---

## 구조

```
src/
├── app/
│   ├── page.tsx                 # 홈: 개인화 피드 / 비로그인 랜딩
│   ├── login/                   # Google OAuth 로그인
│   ├── auth/callback|signout/   # OAuth 콜백, 로그아웃 라우트
│   ├── albums/new/              # 앨범 생성 (공개/비공개 선택)
│   ├── albums/[id]/             # 앨범 상세: 사진 그리드·업로드·공유작업자·관리
│   ├── u/[username]/            # 프로필: 공개/비공개 앨범 탭 + 팔로우
│   └── explore/                 # 태그 검색 & 구독, 인기 태그
├── components/                  # AlbumCard, PhotoUploader, PhotoGrid,
│                                # CollaboratorPanel, Follow/TagFollowButton ...
└── lib/
    ├── supabase/                # client / server / middleware
    ├── queries.ts               # 앨범 카드 데이터 배치 조회
    ├── types.ts · utils.ts
```

## 권한 모델 (RLS 요약)

| 대상 | 조회 | 편집(업로드/수정) | 삭제 |
|---|---|---|---|
| 공개 앨범 | 누구나 | 소유자 · 공유작업자 | 소유자 |
| 비공개 앨범 | 소유자 · 공유작업자 | 소유자 · 공유작업자 | 소유자 |
| 공유작업자 초대 | — | 소유자만 | 소유자 · 본인(나가기) |

DB 함수 `can_view_album()` / `can_edit_album()` 이 모든 정책의 기준입니다.
클라이언트 UI 도 세션·소유자·작업자 여부를 확인해 버튼 노출을 분기합니다.

## 배포 (Vercel)

1. 저장소를 Vercel 에 import
2. 위 3개 환경 변수 등록 (`NEXT_PUBLIC_SITE_URL` 은 배포 도메인으로)
3. Supabase Auth Redirect URLs 에 배포 도메인 `/auth/callback` 추가
