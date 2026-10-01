-- Hand-written: roles, row level security, functions, triggers, indexes.
-- BAUVORLAGE §5. The migrating role owns all tables and is used by the worker
-- (owner => RLS does not apply). The app switches per transaction to the role
-- kollege_app and sets app.user_id (lib/db/client.ts withUser).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kollege_app') THEN
    CREATE ROLE kollege_app NOLOGIN;
  END IF;
END $$;
--> statement-breakpoint
GRANT kollege_app TO CURRENT_USER;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO kollege_app;
--> statement-breakpoint

-- current user of the app context; NULL when not set => policies hide everything
CREATE FUNCTION app_user_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;
--> statement-breakpoint

-- updated_at
CREATE FUNCTION set_updated_at() RETURNS trigger
  LANGUAGE plpgsql
  AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
--> statement-breakpoint
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','connections','areas','orgs','people','person_emails','matters',
                           'entries','links','tasks','actions','hints','chats','chat_messages']
  LOOP
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;
--> statement-breakpoint

-- matters.parent_id: exactly one level (§4.6)
CREATE FUNCTION check_matter_parent() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF NEW.parent_id = NEW.id THEN
      RAISE EXCEPTION 'matter cannot be its own parent';
    END IF;
    IF EXISTS (SELECT 1 FROM matters WHERE id = NEW.parent_id AND parent_id IS NOT NULL) THEN
      RAISE EXCEPTION 'parent matter already has a parent (only one level allowed)';
    END IF;
    IF EXISTS (SELECT 1 FROM matters WHERE parent_id = NEW.id) THEN
      RAISE EXCEPTION 'matter with children cannot get a parent (only one level allowed)';
    END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER matters_parent_check BEFORE INSERT OR UPDATE OF parent_id ON matters
  FOR EACH ROW EXECUTE FUNCTION check_matter_parent();
--> statement-breakpoint

ALTER TABLE person_emails ADD CONSTRAINT person_emails_lowercase CHECK (email = lower(email));
--> statement-breakpoint
ALTER TABLE tasks ADD CONSTRAINT tasks_private_owner CHECK ((visibility = 'private') = (owner_of_private IS NOT NULL));
--> statement-breakpoint
ALTER TABLE entries ADD CONSTRAINT entries_restricted_viewers CHECK (visibility = 'team' OR cardinality(visible_to) > 0);
--> statement-breakpoint

-- indexes
CREATE INDEX entries_search_idx ON entries USING gin (search);
--> statement-breakpoint
CREATE INDEX entries_visible_to_idx ON entries USING gin (visible_to);
--> statement-breakpoint
CREATE INDEX entries_thread_idx ON entries (thread_key);
--> statement-breakpoint
CREATE INDEX entries_pending_idx ON entries (processing_state) WHERE processing_state = 'pending';
--> statement-breakpoint
CREATE INDEX links_target_idx ON links (target_type, target_id);
--> statement-breakpoint
CREATE INDEX orgs_domains_idx ON orgs USING gin (domains);
--> statement-breakpoint
CREATE INDEX tasks_matter_idx ON tasks (matter_id);
--> statement-breakpoint
CREATE INDEX actions_parent_idx ON actions (parent_action_id);
--> statement-breakpoint

-- privileges of the app role (RLS below narrows rows)
GRANT SELECT ON users, connections TO kollege_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON areas, actions TO kollege_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON orgs, people, person_emails, matters, entries, links, tasks, hints,
  chats, chat_messages TO kollege_app;
--> statement-breakpoint

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','connections','areas','orgs','people','person_emails','matters',
                           'entries','links','tasks','actions','hints','chats','chat_messages']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
--> statement-breakpoint

-- team-visible objects: every team member (§5)
CREATE POLICY team_read ON users FOR SELECT TO kollege_app USING (app_user_id() IS NOT NULL);
--> statement-breakpoint
CREATE POLICY own_or_team ON connections FOR SELECT TO kollege_app
  USING (app_user_id() IS NOT NULL AND (user_id IS NULL OR user_id = app_user_id()));
