import { describe, it, expect } from 'vitest';
import { gatewayIdentities, linkingCodes } from '@/db/schema';

describe('gatewayIdentities schema (GID-01)', () => {
  it('has provider column', () => {
    expect(gatewayIdentities.provider).toBeDefined();
  });
  it('has externalChatId column', () => {
    expect(gatewayIdentities.externalChatId).toBeDefined();
  });
  it('has userId column', () => {
    expect(gatewayIdentities.userId).toBeDefined();
  });
  it('has linkedAt column', () => {
    expect(gatewayIdentities.linkedAt).toBeDefined();
  });
});

describe('linkingCodes schema (GID-02)', () => {
  it('has code column', () => {
    expect(linkingCodes.code).toBeDefined();
  });
  it('has userId column', () => {
    expect(linkingCodes.userId).toBeDefined();
  });
  it('has expiresAt column', () => {
    expect(linkingCodes.expiresAt).toBeDefined();
  });
  it('has usedAt column', () => {
    expect(linkingCodes.usedAt).toBeDefined();
  });
});
