// Text extraction (§3) for attachments now and drive files in stage 7: PDF (pdf-parse),
// DOCX (mammoth), XLSX (read directly: a zip of XML; no `xlsx` package, see STAND.md),
// CSV/plain text as is. Anything else: metadata only (null).
// Input comes from outside (attachments of external mails): every parser runs guarded,
// a broken file yields null instead of stopping the intake (§12), and the text is capped.
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

const MAX_CHARS = 100_000;
const MAX_BYTES = 25 * 1024 * 1024;

const cap = (t: string) => {
  const s = t.replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return s ? s.slice(0, MAX_CHARS) : null;
};

export function extractableKind(filename: string, mime: string): 'pdf' | 'docx' | 'xlsx' | 'text' | null {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (ext === 'docx' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (ext === 'xlsx' || mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'xlsx';
  if (['txt', 'csv', 'md'].includes(ext) || mime.startsWith('text/plain') || mime === 'text/csv') return 'text';
  return null;
}

async function xlsxText(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const xml = async (path: string) => (await zip.file(path)?.async('string')) ?? '';
  const unescape = (s: string) =>
    s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const shared = [...(await xml('xl/sharedStrings.xml')).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    unescape([...m[1]!.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')),
  );
  const sheets = Object.keys(zip.files).filter((p) => /^xl\/worksheets\/sheet\d+\.xml$/.test(p)).sort();
  const out: string[] = [];
  for (const p of sheets) {
    for (const row of (await xml(p)).matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells = [...row[1]!.matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)].map(([, attrs, body]) => {
        const v = /<v>([\s\S]*?)<\/v>/.exec(body!)?.[1];
        if (/t="s"/.test(attrs!) && v !== undefined) return shared[Number(v)] ?? '';
        if (/t="inlineStr"/.test(attrs!)) return unescape([...body!.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''));
        return v !== undefined ? unescape(v) : '';
      });
      if (cells.some(Boolean)) out.push(cells.join('\t'));
    }
  }
  return out.join('\n');
}

/** extracted text or null (unknown type, empty, broken, too large) */
export async function extractText(filename: string, mime: string, content: Buffer): Promise<string | null> {
  const kind = extractableKind(filename, mime);
  if (!kind || content.length > MAX_BYTES) return null;
  try {
    if (kind === 'text') return cap(content.toString('utf8'));
    if (kind === 'docx') return cap((await mammoth.extractRawText({ buffer: content })).value);
    if (kind === 'xlsx') return cap(await xlsxText(content));
    const parser = new PDFParse({ data: new Uint8Array(content) });
    try {
      return cap((await parser.getText()).text);
    } finally {
      await parser.destroy();
    }
  } catch {
    return null;
  }
}
