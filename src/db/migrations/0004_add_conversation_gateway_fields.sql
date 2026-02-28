ALTER TABLE "conversations" ADD COLUMN "is_closed" boolean DEFAULT false NOT NULL;
ALTER TABLE "conversations" ADD COLUMN "chat_id" text;
