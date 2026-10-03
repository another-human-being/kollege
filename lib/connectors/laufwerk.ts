// Drive (§12, stage 7): the team share, mounted into the container (SMB → DRIVE_MOUNT). The worker
// reads the file system; changes are found by mtime + size, confirmed by the content hash.
// A file is a team entry (shared folder, §5). Each content version is its own entry
// (dedupe_key path + hash, §4); the view shows the newest of a path.
//
// Guards (decision 37):
// - an unreachable or suddenly empty mount is an error, never "everything was deleted";
// - links are not followed (a loop or a way out of the share);
// - Office lock files, temp files and system files stay out;
// - files above MAX_BYTES are read for the hash only and stored as metadata.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { extractText } from '@/lib/pipeline/extract';
import type { Connector, RawItem, SyncError } from './types';

// unc: the path as the team opens the share (\\fs.example\gruendung) – for "Pfad kopieren"
export const LaufwerkConfig = z.object({ root: z.string().min(1), unc: z.string().optional() });

interface Stand { mtime: number; size: number; hash: string }
const Cursor = z.object({ files: z.record(z.string(), z.object({ mtime: z.number(), size: z.number(), hash: z.string() })) });

/** changed files per call; the rest follows with `more` (large import) */
export const BATCH = 100;
export const MAX_BYTES = 50 * 1024 * 1024;

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  doc: 'application/msword', xls: 'application/vnd.ms-excel', ppt: 'application/vnd.ms-powerpoint',
  txt: 'text/plain', md: 'text/plain', csv: 'text/csv',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml',
  zip: 'application/zip', mp4: 'video/mp4', mov: 'video/quicktime',
};
export const mimeOf = (name: string) => MIME[name.toLowerCase().split('.').pop() ?? ''] ?? 'application/octet-stream';

/** never a team file: hidden, Office/LibreOffice locks, temp and system files */
export function ignoriert(name: string): boolean {
  return name.startsWith('.') || name.startsWith('~$') || name.startsWith('.~lock.')
    || /\.(tmp|temp|part|crdownload)$/i.test(name) || /^(thumbs\.db|desktop\.ini|icon\r)$/i.test(name);
}

async function* dateien(root: string, rel = ''): AsyncGenerator<string> {
  const here = await readdir(join(root, rel), { withFileTypes: true });
  for (const d of here.sort((a, b) => a.name.localeCompare(b.name))) {
    if (ignoriert(d.name)) continue;
    const p = rel ? `${rel}/${d.name}` : d.name;
    if (d.isDirectory()) yield* dateien(root, p);
    else if (d.isFile()) yield p; // links and special files: not followed
  }
}

async function hashOf(file: string): Promise<string> {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(file)) h.update(chunk as Buffer);
  return h.digest('hex');
}

export const laufwerkConnector: Connector = {
  async sync(connection, cursor) {
    const { root } = LaufwerkConfig.parse(connection.config);
    const vorher: Record<string, Stand> = Cursor.safeParse(cursor).success ? Cursor.parse(cursor).files : {};
    // an unmounted share looks like an empty folder: then nothing is deleted
    const r = await stat(root).catch(() => null);
    if (!r?.isDirectory()) throw new Error(`Laufwerk nicht erreichbar: ${root}`);
    const since = new Date(`${connection.import_since}T00:00:00Z`).getTime();

    const jetzt: Record<string, Stand> = {};
    const items: RawItem[] = [];
    const errors: SyncError[] = [];
    let more = false;
    let gesehen = 0;
    for await (const p of dateien(root)) {
      gesehen++;
      const abs = join(root, p);
      try {
        const s = await stat(abs);
        const alt = vorher[p];
        if (alt && alt.mtime === s.mtimeMs && alt.size === s.size) { jetzt[p] = alt; continue; }
        // older than the import limit and never seen: stays out (§7.3), without reading it
        if (!alt && s.mtimeMs < since) continue;
        if (items.length >= BATCH) { more = true; if (alt) jetzt[p] = alt; continue; }
        const gross = s.size > MAX_BYTES;
        const content = gross ? null : await readFile(abs);
        const hash = content ? createHash('sha256').update(content).digest('hex') : await hashOf(abs);
        jetzt[p] = { mtime: s.mtimeMs, size: s.size, hash };
        if (alt?.hash === hash) continue; // touched, not changed
        const name = p.split('/').at(-1)!;
        const mime = mimeOf(name);
        items.push({
          kind: 'file', externalId: p, dedupeKey: `${p}#${hash}`, occurredAt: s.mtime, title: name,
          bodyText: content ? await extractText(name, mime, content) : null,
          meta: { path: p, mime, size: s.size, hash, modified_by: null, ...(gross ? { zu_gross: true } : {}) },
          raw: content ?? Buffer.alloc(0), attachments: [],
        });
      } catch (e) {
        if (vorher[p]) jetzt[p] = vorher[p]!;
        errors.push({ ref: p, message: e instanceof Error ? e.message : String(e) });
      }
    }
    const bekannt = Object.keys(vorher).length;
    if (!gesehen && bekannt) throw new Error(`Laufwerk ist leer, vorher ${bekannt} Dateien – nicht eingehängt? Nichts gelöscht.`);
    const removed = Object.keys(vorher).filter((p) => !(p in jetzt));
    return { items, errors, cursor: { files: jetzt }, more, removed };
  },
};
