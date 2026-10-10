// `npm run experiment:gespraech [-- --anzahl 5] [-- --betreff registration]`
// Read only. Shows in the terminal and writes the same into experimente/ (not in git: real data).
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { closeDb } from '@/lib/db/client';
import { getModel, modelName } from '@/lib/model/models';
import { bericht, gespraechDurchgehen, verlaeufe } from './gespraech';

const { values } = parseArgs({ options: { anzahl: { type: 'string', default: '5' }, betreff: { type: 'string' } } });
const model = getModel('think');
console.log(`Experiment „Gespräch als Zustand“ mit ${modelName(model)} – nur lesen, nichts wird geändert.`);
const liste = await verlaeufe({ anzahl: Number(values.anzahl), betreff: values.betreff });
if (!liste.length) console.log('Keine passenden Verläufe gefunden.');
const teile: string[] = [];
for (const v of liste) {
  process.stdout.write(`… ${v.betreff}\n`);
  try {
    const text = bericht(v, await gespraechDurchgehen(model, v.thread_key));
    console.log(text);
    teile.push(text);
  } catch (e) {
    const f = `\n════════ ${v.betreff} ════════\nFEHLER: ${e instanceof Error ? e.message.slice(0, 300) : String(e)}`;
    console.log(f);
    teile.push(f);
  }
}
mkdirSync('experimente', { recursive: true });
const datei = `experimente/gespraech-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.txt`;
writeFileSync(datei, teile.join('\n'));
console.log(`\nGespeichert in ${datei}`);
await closeDb();
