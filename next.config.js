/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We're not in a monorepo; pin the root so Next ignores the stray
  // package-lock.json in the home directory.
  outputFileTracingRoot: __dirname,
};

module.exports = nextConfig;
