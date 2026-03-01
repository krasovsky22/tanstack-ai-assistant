CREATE TABLE "cronjobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "cron_expression" text NOT NULL,
  "prompt" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "last_run_at" timestamp,
  "last_result" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
