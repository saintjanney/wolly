import type { NextConfig } from 'next';
const config: NextConfig = { output:'standalone', transpilePackages:['@wolly/api-client'] };
export default config;
