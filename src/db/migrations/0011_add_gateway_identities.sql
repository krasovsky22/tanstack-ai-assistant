CREATE TABLE "linking_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "user_id" uuid NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "linking_codes_code_unique" UNIQUE("code"),
  CONSTRAINT "linking_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);

CREATE TABLE "gateway_identities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" text NOT NULL,
  "external_chat_id" text NOT NULL,
  "user_id" uuid NOT NULL,
  "linked_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "gateway_identities_provider_external_chat_id_unique" UNIQUE("provider","external_chat_id"),
  CONSTRAINT "gateway_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);
