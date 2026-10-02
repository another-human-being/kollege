// Outgoing mail (stage 5, decision 25): SMTP with the mailbox's login. The message is
// built once (MailComposer) so that exactly these bytes are sent and filed in "Gesendet".
import { createTransport } from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer';
import { decrypt } from '@/lib/crypto';
import type { ImapConfig } from './imap';

export interface Ausgehend {
  from: { name: string; address: string };
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  text: string;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  attachments: { filename: string; contentType: string; content: Buffer }[];
  date: Date;
}

export async function baueMail(m: Ausgehend): Promise<Buffer> {
  // Bcc stays out of the headers (and out of the copy in "Gesendet" others might see)
  const { bcc: _bcc, ...rest } = m;
  return new MailComposer(rest).compile().build();
}

export async function sendeMail(cfg: ImapConfig, m: Ausgehend, raw: Buffer): Promise<void> {
  if (!cfg.smtp) throw new Error('Für dieses Postfach ist kein SMTP-Server eingerichtet');
  const transport = createTransport({
    host: cfg.smtp.host,
    port: cfg.smtp.port,
    secure: cfg.smtp.secure,
    auth: { user: cfg.user, pass: decrypt(cfg.password) },
    logger: false,
  });
  try {
    await transport.sendMail({ envelope: { from: m.from.address, to: [...m.to, ...m.cc, ...m.bcc] }, raw });
  } finally {
    transport.close();
  }
}
