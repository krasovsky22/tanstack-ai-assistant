ALTER TABLE "jobs" ADD COLUMN "retry_count" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "error_message" text;
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "failed_at" timestamp;
