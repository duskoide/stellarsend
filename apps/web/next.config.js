/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Deployed via @cloudflare/next-on-pages to Cloudflare Pages (spec §3, §10).
  transpilePackages: ["@stellarsend/shared"],
};

module.exports = nextConfig;
