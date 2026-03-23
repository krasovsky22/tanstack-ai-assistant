import { db } from '@/db';
import { gatewayIdentities, linkingCodes } from '@/db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export function generateLinkingCode(): string {
  return randomBytes(3).toString('hex').toUpperCase();
}

export async function createLinkingCode(userId: string) {
  const code = generateLinkingCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const [row] = await db.insert(linkingCodes)
    .values({ code, userId, expiresAt })
    .returning();
  return row;
}

export async function redeemLinkingCode(
  code: string,
  provider: string,
  externalChatId: string,
): Promise<{ success: boolean; message: string }> {
  const now = new Date();
  const [claimed] = await db
    .update(linkingCodes)
    .set({ usedAt: now })
    .where(
      and(
        eq(linkingCodes.code, code.toUpperCase()),
        isNull(linkingCodes.usedAt),
        gt(linkingCodes.expiresAt, now),
      ),
    )
    .returning();

  if (!claimed) {
    return { success: false, message: 'Invalid or expired code. Generate a new one in Settings.' };
  }

  await db.insert(gatewayIdentities)
    .values({ provider, externalChatId, userId: claimed.userId })
    .onConflictDoUpdate({
      target: [gatewayIdentities.provider, gatewayIdentities.externalChatId],
      set: { userId: claimed.userId, linkedAt: now },
    });

  return { success: true, message: 'Account linked! You can now use the assistant.' };
}

export async function getGatewayIdentitiesForUser(userId: string) {
  return db
    .select({
      id: gatewayIdentities.id,
      provider: gatewayIdentities.provider,
      externalChatId: gatewayIdentities.externalChatId,
      linkedAt: gatewayIdentities.linkedAt,
    })
    .from(gatewayIdentities)
    .where(eq(gatewayIdentities.userId, userId));
}

export async function deleteGatewayIdentity(id: string, userId: string) {
  return db
    .delete(gatewayIdentities)
    .where(and(eq(gatewayIdentities.id, id), eq(gatewayIdentities.userId, userId)));
}

export async function resolveGatewayIdentity(
  provider: string,
  chatId: string,
): Promise<{ userId: string | null }> {
  const [row] = await db
    .select({ userId: gatewayIdentities.userId })
    .from(gatewayIdentities)
    .where(
      and(
        eq(gatewayIdentities.provider, provider),
        eq(gatewayIdentities.externalChatId, chatId),
      ),
    )
    .limit(1);
  return { userId: row?.userId ?? null };
}
