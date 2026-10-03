-- event.create puts the copy of a new event into the person's (or the team's) calendar;
-- discarding a draft removes it. Same rule as for changes: the event is visible, the calendar is
-- one's own or the team's.
GRANT INSERT, DELETE ON "event_copies" TO kollege_app;
--> statement-breakpoint
CREATE POLICY own_calendar_insert ON "event_copies" FOR INSERT TO kollege_app
  WITH CHECK (EXISTS (SELECT 1 FROM entries e WHERE e.id = entry_id)
              AND EXISTS (SELECT 1 FROM connections c WHERE c.id = connection_id));
--> statement-breakpoint
CREATE POLICY own_calendar_delete ON "event_copies" FOR DELETE TO kollege_app
  USING (EXISTS (SELECT 1 FROM entries e WHERE e.id = entry_id)
         AND EXISTS (SELECT 1 FROM connections c WHERE c.id = connection_id));
