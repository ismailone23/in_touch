/** @type {import('next').NextConfig} */
// const nextConfig = {};

// export default nextConfig;

export default {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8080/:path*",
      },
    ];
  },
};