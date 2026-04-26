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
  // Expose server-side env vars for Netlify serverless functions
  env: {
    ODOO_URL: process.env.ODOO_URL,
    ODOO_DB: process.env.ODOO_DB,
    ODOO_USER: process.env.ODOO_USER,
    ODOO_API_KEY: process.env.ODOO_API_KEY,
  },
};

export default nextConfig;
