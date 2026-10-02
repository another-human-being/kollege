// `npm run modell:liste`: which models this Mistral key may use on the configured endpoint
// (default EU). Shows the exact IDs to pin in MODEL_THINK / MODEL_FAST. Sends no content.
import { MISTRAL_EU } from './models';

const base = process.env.MISTRAL_BASE_URL || MISTRAL_EU;
const key = process.env.MISTRAL_API_KEY;
if (!key) {
  console.error('MISTRAL_API_KEY fehlt (.env).');
  process.exit(1);
}
const res = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${key}` } });
if (!res.ok) {
  console.error(`${base}: HTTP ${res.status} ${await res.text()}`);
  process.exit(1);
}
const { data } = (await res.json()) as { data: { id: string; capabilities?: { function_calling?: boolean }; max_context_length?: number }[] };
console.log(`Endpunkt ${base}`);
for (const m of data.sort((a, b) => a.id.localeCompare(b.id))) {
  console.log(`${m.id.padEnd(36)} Werkzeuge: ${m.capabilities?.function_calling ? 'ja ' : 'nein'}  Kontext: ${m.max_context_length ?? '?'}`);
}
