CREATE TABLE "mail_copies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entry_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"folder" text NOT NULL,
	"uid" integer NOT NULL,
	"uid_validity" text NOT NULL,
	"seen" boolean DEFAULT false NOT NULL,
	"target_folder" text,
	"pending" boolean DEFAULT false NOT NULL,
	CONSTRAINT "mail_copies_place" UNIQUE("entry_id","connection_id","folder")
);
--> statement-breakpoint
ALTER TABLE "mail_copies" ADD CONSTRAINT "mail_copies_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_copies" ADD CONSTRAINT "mail_copies_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_copies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, UPDATE ON "mail_copies" TO kollege_app;
--> statement-breakpoint
-- a copy is visible if its mail is visible; changed only in one's own or the team mailbox
CREATE POLICY visible ON "mail_copies" FOR SELECT TO kollege_app
  USING (EXISTS (SELECT 1 FROM entries e WHERE e.id = entry_id));
--> statement-breakpoint
CREATE POLICY own_mailbox ON "mail_copies" FOR UPDATE TO kollege_app
  USING (EXISTS (SELECT 1 FROM entries e WHERE e.id = entry_id)
         AND EXISTS (SELECT 1 FROM connections c WHERE c.id = connection_id))
  WITH CHECK (EXISTS (SELECT 1 FROM connections c WHERE c.id = connection_id));
--> statement-breakpoint
CREATE INDEX mail_copies_pending_idx ON mail_copies (connection_id) WHERE pending;
