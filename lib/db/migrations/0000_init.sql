CREATE TYPE "public"."actor_type" AS ENUM('user', 'system', 'model');--> statement-breakpoint
CREATE TYPE "public"."chat_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."confidence" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."connection_kind" AS ENUM('mail', 'calendar', 'drive');--> statement-breakpoint
CREATE TYPE "public"."connection_provider" AS ENUM('imap', 'graph', 'caldav', 'smb', 'fixture');--> statement-breakpoint
CREATE TYPE "public"."connection_status" AS ENUM('ok', 'error', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."created_by_type" AS ENUM('user', 'system');--> statement-breakpoint
CREATE TYPE "public"."email_source" AS ENUM('mail', 'calendar', 'manual');--> statement-breakpoint
CREATE TYPE "public"."entry_kind" AS ENUM('mail', 'event', 'file', 'note', 'instruction', 'system');--> statement-breakpoint
CREATE TYPE "public"."entry_visibility" AS ENUM('team', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."hint_kind" AS ENUM('clarify', 'overdue', 'waiting', 'stale', 'after_event', 'outcome', 'handover', 'review_batch', 'advice');--> statement-breakpoint
CREATE TYPE "public"."hint_status" AS ENUM('open', 'done', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."link_origin" AS ENUM('rule', 'model', 'human');--> statement-breakpoint
CREATE TYPE "public"."link_target_type" AS ENUM('matter', 'person', 'org');--> statement-breakpoint
CREATE TYPE "public"."matter_kind" AS ENUM('org_based', 'dated', 'period', 'item');--> statement-breakpoint
CREATE TYPE "public"."open_done" AS ENUM('open', 'done');--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('founding_team', 'partner', 'university', 'other');--> statement-breakpoint
CREATE TYPE "public"."person_role" AS ENUM('founder', 'mentor', 'partner', 'speaker', 'university', 'other');--> statement-breakpoint
CREATE TYPE "public"."processing_state" AS ENUM('pending', 'done', 'error', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."review_state" AS ENUM('unreviewed', 'accepted', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."task_direction" AS ENUM('ours', 'theirs');--> statement-breakpoint
CREATE TYPE "public"."task_visibility" AS ENUM('team', 'private');--> statement-breakpoint
CREATE TABLE "actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_user_id" uuid,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"inverse" jsonb,
	"parent_action_id" uuid,
	"reason" text,
	"applied_instruction_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"chat_id" uuid,
	"undone_at" timestamp with time zone,
	"undone_by" uuid
);
--> statement-breakpoint
CREATE TABLE "areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"key" text NOT NULL,
	"name_singular" text NOT NULL,
	"name_plural" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"matter_kind" "matter_kind" NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"phases" text[] DEFAULT '{}'::text[] NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "areas_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"chat_id" uuid NOT NULL,
	"role" "chat_role" NOT NULL,
	"content" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text,
	"context_type" text,
	"context_id" uuid,
	"pinned" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid,
	"kind" "connection_kind" NOT NULL,
	"provider" "connection_provider" NOT NULL,
	"label" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cursor" jsonb,
	"status" "connection_status" DEFAULT 'ok' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_error" text,
	"import_since" date DEFAULT (current_date - interval '12 months') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" "entry_kind" NOT NULL,
	"connection_id" uuid,
	"external_id" text,
	"dedupe_key" text NOT NULL,
	"thread_key" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"author_user_id" uuid,
	"author_person_id" uuid,
	"title" text,
	"body_text" text,
	"summary" text,
	"blob_path" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"visibility" "entry_visibility" DEFAULT 'restricted' NOT NULL,
	"visible_to" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"instruction_area_id" uuid,
	"instruction_user_id" uuid,
	"historical" boolean DEFAULT false NOT NULL,
	"processing_state" "processing_state" DEFAULT 'pending' NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (to_tsvector('german'::regconfig, coalesce(title, '') || ' ' || coalesce(body_text, '') || ' ' || coalesce(summary, ''))) STORED,
	CONSTRAINT "entries_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "hints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid,
	"kind" "hint_kind" NOT NULL,
	"text" text NOT NULL,
	"reason" text,
	"area_id" uuid,
	"target_type" text,
	"target_id" uuid,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "hint_status" DEFAULT 'open' NOT NULL,
	"show_from" timestamp with time zone,
	"dedupe_key" text NOT NULL,
	CONSTRAINT "hints_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entry_id" uuid NOT NULL,
	"target_type" "link_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"origin" "link_origin" NOT NULL,
	"confidence" "confidence" NOT NULL,
	"action_id" uuid,
	CONSTRAINT "links_entry_target_unique" UNIQUE("entry_id","target_type","target_id")
);
--> statement-breakpoint
CREATE TABLE "matters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"area_id" uuid NOT NULL,
	"title" text NOT NULL,
	"owner_user_id" uuid,
	"status" "open_done" DEFAULT 'open' NOT NULL,
	"phase" text,
	"fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"org_id" uuid,
	"parent_id" uuid,
	"date_start" timestamp with time zone,
	"date_end" timestamp with time zone,
	"predecessor_id" uuid,
	"review_state" "review_state" DEFAULT 'accepted' NOT NULL,
	"discard_reason" text,
	"created_by_type" "created_by_type" DEFAULT 'user' NOT NULL,
	"outcome_note" text
);
--> statement-breakpoint
CREATE TABLE "orgs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"role" "org_role" DEFAULT 'other' NOT NULL,
	"domains" text[] DEFAULT '{}'::text[] NOT NULL,
	"fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"phase" text,
	"owner_user_id" uuid,
	"review_state" "review_state" DEFAULT 'accepted' NOT NULL,
	"discard_reason" text,
	"merged_into_id" uuid
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"org_id" uuid,
	"role" "person_role" DEFAULT 'other' NOT NULL,
	"notes" text,
	"review_state" "review_state" DEFAULT 'accepted' NOT NULL,
	"discard_reason" text,
	"merged_into_id" uuid
);
--> statement-breakpoint
CREATE TABLE "person_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"person_id" uuid NOT NULL,
	"email" text NOT NULL,
	"source" "email_source" NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "person_emails_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"direction" "task_direction" NOT NULL,
	"owner_user_id" uuid,
	"owner_person_id" uuid,
	"due_at" timestamp with time zone,
	"status" "open_done" DEFAULT 'open' NOT NULL,
	"done_at" timestamp with time zone,
	"matter_id" uuid,
	"org_id" uuid,
	"source_entry_id" uuid,
	"visibility" "task_visibility" DEFAULT 'team' NOT NULL,
	"owner_of_private" uuid,
	"action_id" uuid
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_parent_action_id_actions_id_fk" FOREIGN KEY ("parent_action_id") REFERENCES "public"."actions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_undone_by_users_id_fk" FOREIGN KEY ("undone_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_author_person_id_people_id_fk" FOREIGN KEY ("author_person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_instruction_area_id_areas_id_fk" FOREIGN KEY ("instruction_area_id") REFERENCES "public"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_instruction_user_id_users_id_fk" FOREIGN KEY ("instruction_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hints" ADD CONSTRAINT "hints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hints" ADD CONSTRAINT "hints_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_parent_id_matters_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."matters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_predecessor_id_matters_id_fk" FOREIGN KEY ("predecessor_id") REFERENCES "public"."matters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orgs" ADD CONSTRAINT "orgs_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orgs" ADD CONSTRAINT "orgs_merged_into_id_orgs_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_merged_into_id_people_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_emails" ADD CONSTRAINT "person_emails_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_person_id_people_id_fk" FOREIGN KEY ("owner_person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_source_entry_id_entries_id_fk" FOREIGN KEY ("source_entry_id") REFERENCES "public"."entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_of_private_users_id_fk" FOREIGN KEY ("owner_of_private") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE no action ON UPDATE no action;