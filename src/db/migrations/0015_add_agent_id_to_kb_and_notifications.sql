ALTER TABLE "knowledgebase_files" ADD COLUMN "agent_id" uuid REFERENCES "agents"("id") ON DELETE SET NULL;
ALTER TABLE "notifications" ADD COLUMN "agent_id" uuid REFERENCES "agents"("id") ON DELETE SET NULL;
