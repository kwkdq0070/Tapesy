/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Supabase Storage 공개 버킷 이미지 허용. <프로젝트-ref>를 실제 값으로 교체하거나,
        // 아래처럼 와일드카드로 supabase.co 스토리지 경로를 열어둔다.
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
