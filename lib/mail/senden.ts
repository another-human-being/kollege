// The send job (E43): runs ZURUECKHOLBAR_S after mail.send. Under the lock of the action row:
// recalled (undone) → nothing happens; otherwise the mail goes out over SMTP, the draft
// becomes the sent mail (its Message-ID is the dedupe key, so the copy the next sync finds
// in "Gesendet" is the same entry, §13), and the inverse is removed: from now on it is out.
// Writing these results is infrastructure like the intake (decision 1): it records what happened.
import { eq, sql } from 'drizzle-orm';
import { EntwurfMeta } from '@/lib/actions/mail';
import { ImapConfig, inGesendetAblegen } from '@/lib/connectors/imap';
import { baueMail, sendeMail, type Ausgehend } from '@/lib/connectors/smtp';
import { withSystem } from '@/lib/db/client';
import { actions, connections, entries, mailCopies, users } from '@/lib/db/schema';
import { getBlob, putBlob } from '@/lib/pipeline/blobs';

export type SendeErgebnis = 'gesendet' | 'zurueckgeholt' | 'nicht_wartend' | 'fehler';

export async function sendeEntwurf(actionId: string): Promise<{ ergebnis: SendeErgebnis; entryId?: string; fehler?: string }> {
  const r = await withSystem(async (tx) => {
    const [a] = await tx.select().from(actions).where(eq(actions.id, actionId)).for('update');
    if (!a || a.type !== 'mail.send') return { ergebnis: 'nicht_wartend' as const };
    if (a.undone_at) return { ergebnis: 'zurueckgeholt' as const };
    const entryId = (a.payload as { id: string }).id;
    const [d] = await tx.select().from(entries).where(eq(entries.id, entryId)).for('update');
    if (!d || d.kind !== 'draft') return { ergebnis: 'nicht_wartend' as const };
    const meta = EntwurfMeta.parse(d.meta);
    if (meta.send?.status !== 'queued') return { ergebnis: 'nicht_wartend' as const };

    const [conn] = await tx.select().from(connections).where(eq(connections.id, meta.connection_id));
    const [author] = await tx.select().from(users).where(eq(users.id, d.author_user_id!));
    const cfg = ImapConfig.parse(conn!.config);
    const bezug = meta.bezug_entry_id
      ? (await tx.select().from(entries).where(eq(entries.id, meta.bezug_entry_id)))[0]
      : undefined;
    const antwort = meta.art === 'antwort' && bezug;
    const bezugRefs = ((bezug?.meta as { references?: string[] } | undefined)?.references) ?? [];
    const references = antwort ? [...bezugRefs, bezug.dedupe_key] : undefined;
    const now = new Date();
    const m: Ausgehend = {
      // the team mailbox writes under its own address, a personal one under the person's name
      from: { name: conn!.user_id ? author!.name : conn!.label, address: cfg.address ?? author!.email },
      to: meta.to, cc: meta.cc, bcc: meta.bcc,
      subject: d.title ?? '',
      text: d.body_text ?? '',
      messageId: meta.send.message_id,
      inReplyTo: antwort ? bezug.dedupe_key : undefined,
      references,
      attachments: await Promise.all(meta.attachments.map(async (x) => ({ filename: x.filename, contentType: x.mime, content: await getBlob(x.blob_path) }))),
      date: now,
    };
    const raw = await baueMail(m);
    try {
      await sendeMail(cfg, m, raw);
    } catch (e) {
      const fehler = e instanceof Error ? e.message : String(e);
      // not sent: stays a draft (the undo still works), the interface shows why
      await tx.update(entries).set({ meta: { ...meta, send: { ...meta.send, status: 'failed', error: fehler.slice(0, 300) } } }).where(eq(entries.id, d.id));
      return { ergebnis: 'fehler' as const, entryId: d.id, fehler };
    }
    // it is out: the draft becomes the sent mail, and there is no undo any more
    await tx
      .update(entries)
      .set({
        kind: 'mail',
        dedupe_key: meta.send.message_id,
        external_id: meta.send.message_id,
        connection_id: conn!.id,
        thread_key: antwort ? (bezug.thread_key ?? bezug.dedupe_key) : meta.send.message_id,
        occurred_at: now,
        blob_path: await putBlob(raw),
        meta: {
          from: { name: m.from.name, email: m.from.address.toLowerCase() },
          to: meta.to.map((email) => ({ email })), cc: meta.cc.map((email) => ({ email })),
          headers: {}, folder: 'Sent', via_kollege: true, references,
          attachments: meta.attachments.map((x) => ({ filename: x.filename, mime: x.mime, text: null, blob_path: x.blob_path })),
        },
        visibility: conn!.user_id ? 'restricted' : 'team',
        visible_to: conn!.user_id ? [conn!.user_id] : [],
        // through the intake like every mail: links via the thread and the addresses
        processing_state: 'pending',
      })
      .where(eq(entries.id, d.id));
    await tx.update(actions).set({ inverse: null }).where(eq(actions.id, actionId));
    return { ergebnis: 'gesendet' as const, entryId: d.id, raw, conn: conn! };
  });

  if (r.ergebnis !== 'gesendet') return { ergebnis: r.ergebnis, entryId: r.entryId, fehler: r.fehler };
  // the copy in "Gesendet": the mail is out already – a failure here is logged, not repeated
  try {
    const ort = await inGesendetAblegen(r.conn, r.raw);
    if (ort.uid && ort.uidValidity) {
      await withSystem((tx) =>
        tx.insert(mailCopies)
          .values({ entry_id: r.entryId, connection_id: r.conn.id, folder: ort.folder, uid: ort.uid!, uid_validity: ort.uidValidity!, seen: true })
          .onConflictDoNothing(),
      );
    }
  } catch (e) {
    await withSystem((tx) =>
      tx.update(entries).set({ meta: sql`${entries.meta} || jsonb_build_object('gesendet_ablage_fehler', ${String(e)}::text)` }).where(eq(entries.id, r.entryId)),
    );
  }
  return { ergebnis: 'gesendet', entryId: r.entryId };
}

/** mails still waiting past their 10 s (job lost, worker restarted): their send actions */
export async function wartendeSendungen(aelterAlsSekunden = 15): Promise<string[]> {
  const r = await withSystem((tx) => tx.execute<{ id: string }>(sql`
    SELECT a.id FROM actions a JOIN entries e ON e.id = (a.payload->>'id')::uuid
    WHERE a.type = 'mail.send' AND a.undone_at IS NULL AND a.inverse IS NOT NULL
      AND e.kind = 'draft' AND e.meta->'send'->>'status' = 'queued'
      AND (e.meta->'send'->>'send_after')::timestamptz < now() - make_interval(secs => ${aelterAlsSekunden})
    ORDER BY a.created_at`));
  return r.rows.map((x) => x.id);
}
