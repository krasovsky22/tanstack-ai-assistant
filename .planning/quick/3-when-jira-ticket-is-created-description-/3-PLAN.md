---
phase: quick-3
plan: 3
type: execute
wave: 1
depends_on: []
files_modified:
  - src/services/jira.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "Jira ticket descriptions render with proper headings, bullet lists, ordered lists, bold/italic, and code blocks in the Jira portal"
    - "Plain text descriptions (no markdown) still render correctly"
    - "Both jira_create_issue and jira_update_description send ADF with structured nodes"
  artifacts:
    - path: "src/services/jira.ts"
      provides: "markdownToAdf() replaces toAdf() — converts markdown to structured ADF"
  key_links:
    - from: "src/services/jira.ts createIssue()"
      to: "Jira REST API /rest/api/3/issue"
      via: "fields.description = markdownToAdf(description)"
    - from: "src/services/jira.ts updateIssueDescription()"
      to: "Jira REST API /rest/api/3/issue/:key"
      via: "fields.description = markdownToAdf(description)"
---

<objective>
Fix Jira ticket descriptions to render as properly formatted content in the Jira portal by converting markdown to Atlassian Document Format (ADF) instead of wrapping the entire description as a single plain-text paragraph.

Purpose: LLM-generated descriptions contain markdown (headings, lists, bold, code blocks). The current toAdf() wraps all text as one plain paragraph — markdown symbols appear as literal characters in Jira.
Output: Updated src/services/jira.ts with markdownToAdf() that produces structured ADF nodes.
</objective>

<execution_context>
@/Users/RandomPotato/.claude/get-shit-done/workflows/execute-plan.md
@/Users/RandomPotato/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace toAdf() with markdownToAdf() in src/services/jira.ts</name>
  <files>src/services/jira.ts</files>
  <action>
Replace the existing `toAdf(text: string)` function with `markdownToAdf(text: string)` that line-by-line parses common markdown constructs into proper ADF nodes. Update all call sites (createIssue and updateIssueDescription) to use the new function.

Implementation requirements for markdownToAdf():

1. Process input line by line. Accumulate ADF content nodes in an array.

2. Heading detection — lines starting with `# `, `## `, `### ` (up to ######):
   ```
   { type: 'heading', attrs: { level: N }, content: [{ type: 'text', text: 'Heading text' }] }
   ```

3. Bullet list items — lines starting with `- ` or `* `:
   Consecutive bullet items must be wrapped in a single `bulletList` node:
   ```
   { type: 'bulletList', content: [
     { type: 'listItem', content: [{ type: 'paragraph', content: [inlineContent] }] },
     ...
   ] }
   ```
   Accumulate consecutive bullet lines, flush the list when a non-bullet line is reached.

4. Ordered list items — lines starting with `1. `, `2. ` etc. (digit + dot + space):
   Same accumulation logic, wrapped in `orderedList`.

5. Code blocks — lines starting with ``` (triple backtick fence):
   Collect lines until closing ```, produce:
   ```
   { type: 'codeBlock', attrs: { language: detectedLang || null }, content: [{ type: 'text', text: 'code content' }] }
   ```

6. Blank lines — produce `{ type: 'paragraph', content: [] }` (empty paragraph as visual separator). Skip if previous node is already an empty paragraph.

7. All other lines — paragraph with inline content parsed for bold/italic/inline code:
   ```
   { type: 'paragraph', content: parseInline(line) }
   ```

8. parseInline(text) — returns array of ADF text nodes with optional marks:
   - `**text**` or `__text__` → `{ type: 'text', text: 'text', marks: [{ type: 'strong' }] }`
   - `*text*` or `_text_` → `{ type: 'text', text: 'text', marks: [{ type: 'em' }] }`
   - `` `code` `` → `{ type: 'text', text: 'code', marks: [{ type: 'code' }] }`
   - Plain segments → `{ type: 'text', text: 'segment' }` (no marks property needed)
   - Marks are combinable (bold+italic). Use a simple regex-based tokenizer.

9. The returned ADF document wrapper:
   ```typescript
   { type: 'doc', version: 1, content: [...nodes] }
   ```
   Content must have at least one node — if input is empty/blank, return a single empty paragraph.

10. Rename the old `toAdf` to `markdownToAdf` and update these two call sites:
    - `createIssue()`: `fields.description = markdownToAdf(description)` (line ~398)
    - `updateIssueDescription()`: body `description: markdownToAdf(description)` (line ~206)
    - `addComment()`: body `body: toAdf(comment)` — leave comments as plain text (comments don't need markdown, and the existing behavior is acceptable)

Do NOT add any new dependencies. This is pure TypeScript logic.
  </action>
  <verify>
    <automated>pnpm vitest run src/services/jira.test.ts 2>/dev/null || echo "No jira test file — verify by inspecting markdownToAdf output manually via: node -e \"const {markdownToAdf} = require('./src/services/jira'); console.log(JSON.stringify(markdownToAdf('# Hello\n- item 1\n- item 2\n**bold**'), null, 2))\" 2>/dev/null || pnpm tsc --noEmit"</automated>
  </verify>
  <done>
    markdownToAdf('# Title\n- bullet 1\n- bullet 2\n\n**bold text**') returns ADF doc with: heading node (level 1), bulletList node with 2 listItems, empty paragraph, paragraph with strong-marked text node. TypeScript compiles without errors (pnpm tsc --noEmit passes).
  </done>
</task>

</tasks>

<verification>
- `pnpm tsc --noEmit` passes — no TypeScript errors
- `pnpm test` passes — no regressions in existing test suite
- Inspect markdownToAdf output for a markdown sample — ADF structure has heading, bulletList, orderedList, codeBlock, paragraph nodes as appropriate
</verification>

<success_criteria>
When the LLM creates a Jira ticket with a description like:
```
## Steps to Reproduce
1. Open the settings page
2. Click Save

**Expected:** Settings saved
**Actual:** 500 error

`console.log(error)` shows null reference
```
The Jira portal renders it with a level-2 heading, a numbered list, bold labels, and inline code — not as raw markdown symbols in a wall of text.
</success_criteria>

<output>
After completion, create `.planning/quick/3-when-jira-ticket-is-created-description-/3-SUMMARY.md`
</output>
