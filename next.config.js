/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@libsql/client"],
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
