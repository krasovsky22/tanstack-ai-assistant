# Playwright QA Script Registry

## Cronjob Logs Page
- **ID**: cronjob-logs-page
- **Coverage**: Cronjob logs page at `/cronjobs/:id/logs` — header, table, more/less toggle, back link, badge styling
- **Steps**:
  1. Navigate to `http://10.10.100.139:3000/cronjobs` (use host IP, not localhost — browser runs in Docker)
  2. Snapshot the page and confirm 3 cronjobs are listed in a table with columns: Name, Schedule, Status, Last Run, Actions
  3. Navigate to `http://10.10.100.139:3000/cronjobs/2447b10e-36de-4de5-981d-52dcb30cb1d4/logs`
  4. Snapshot the page and confirm:
     - No console errors on fresh load
     - Page header contains link `← Automation` with href `/cronjobs`
     - H2 heading text is `Logs — Jira DB ticket triage (simple changes auto-done)`
     - A table is present with columns: Ran At, Status, Duration, Result / Error
     - Multiple log rows are shown (each with a "success" badge and truncated result ending in "more")
  5. Take a full-page screenshot to confirm visual polish
  6. Click the "more" button on the first log row
  7. Confirm the row expands to show full content and button label changes to "less"
  8. Click "less" to collapse
  9. Confirm row returns to truncated state with "more" label
  10. Click `← Automation` link
  11. Confirm URL changes to `/cronjobs` and the Automation list renders
- **Last Run**: 2026-03-16
- **Status**: passing
- **Notes**:
  - Host IP `10.10.100.139` required for Docker-based Playwright MCP to reach the dev server; start server with `HOST=0.0.0.0 pnpm dev`
  - All visible logs have `status = 'success'` (green badge). Red error badge is implemented in source (`colorPalette={log.status === 'success' ? 'green' : 'red'}`) but not exercisable with current DB data
  - A hydration warning ("Hydration failed because the server rendered...") appears in the console when navigating client-side to the logs page; this is a React SSR mismatch, likely from the date `toLocaleString()` call producing different output on server vs client. Not a blocking failure but worth developer investigation
  - Console also logs a non-critical WebSocket error for TanStack DevTools (`ws://localhost:42069`) — expected when browser runs in Docker and cannot reach the devtools server on the host

## Cronjob List Page
- **ID**: cronjob-list
- **Coverage**: `/cronjobs` — lists all cronjobs with name, schedule, status badge, last run, and action buttons
- **Steps**:
  1. Navigate to `http://10.10.100.139:3000/cronjobs`
  2. Confirm page loads (0 console errors on fresh load)
  3. Confirm heading "Automation" is present
  4. Confirm "New Job" button/link is present pointing to `/cronjobs/new`
  5. Confirm table columns: Name, Schedule, Status, Last Run, Actions
  6. Confirm each row has action buttons: Stop/Start, Test run, View logs, Edit, Delete
  7. Confirm "View logs" links point to `/cronjobs/:id/logs`
- **Last Run**: 2026-03-16
- **Status**: passing
