// `npm run modell:pruefen`: do MODEL_FAST and MODEL_THINK answer, and can they do what Kollege
// needs from them – structured output (pipeline, advice) and tool calls (chat)? One short call
// each with a fixed made-up text: no data of the team leaves the machine. Shows endpoint,
// duration and tokens; the key itself is never printed.
import { generateText, isStepCount, Output, tool } from 'ai';
import { z } from 'zod';
import { getModel, MISTRAL_EU, modelName, modelSpec, type Role } from './models';

async function pruefe(role: Role): Promise<boolean> {
  const spec = modelSpec(role);
  if (spec === 'oracle' || spec === 'skript') {
    console.log(`${role.padEnd(5)} ${spec}: Ersatzmodell ohne KI – für echte Tests MODEL_${role.toUpperCase()} setzen.`);
    return false;
  }
  const model = getModel(role);
  const name = modelName(model);
  const t0 = Date.now();
  try {
    // structured output, as in the pipeline (fast) and in advice (think)
    const a = await generateText({
      model,
      prompt: 'Mail von Lena Vogt (Solaro): „Wir schicken das Pitchdeck bis Freitag.“ Wer sagt was zu, bis wann?',
      output: Output.object({ schema: z.object({ wer: z.string(), was: z.string(), bis: z.string() }) }),
      maxRetries: 1,
    });
    const strukturiert = /lena|solaro/i.test(a.output.wer) && /pitch/i.test(a.output.was);
    let werkzeug = true;
    if (role === 'think') {
      // tool calls, as in the chat
      let gerufen = false;
      await generateText({
        model,
        prompt: 'Wie viele offene Aufgaben hat das Team? Nutze das Werkzeug.',
        tools: { offene_aufgaben: tool({ description: 'Zahl der offenen Aufgaben', inputSchema: z.object({}), execute: async () => { gerufen = true; return { anzahl: 7 }; } }) },
        stopWhen: isStepCount(3),
        maxRetries: 1,
      });
      werkzeug = gerufen;
    }
    const ms = Date.now() - t0;
    const ok = strukturiert && werkzeug;
    console.log(`${role.padEnd(5)} ${name}: ${ok ? 'ok' : 'FEHLER'} – strukturierte Ausgabe ${strukturiert ? 'ja' : 'nein'}${role === 'think' ? `, Werkzeuge ${werkzeug ? 'ja' : 'nein'}` : ''} · ${ms} ms · ${a.totalUsage.inputTokens ?? '?'}+${a.totalUsage.outputTokens ?? '?'} Tokens`);
    return ok;
  } catch (e) {
    console.log(`${role.padEnd(5)} ${name}: FEHLER – ${e instanceof Error ? e.message.slice(0, 300) : String(e)}`);
    return false;
  }
}

if (modelSpec('fast').startsWith('mistral:') || modelSpec('think').startsWith('mistral:')) {
  console.log(`Mistral-Endpunkt: ${process.env.MISTRAL_BASE_URL || `${MISTRAL_EU} (EU)`}${process.env.MISTRAL_API_KEY ? '' : ' – MISTRAL_API_KEY fehlt in .env'}`);
}
const ergebnis = [await pruefe('fast'), await pruefe('think')];
process.exit(ergebnis.every(Boolean) ? 0 : 1);
