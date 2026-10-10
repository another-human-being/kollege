// A reply carries the earlier mails of its thread as a quote. What is new in it is the part above
// (finding 10.10.: every reply made the commitments of the quoted mails into new tasks again).
// Cut at the usual markers of a reply history; a forward stays whole – what is forwarded is new
// to the thread.

const ANTWORT_KOPF = [
  /^\s*(Am|On)\b.{3,240}\b(schrieb|wrote)\b.{0,120}:\s*$/i, // Gmail, Apple Mail, Thunderbird
  /^\s*-{2,}\s*(Original Message|Ursprüngliche Nachricht|Originalnachricht)\s*-{2,}\s*$/i,
  /^\s*_{10,}\s*$/, // Outlook separator line above "Von: … Gesendet: …"
];
const OUTLOOK_VON = /^\s*\**(Von|From)\s*:\**\s.+/i;
const OUTLOOK_GESENDET = /^\s*\**(Gesendet|Sent|Datum|Date)\s*:\**\s.+/i;

export const istWeiterleitung = (betreff: string | null | undefined) => /^\s*(WG|Fwd?|FW|Weitergeleitet)\s*:/i.test(betreff ?? '');

/** the new part of a mail body: above the first reply marker, without quoted lines */
export function neuerTeil(text: string, betreff?: string | null): string {
  if (istWeiterleitung(betreff)) return text;
  const zeilen = text.split(/\r?\n/);
  let ende = zeilen.length;
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i]!;
    if (ANTWORT_KOPF.some((r) => r.test(z))) { ende = i; break; }
    // Outlook: "Von: …" with "Gesendet: …" in the next lines
    if (OUTLOOK_VON.test(z) && zeilen.slice(i + 1, i + 4).some((n) => OUTLOOK_GESENDET.test(n))) { ende = i; break; }
  }
  return zeilen.slice(0, ende).filter((z) => !/^\s*>/.test(z)).join('\n').trim();
}

/** for comparing quotes: without quote marks, whitespace folded, lower case */
export const vergleichbar = (s: string) => s.replace(/^[\s>]+/gm, '').replace(/\s+/g, ' ').trim().toLowerCase();
