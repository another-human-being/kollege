// Raw data (mail originals, attachments, file copies): BLOB_DIR/<sha256 of content>.
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function putBlob(content: string | Buffer): Promise<string> {
  const dir = process.env.BLOB_DIR;
  if (!dir) throw new Error('BLOB_DIR is not set');
  const hash = createHash('sha256').update(content).digest('hex');
  await mkdir(dir, { recursive: true });
  // content-addressed: same content, same file – writing again is a no-op
  await writeFile(join(dir, hash), content, { flag: 'wx' }).catch((e: NodeJS.ErrnoException) => {
    if (e.code !== 'EEXIST') throw e;
  });
  return hash;
}

export async function getBlob(hash: string): Promise<Buffer> {
  const dir = process.env.BLOB_DIR;
  if (!dir) throw new Error('BLOB_DIR is not set');
  if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error('invalid blob reference');
  const { readFile } = await import('node:fs/promises');
  return readFile(join(dir, hash));
}
