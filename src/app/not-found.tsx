import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="text-5xl">📼</span>
      <h1 className="mt-4 text-2xl font-bold text-tape-ink">
        찾을 수 없는 페이지예요
      </h1>
      <p className="mt-1 text-sm text-tape-muted">
        비공개 앨범이거나, 삭제되었거나, 주소가 잘못되었을 수 있어요.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-tape-accent px-5 py-2.5 text-sm font-semibold text-white hover:brightness-95"
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}
