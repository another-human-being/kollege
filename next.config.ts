import type { NextConfig } from 'next';

const config: NextConfig = {
  // the worker shares the code tree; keep server-only packages out of the bundle
  serverExternalPackages: ['pg', 'pg-boss'],
};

export default config;
