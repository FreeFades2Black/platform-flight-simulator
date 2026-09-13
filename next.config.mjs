/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

const nextConfig = {
  reactStrictMode: true,
  output: isGitHubPages ? 'export' : undefined,
  basePath: isGitHubPages ? '/platform-flight-simulator' : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
