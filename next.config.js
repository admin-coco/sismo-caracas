/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We're not in a monorepo; pin the root so Next ignores the stray
  // package-lock.json in the home directory.
  outputFileTracingRoot: __dirname,
  // Permanent redirect from the old domain to the canonical one, preserving
  // the path so old WhatsApp links (e.g. /reporte) still land correctly.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "sismocaracas.com" }],
        destination: "https://sismovenezuela.org/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.sismocaracas.com" }],
        destination: "https://sismovenezuela.org/:path*",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
