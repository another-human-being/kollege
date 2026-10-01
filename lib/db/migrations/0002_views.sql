-- Hand-written: computed states for the views (BAUVORLAGE §8.2).
-- They must count everything the team has, not only what the asking user may read,
-- so they run as SECURITY DEFINER and return only ids and timestamps – no content.

-- working days (Mon–Fri) strictly between two dates
CREATE FUNCTION workdays_between(a date, b date) RETURNS int
  LANGUAGE sql IMMUTABLE
  AS $$ SELECT count(*)::int FROM generate_series(a + 1, b - 1, interval '1 day') d WHERE extract(isodow FROM d) < 6 $$;
--> statement-breakpoint

-- "wartet auf uns": the last mail of a thread came from outside, at least 2 working days ago,
-- and nobody from the team answered (in any mailbox). Returns that last mail.
CREATE FUNCTION waiting_on_us(p_now timestamptz)
  RETURNS TABLE (entry_id uuid)
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
    SELECT last.id FROM (
      SELECT DISTINCT ON (e.thread_key) e.id, e.author_user_id, e.occurred_at, e.processing_state
      FROM entries e
      WHERE e.kind = 'mail' AND e.thread_key IS NOT NULL AND e.processing_state <> 'skipped'
      ORDER BY e.thread_key, e.occurred_at DESC
    ) last
    WHERE app_user_id() IS NOT NULL
      AND last.author_user_id IS NULL
      AND last.processing_state = 'done'
      AND workdays_between((last.occurred_at AT TIME ZONE 'Europe/Berlin')::date,
                           (p_now AT TIME ZONE 'Europe/Berlin')::date) >= 2
  $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION waiting_on_us(timestamptz) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION waiting_on_us(timestamptz) TO kollege_app;
--> statement-breakpoint

-- last activity of every matter: newest linked entry; its creation only if it has none ("hängt")
CREATE FUNCTION matter_last_activity()
  RETURNS TABLE (matter_id uuid, last_at timestamptz)
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
    SELECT m.id, coalesce(max(e.occurred_at), m.created_at)
    FROM matters m
    LEFT JOIN links l ON l.target_type = 'matter' AND l.target_id = m.id
    LEFT JOIN entries e ON e.id = l.entry_id
    WHERE app_user_id() IS NOT NULL
    GROUP BY m.id
  $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION matter_last_activity() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION matter_last_activity() TO kollege_app;
--> statement-breakpoint

-- last activity of every organisation: entries linked to it or to its matters
CREATE FUNCTION org_last_activity()
  RETURNS TABLE (org_id uuid, last_at timestamptz)
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
    SELECT o.id, coalesce(max(e.occurred_at), o.created_at)
    FROM orgs o
    LEFT JOIN links l ON (l.target_type = 'org' AND l.target_id = o.id)
                      OR (l.target_type = 'matter' AND l.target_id IN (SELECT m.id FROM matters m WHERE m.org_id = o.id))
    LEFT JOIN entries e ON e.id = l.entry_id
    WHERE app_user_id() IS NOT NULL
    GROUP BY o.id
  $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION org_last_activity() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION org_last_activity() TO kollege_app;
--> statement-breakpoint

-- who has an entry (names only), e.g. "aus Julias Mail" for a commitment from a mail one cannot read (E13)
CREATE FUNCTION entry_owner_names(p_entry uuid) RETURNS text[]
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
    SELECT ARRAY(SELECT u.name FROM entries e JOIN users u ON u.id = ANY (e.visible_to)
                 WHERE e.id = p_entry AND app_user_id() IS NOT NULL ORDER BY u.name)
  $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION entry_owner_names(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION entry_owner_names(uuid) TO kollege_app;
