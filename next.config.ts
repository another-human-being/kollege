import type { NextConfig } from 'next';

const config: NextConfig = {
  // the project folder is the root – a stray package-lock.json in a parent folder (e.g. the home
  // directory) must not change it
  turbopack: { root: process.cwd() },
  // the worker shares the code tree; keep server-only packages out of the bundle
  serverExternalPackages: ['pg', 'pg-boss', 'imapflow', 'mailparser', 'nodemailer', 'pdf-parse', 'mammoth', 'web-push'],
  // mail attachments go through a server action (stage 5); 25 MB like common mail servers
  experimental: { serverActions: { bodySizeLimit: '25mb' } },
};

export default config;
