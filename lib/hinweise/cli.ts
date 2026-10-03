// One hint run by hand, as the worker does daily and after each sync: `npm run hinweise`
import { fileURLToPath } from 'node:url';
import { closeDb } from '@/lib/db/client';
import { hinweiseLauf } from './index';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  hinweiseLauf()
    .then((r) => console.log(JSON.stringify(r)))
    .catch((e: unknown) => { console.error(String(e)); process.exitCode = 1; })
    .finally(() => closeDb());
}
