-- E13 in the mail view: mails of a thread the user may not read appear as placeholders –
-- only when and with whom, never content (like entry_stubs).
CREATE FUNCTION thread_stubs(p_thread text)
  RETURNS TABLE (occurred_at timestamptz, owner_names text[])
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
    SELECT e.occurred_at, ARRAY(SELECT u.name FROM users u WHERE u.id = ANY (e.visible_to) ORDER BY u.name)
    FROM entries e
    WHERE app_user_id() IS NOT NULL
      AND e.kind = 'mail' AND e.thread_key = p_thread
      AND NOT (e.visibility = 'team' OR app_user_id() = ANY (e.visible_to))
    ORDER BY e.occurred_at
  $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION thread_stubs(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION thread_stubs(text) TO kollege_app;
