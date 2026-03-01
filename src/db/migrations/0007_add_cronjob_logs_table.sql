CREATE TABLE "cronjob_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cronjob_id" uuid NOT NULL REFERENCES "cronjobs"("id") ON DELETE CASCADE,
  "status" text NOT NULL,
  "result" text,
  "error" text,
  "duration_ms" integer,
  "ran_at" timestamp DEFAULT now() NOT NULL
);
