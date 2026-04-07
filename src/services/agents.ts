export async function getDefaultAgent() {
  const { db } = await import('@/db');
  const { agents } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');
  const rows = await db.select().from(agents).where(eq(agents.isDefault, true)).limit(1);
  return rows[0] ?? null;
}

export async function getAgentById(id: string) {
  const { db } = await import('@/db');
  const { agents } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');
  const rows = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getAgentByApiKey(apiKey: string) {
  const { db } = await import('@/db');
  const { agents } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');
  const rows = await db.select().from(agents).where(eq(agents.apiKey, apiKey)).limit(1);
  return rows[0] ?? null;
}

export type AgentRecord = Awaited<ReturnType<typeof getAgentById>>;
