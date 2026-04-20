/** @type {import('next').NextConfig} */
const nextConfig = {
  // 告诉 Vercel：即使有代码规范错误（ESLint）也继续构建
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 告诉 Vercel：即使有类型错误（TypeScript）也继续构建
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;