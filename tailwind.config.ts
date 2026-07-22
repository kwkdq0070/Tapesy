import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Tapesy 브랜드 팔레트 — 화이트 베이스의 모노톤, 블랙 포인트
        tape: {
          bg: '#ffffff',
          ink: '#111111',
          accent: '#111111',
          accentSoft: '#f4f4f5',
          muted: '#8a8a8e',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
