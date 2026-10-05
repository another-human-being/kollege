// Hits for the field "Neuer Chat oder Suche" (E55) – only what the person may see.
import { currentUserId } from '@/auth';
import { schnellsuche } from '@/lib/views/suche';

export async function GET(req: Request) {
  let userId: string;
  try {
    userId = await currentUserId();
  } catch {
    return Response.json([], { status: 401 });
  }
  const q = new URL(req.url).searchParams.get('q') ?? '';
  return Response.json(await schnellsuche(userId, q.slice(0, 200)), { headers: { 'cache-control': 'private, no-store' } });
}
