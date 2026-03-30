import { describe, it, expect } from 'vitest';

// @ts-expect-error — implementation not yet created (Wave 0 RED stub)
import { WebWidgetProvider } from './web-widget';

describe('WebWidgetProvider (W9-04)', () => {
  it('send() resolves a pending job to done status', async () => {
    const provider = new WebWidgetProvider(0); // port 0 = ephemeral
    const jobId = 'test-job-1';
    const chatId = 'test-chat-1';
    // Manually poke a pending job in
    provider['jobs'].set(jobId, { status: 'pending' });
    provider['chatIdToJobId'].set(chatId, jobId);
    await provider.send(chatId, 'hello from LLM');
    expect(provider.getJobState(jobId)).toEqual({ status: 'done', text: 'hello from LLM' });
  });

  it('implements the Provider interface', () => {
    const provider = new WebWidgetProvider(0);
    expect(typeof provider.name).toBe('string');
    expect(typeof provider.start).toBe('function');
    expect(typeof provider.stop).toBe('function');
    expect(typeof provider.send).toBe('function');
  });
});
