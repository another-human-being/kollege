// `npm run kontakte:anreichern [-- --alle]`: first the organisations that follow from known domains
// (no model), then the web search for contacts not yet looked up (WEBSUCHE=an). The worker does
// the same every 5 minutes; this is for the first time and for checking.
import { parseArgs } from 'node:util';
import { sql } from 'drizzle-orm';
import { runAction } from '@/lib/actions';
import { closeDb, withSystem } from '@/lib/db/client';
import { orgFuer } from './organisation';
import { anreichernLauf, webModell } from './websuche';

const { values } = parseArgs({ options: { alle: { type: 'boolean' } } });

const ohne = await withSystem(async (tx) => (await tx.execute<{ id: string; emails: string[] }>(sql`
  SELECT p.id, ARRAY(SELECT pe.email FROM person_emails pe WHERE pe.person_id = p.id) AS emails
  FROM people p WHERE p.org_id IS NULL AND p.review_state <> 'discarded' AND p.merged_into_id IS NULL`)).rows);
let perDomain = 0;
for (const p of ohne) {
  await withSystem(async (tx) => {
    for (const email of p.emails) {
      const org = await orgFuer(tx, { email });
      if (org) { await runAction({ type: 'system' }, 'person.update', { id: p.id, org_id: org }, { tx, reason: `Domain von ${email}` }); perDomain++; return; }
    }
  });
}
console.log(`Organisation über die Domain: ${perDomain} von ${ohne.length} Kontakten ohne Organisation.`);

if (!webModell()) {
  console.log('Websuche aus: WEBSUCHE=an und ein Mistral-Modell in .env nötig.');
} else {
  let gesamt = { gesucht: 0, gefunden: 0, unklar: 0, fehler: 0 };
  for (;;) {
    const r = await anreichernLauf({ limit: 10 });
    gesamt = { gesucht: gesamt.gesucht + r.gesucht, gefunden: gesamt.gefunden + r.gefunden, unklar: gesamt.unklar + r.unklar, fehler: gesamt.fehler + r.fehler };
    console.log(`Websuche: ${gesamt.gesucht} gesucht – ${gesamt.gefunden} gefunden, ${gesamt.unklar} unklar, ${gesamt.fehler} Fehler`);
    if (!values.alle || r.gesucht === 0 || r.fehler === r.gesucht) break;
  }
}
await closeDb();
