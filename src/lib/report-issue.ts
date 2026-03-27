export interface TicketInfo {
  category: string; // "Bug" | "Feature" | "Other"
  ticketKey: string; // e.g. "PROJ-42"
  ticketUrl: string; // full URL or empty string
}

export type ParseResult =
  | ({ success: true } & TicketInfo)
  | { success: false; error: string };

/**
 * Builds the system-style prompt sent to /api/chat-sync for issue classification
 * and Jira ticket creation. Instructs the LLM to classify the issue as Bug,
 * Feature, or Other and respond with ONLY valid JSON.
 */
export function buildReportPrompt(
  title: string,
  description: string,
  pageUrl: string,
): string {
  return `You are a software issue triage assistant. A user has submitted a report from the application.

Classify the issue as one of:
- Bug (use type: "Bug")
- Feature (use type: "Story")
- Other (use type: "Task")

Then call the contact_me tool with:
- subject: the issue title
- body: the description plus the page URL
- type: the mapped type above
- priority: "Medium"

Issue Details:
- Title: ${title}
- Description: ${description}
- Page URL: ${pageUrl}

After calling contact_me, respond with ONLY valid JSON, no markdown, no code blocks, using the ticketKey and ticketUrl fields from the tool result:
{"category":"<Bug|Feature|Other>","ticketKey":"<PROJ-NNN>","ticketUrl":"<url>"}`;
}

/**
 * Parses the LLM's JSON reply into structured ticket info.
 * Handles markdown code fences (```json or ```) by stripping them before parsing.
 * Returns a success shape or an error shape.
 */
export function parseTicketResponse(raw: string): ParseResult {
  try {
    // Strip leading/trailing markdown code fences (same pattern as parseGatewayDecision
    // in src/routes/api/chat-sync.tsx)
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    if (!cleaned) {
      return { success: false, error: 'Empty response' };
    }

    const parsed: unknown = JSON.parse(cleaned);

    if (typeof parsed !== 'object' || parsed === null) {
      return { success: false, error: 'Response is not a JSON object' };
    }

    const obj = parsed as Record<string, unknown>;

    const category = obj['category'];
    const ticketKey = obj['ticketKey'];
    const ticketUrl = obj['ticketUrl'];

    if (typeof category !== 'string' || !category) {
      return { success: false, error: 'Missing or invalid "category" field' };
    }

    if (typeof ticketKey !== 'string' || !ticketKey) {
      return { success: false, error: 'Missing or invalid "ticketKey" field' };
    }

    if (typeof ticketUrl !== 'string') {
      return { success: false, error: 'Missing or invalid "ticketUrl" field' };
    }

    return {
      success: true,
      category,
      ticketKey,
      ticketUrl,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to parse response: ${message}` };
  }
}