--> statement-breakpoint
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['areas','orgs','people','person_emails','matters']
  LOOP
    EXECUTE format('CREATE POLICY team_all ON %I FOR ALL TO kollege_app
                    USING (app_user_id() IS NOT NULL) WITH CHECK (app_user_id() IS NOT NULL)', t);
  END LOOP;
END $$;
--> statement-breakpoint

-- entries: team or listed in visible_to
CREATE POLICY visible ON entries FOR ALL TO kollege_app
  USING (visibility = 'team' OR app_user_id() = ANY (visible_to))
  WITH CHECK (visibility = 'team' OR app_user_id() = ANY (visible_to));
--> statement-breakpoint

-- links are derived work coordination: readable by the team; changing them
-- requires that the user can see the entry
CREATE POLICY team_read ON links FOR SELECT TO kollege_app USING (app_user_id() IS NOT NULL);
--> statement-breakpoint
CREATE POLICY entry_visible_insert ON links FOR INSERT TO kollege_app
  WITH CHECK (EXISTS (SELECT 1 FROM entries e WHERE e.id = entry_id));
--> statement-breakpoint
CREATE POLICY entry_visible_update ON links FOR UPDATE TO kollege_app
  USING (EXISTS (SELECT 1 FROM entries e WHERE e.id = entry_id))
  WITH CHECK (EXISTS (SELECT 1 FROM entries e WHERE e.id = entry_id));
--> statement-breakpoint
CREATE POLICY entry_visible_delete ON links FOR DELETE TO kollege_app
  USING (EXISTS (SELECT 1 FROM entries e WHERE e.id = entry_id));
--> statement-breakpoint

-- tasks: all, private ones only for their owner
CREATE POLICY visible ON tasks FOR ALL TO kollege_app
  USING (app_user_id() IS NOT NULL AND (visibility = 'team' OR owner_of_private = app_user_id()))
  WITH CHECK (app_user_id() IS NOT NULL AND (visibility = 'team' OR owner_of_private = app_user_id()));
--> statement-breakpoint

-- hints: team hints or own
CREATE POLICY team_or_own ON hints FOR ALL TO kollege_app
  USING (app_user_id() IS NOT NULL AND (user_id IS NULL OR user_id = app_user_id()))
  WITH CHECK (app_user_id() IS NOT NULL AND (user_id IS NULL OR user_id = app_user_id()));
--> statement-breakpoint

-- actions: only one's own (reason may quote restricted mail; decision 2026-10-01)
CREATE POLICY own_read ON actions FOR SELECT TO kollege_app USING (actor_user_id = app_user_id());
--> statement-breakpoint
CREATE POLICY own_insert ON actions FOR INSERT TO kollege_app
  WITH CHECK (actor_user_id = app_user_id() AND actor_type IN ('user', 'model'));
--> statement-breakpoint
CREATE POLICY own_update ON actions FOR UPDATE TO kollege_app
  USING (actor_user_id = app_user_id()) WITH CHECK (actor_user_id = app_user_id());
--> statement-breakpoint

-- chats: owner only
CREATE POLICY own ON chats FOR ALL TO kollege_app
  USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());
--> statement-breakpoint
CREATE POLICY own ON chat_messages FOR ALL TO kollege_app
  USING (EXISTS (SELECT 1 FROM chats c WHERE c.id = chat_id))
  WITH CHECK (EXISTS (SELECT 1 FROM chats c WHERE c.id = chat_id));
--> statement-breakpoint

-- placeholders for linked entries the current user may not see (§5):
-- only kind, occurred_at and owner names – no subject, no text
CREATE FUNCTION entry_stubs(p_target_type link_target_type, p_target_id uuid)
  RETURNS TABLE (kind entry_kind, occurred_at timestamptz, owner_names text[])
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
    SELECT e.kind, e.occurred_at,
           ARRAY(SELECT u.name FROM users u WHERE u.id = ANY (e.visible_to) ORDER BY u.name)
    FROM entries e
    JOIN links l ON l.entry_id = e.id
    WHERE app_user_id() IS NOT NULL
      AND l.target_type = p_target_type
      AND l.target_id = p_target_id
      AND e.visibility = 'restricted'
      AND NOT (app_user_id() = ANY (e.visible_to))
    ORDER BY e.occurred_at
  $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION entry_stubs(link_target_type, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION entry_stubs(link_target_type, uuid) TO kollege_app;
