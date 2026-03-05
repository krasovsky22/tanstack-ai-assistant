CREATE TABLE "job_emails" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid REFERENCES "jobs"("id") ON DELETE SET NULL,
  "source" text NOT NULL,
  "email_content" text NOT NULL,
  "email_llm_summarized" text NOT NULL,
  "subject" text NOT NULL,
  "sender" text NOT NULL,
  "received_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "job_emails_job_id_idx" ON "job_emails"("job_id");
