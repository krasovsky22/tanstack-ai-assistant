ALTER TABLE "jobs" ADD COLUMN "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "cronjobs" ADD COLUMN "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "cronjob_logs" ADD COLUMN "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
