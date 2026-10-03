CREATE TABLE "event_copies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entry_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"calendar_url" text NOT NULL,
	"href" text NOT NULL,
	"etag" text,
	"pending" boolean DEFAULT false NOT NULL,
	"loeschen" boolean DEFAULT false NOT NULL,
	CONSTRAINT "event_copies_place" UNIQUE("entry_id","connection_id")
);
--> statement-breakpoint
ALTER TABLE "event_copies" ADD CONSTRAINT "event_copies_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_copies" ADD CONSTRAINT "event_copies_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_copies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, UPDATE ON "event_copies" TO kollege_app;
--> statement-breakpoint
CREATE POLICY visible ON "event_copies" FOR SELECT TO kollege_app
  USING (EXISTS (SELECT 1 FROM entries e WHERE e.id = entry_id));
--> statement-breakpoint
CREATE POLICY own_calendar ON "event_copies" FOR UPDATE TO kollege_app
  USING (EXISTS (SELECT 1 FROM entries e WHERE e.id = entry_id)
         AND EXISTS (SELECT 1 FROM connections c WHERE c.id = connection_id))
  WITH CHECK (EXISTS (SELECT 1 FROM connections c WHERE c.id = connection_id));
--> statement-breakpoint
CREATE INDEX event_copies_pending_idx ON event_copies (connection_id) WHERE pending;
