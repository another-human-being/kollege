CREATE TABLE "model_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid,
	"role" text NOT NULL,
	"model" text NOT NULL,
	"purpose" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"duration_ms" integer NOT NULL,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- the app logs its own calls; reading is for operators only (table owner)
ALTER TABLE "model_calls" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT INSERT ON "model_calls" TO kollege_app;
--> statement-breakpoint
CREATE POLICY own_insert ON "model_calls" FOR INSERT TO kollege_app WITH CHECK (user_id = app_user_id());
--> statement-breakpoint
CREATE INDEX chat_messages_chat_idx ON chat_messages (chat_id, created_at);
--> statement-breakpoint
CREATE INDEX chats_user_idx ON chats (user_id, updated_at DESC);
