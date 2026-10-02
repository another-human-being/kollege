// Text extraction for attachments (§3, §7.2.6). The files are built here, minimal but valid.
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { extractText } from '@/lib/pipeline/extract';

function pdf(text: string): Buffer {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

async function docx(text: string): Promise<Buffer> {
  const z = new JSZip();
  z.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  z.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  z.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`);
  return z.generateAsync({ type: 'nodebuffer' });
}

async function xlsx(): Promise<Buffer> {
  const z = new JSZip();
  z.file('xl/sharedStrings.xml', '<sst><si><t>Gründungsteam</t></si><si><t>Plätze &amp; Ort</t></si></sst>');
  z.file('xl/worksheets/sheet1.xml', '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Solaro</t></is></c><c r="B2"><v>60</v></c></row></sheetData></worksheet>');
  return z.generateAsync({ type: 'nodebuffer' });
}

describe('extractText', () => {
  it('PDF', async () => {
    expect(await extractText('Protokoll.pdf', 'application/pdf', pdf('Pitchdeck bis Freitag'))).toContain('Pitchdeck bis Freitag');
  });
  it('DOCX', async () => {
    expect(await extractText('Brief.docx', 'application/octet-stream', await docx('Finanzplan Version 2'))).toBe('Finanzplan Version 2');
  });
  it('XLSX without the xlsx package: shared, inline and numeric cells', async () => {
    expect(await extractText('Liste.xlsx', '', await xlsx())).toBe('Gründungsteam\tPlätze & Ort\nSolaro\t60');
  });
  it('CSV and plain text', async () => {
    expect(await extractText('a.csv', 'text/csv', Buffer.from('Name;Plätze\nSolaro;4\n'))).toBe('Name;Plätze\nSolaro;4');
  });
  it('unknown types and broken files give null, never an error', async () => {
    expect(await extractText('bild.png', 'image/png', Buffer.from([1, 2, 3]))).toBeNull();
    expect(await extractText('kaputt.pdf', 'application/pdf', Buffer.from('kein pdf'))).toBeNull();
    expect(await extractText('kaputt.docx', '', Buffer.from('kein zip'))).toBeNull();
  });
});
