import { describe, it, expect } from 'vitest';
import { CONVERSATION_SOURCES } from './conversation-sources';

describe('CONVERSATION_SOURCES (W9-05)', () => {
  it('WIDGET constant equals "widget"', () => {
    expect(CONVERSATION_SOURCES.WIDGET).toBe('widget');
  });
});
