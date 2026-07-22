import { PHOTOS_BUCKET } from './types';

// storage_path -> 공개 URL. 버킷이 public 이므로 직접 URL 을 구성한다.
export function photoPublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${PHOTOS_BUCKET}/${storagePath}`;
}

// "여행, 카페 #필름" 처럼 쉼표/공백/# 섞인 입력을 정규화된 태그 배열로 변환.
export function parseTags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[,\n]/)
        .flatMap((t) => t.split(/\s+/))
        .map((t) => t.replace(/^#/, '').trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 30)
    )
  ).slice(0, 10);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
