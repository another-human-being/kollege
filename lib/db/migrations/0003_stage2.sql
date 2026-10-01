CREATE TYPE "public"."task_status" AS ENUM('open', 'in_progress', 'done');--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" SET DATA TYPE "public"."task_status" USING "status"::text::"public"."task_status";--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'open';--> statement-breakpoint
ALTER TABLE "matters" ADD COLUMN "handover_to" uuid;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_handover_to_users_id_fk" FOREIGN KEY ("handover_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- hand-written: "In Arbeit" exists only for what we owe (E44)
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_in_progress_ours" CHECK (status <> 'in_progress' OR direction = 'ours');
