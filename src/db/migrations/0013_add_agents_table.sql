CREATE TABLE IF NOT EXISTS "agents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "model" text NOT NULL,
  "max_iterations" integer NOT NULL DEFAULT 10,
  "system_prompt" text NOT NULL DEFAULT '',
  "is_default" boolean NOT NULL DEFAULT false,
  "api_key" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "agents" ADD CONSTRAINT "agents_api_key_unique" UNIQUE("api_key");
