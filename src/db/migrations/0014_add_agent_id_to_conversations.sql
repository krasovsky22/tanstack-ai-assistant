ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "agent_id" uuid;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agent_id_agents_id_fk"
  FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
