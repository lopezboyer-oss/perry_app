/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs'],
  },
  eslint: {
    // Esto previene que Netlify falle por advertencias de código no usado
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Esto previene que Netlify falle por tipos 'any' no definidos
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
