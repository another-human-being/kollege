import type { NextConfig } from 'next';

const config: NextConfig = {
  // the worker shares the code tree; keep server-only packages out of the bundle
  serverExternalPackages: ['pg', 'pg-boss', 'imapflow', 'mailparser', 'nodemailer', 'pdf-parse', 'mammoth'],
  // mail attachments go through a server action (stage 5); 25 MB like common mail servers
  experimental: { serverActions: { bodySizeLimit: '25mb' } },
};

export default config;
