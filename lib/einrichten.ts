// `npm run einrichten [-- --kontakt mailto:adresse]`: prepares .env on this machine. Copies
// .env.example if there is no .env, then fills only what is empty: APP_SECRET, AUTH_SECRET and the
// VAPID keys for push notifications (VAPID_SUBJECT from --kontakt). Generated values are written
// to the file and never printed. API keys (MISTRAL_API_KEY …) are entered by hand into .env –
// never into a chat, a command line or a commit.
import { randomBytes } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import webpush from 'web-push';

const { values } = parseArgs({ options: { kontakt: { type: 'string' }, datei: { type: 'string', default: '.env' } } });
const datei = values.datei!;
if (!existsSync(datei)) {
  copyFileSync('.env.example', datei);
  console.log(`${datei} aus .env.example angelegt.`);
}

let text = readFileSync(datei, 'utf8');
const leer = (k: string) => { const m = new RegExp(`^${k}=([^\\n#]*)`, 'm').exec(text); return !m || !m[1]!.trim(); };
const setzen = (k: string, v: string) => {
  const zeile = new RegExp(`^${k}=[^\\n]*`, 'm');
  // keep a comment on the line, separated by a space (docker compose reads "x# …" as part of the value)
  const neu = (alt: string) => { const c = /\s#.*$/.exec(alt); return `${k}=${v}${c ? c[0] : ''}`; };
  text = zeile.test(text) ? text.replace(zeile, neu) : `${text.trimEnd()}\n${k}=${v}\n`;
  console.log(`  ${k} gesetzt`);
};

if (leer('APP_SECRET')) setzen('APP_SECRET', randomBytes(32).toString('base64url'));
if (leer('AUTH_SECRET')) setzen('AUTH_SECRET', randomBytes(32).toString('base64url'));
if (leer('VAPID_PUBLIC_KEY') || leer('VAPID_PRIVATE_KEY')) {
  const k = webpush.generateVAPIDKeys();
  setzen('VAPID_PUBLIC_KEY', k.publicKey);
  setzen('VAPID_PRIVATE_KEY', k.privateKey);
}
if (values.kontakt) {
  if (!/^(mailto:[^@\s]+@[^@\s]+|https:\/\/[^\s]+)$/.test(values.kontakt) || /localhost/.test(values.kontakt)) {
    console.error('--kontakt: mailto:adresse oder https://… (nicht localhost – Apple lehnt das ab)');
    process.exit(1);
  }
  setzen('VAPID_SUBJECT', values.kontakt);
}
writeFileSync(datei, text);
chmodSync(datei, 0o600); // secrets: readable only by the owner

const fehlt = [
  leer('VAPID_SUBJECT') ? 'VAPID_SUBJECT (Kontakt für die Push-Dienste: npm run einrichten -- --kontakt mailto:deine@adresse)' : null,
  /^MODEL_(FAST|THINK)=mistral:/m.test(text) && leer('MISTRAL_API_KEY') ? 'MISTRAL_API_KEY (von console.mistral.ai, selbst in .env eintragen)' : null,
].filter(Boolean);
console.log(fehlt.length ? `Noch offen in ${datei}:\n${fehlt.map((f) => `  - ${f}`).join('\n')}` : `${datei} ist vollständig. Weiter: npm run modell:pruefen`);
