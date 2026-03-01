# Cron Jobs

The cron system lets you schedule AI tasks to run automatically on a timed schedule. You define a cron expression and a prompt; the worker fires the prompt through the LLM at the scheduled time and persists a log row per execution. A UI dashboard at `/cronjobs` lets you manage jobs and inspect run history.

---

## Architecture

```
/cronjobs UI (browser)
        ↓  CRUD via fetch
src/routes/api/cronjobs/  (TanStack Start server handlers)
        ↓  read/write
PostgreSQL (cronjobs + cronjob_logs tables)
        ↑  read active jobs at startup
workers/cron/index.ts  (Docker container)
        ↓  node-cron fires on schedule
        ↓  POST /api/chat-sync  { messages, title, source }
src/routes/api/chat-sync.tsx
        ↓  LLM call + conversation saved to DB
        ↑  { text }
workers/cron/index.ts
        ↓  INSERT cronjob_logs row
        ↓  UPDATE cronjobs.last_run_at + last_result
```

The worker has **direct database access** (unlike the gateway) because it needs to write logs and update job metadata after each run. The LLM call itself is still delegated to `/api/chat-sync` so all tool-calling, system prompts, and conversation persistence work identically to the chat UI.

---

## Design decisions

### Load-at-startup scheduling

The worker reads all `is_active = true` jobs from the database once at startup and schedules them with `node-cron`. This means:

- **Cron schedule changes require a worker restart** to take effect. Toggle `is_active` off, then on again, or restart the container.
- Jobs created or edited after the worker is running are not automatically picked up. Restart the worker to reload.
- This is a deliberate v1 simplicity trade-off — no polling loop, no distributed lock, no missed-run tracking.

### Test run vs scheduled run

The **Test** button in the UI calls `POST /api/cronjobs/:id/test`, which calls the LLM directly using `buildChatOptions` + `chat({ stream: false })`. It does **not** write a `cronjob_logs` row and does **not** update `last_run_at`. Use it to verify that a prompt returns useful output before committing to a schedule.

The worker's scheduled runs always write a log row regardless of success or failure.

---

## Running the cron worker

### Docker (recommended)

```bash
docker compose up cron --build
```

The `cron` service in `docker-compose.yml` depends on `postgres` and connects to the web app via `APP_URL` (defaults to `http://host.docker.internal:3000`).

The worker reads the `.env` file at startup. If `.env` is not present, environment variables must be injected externally (e.g. via Docker `environment:` block).

### Locally (development)

```bash
pnpm cron:dev
```

Requires the web app to also be running:

```bash
pnpm dev       # terminal 1 — web app on port 3000
pnpm cron:dev  # terminal 2 — cron worker (restarts on file changes)
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `APP_URL` | Yes | Base URL of the web app. Worker posts to `$APP_URL/api/chat-sync`. |
| `OPENAI_API_KEY` | Yes | Passed through to the LLM call inside the web app. |

---

## UI — `/cronjobs` dashboard

| Column | Description |
|---|---|
| Name | Display name for the job |
| Schedule | The raw cron expression (monospace) |
| Status | **Active** / **Inactive** — click to toggle. Inactive jobs are not scheduled by the worker at startup. |
| Last Run | Timestamp of the most recent scheduled execution, or `—` if never run |
| Actions | Test ▶, View Logs, Edit, Delete |

### Creating a job

Navigate to `/cronjobs/new` or click **New Job**.

| Field | Notes |
|---|---|
| Name | Human-readable label |
| Cron Expression | Standard 5-field cron syntax (minute hour day month weekday). Validated server-side before saving. |
| Prompt | The message sent to the LLM when the job fires |
| Active | Checked by default. Uncheck to create a job without scheduling it immediately. |

### Editing a job

Click the **pencil icon** or navigate to `/cronjobs/:id`. All fields can be updated. If you change the cron expression, restart the worker container for the new schedule to take effect.

### Deleting a job

Click the **trash icon** and confirm. Deleting a job cascades — all associated log rows are deleted automatically.

### Testing a job

Click **▶** on any row. The result is displayed inline below that row. No log entry is created.

### Viewing logs

Click the **list icon** or navigate to `/cronjobs/:id/logs`. The page shows the 50 most recent executions, newest first.

---

## Logs page — `/cronjobs/:id/logs`

| Column | Description |
|---|---|
| Ran At | Timestamp of the execution |
| Status | `success` (green) or `error` (red) |
| Duration | Execution time in milliseconds (includes LLM latency) |
| Result / Error | LLM response on success; error message on failure. Truncated to 120 chars — click to expand. |

---

## API reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/cronjobs` | List all cron jobs, ordered newest first |
| `POST` | `/api/cronjobs` | Create a new job. Validates `cronExpression`. Returns `201`. |
| `PATCH` | `/api/cronjobs/:id` | Update any subset of fields. Validates `cronExpression` if changed. |
| `DELETE` | `/api/cronjobs/:id` | Delete job and cascade-delete all logs. Returns `{ ok: true }`. |
| `POST` | `/api/cronjobs/:id/test` | Run the job prompt through the LLM. Returns `{ result }`. No log written. |
| `GET` | `/api/cronjobs/:id/logs` | Fetch the 50 most recent log rows for a job. |

### `POST /api/cronjobs` request body

```json
{
  "name": "Daily Summary",
  "cronExpression": "0 9 * * *",
  "prompt": "Summarise the top AI news from today in three bullet points.",
  "isActive": true
}
```

**400** — invalid cron expression:
```json
{ "error": "Invalid cron expression" }
```

### `GET /api/cronjobs/:id/logs` response

```json
[
  {
    "id": "uuid",
    "status": "success",
    "result": "Here are today's top AI stories...",
    "error": null,
    "durationMs": 3241,
    "ranAt": "2026-03-02T09:00:03.000Z"
  },
  {
    "id": "uuid",
    "status": "error",
    "result": null,
    "error": "HTTP 500: Internal error",
    "durationMs": 812,
    "ranAt": "2026-03-01T09:00:01.000Z"
  }
]
```

---

## Database schema

### `cronjobs`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, auto-generated |
| `name` | text | Required |
| `cron_expression` | text | Required — validated on write |
| `prompt` | text | Required |
| `is_active` | boolean | Default: `true` |
| `last_run_at` | timestamp | Nullable — set after each scheduled run |
| `last_result` | text | Nullable — LLM response or `ERROR: …` from last run |
| `created_at` | timestamp | Auto |
| `updated_at` | timestamp | Auto |

### `cronjob_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, auto-generated |
| `cronjob_id` | uuid | Foreign key → `cronjobs.id` ON DELETE CASCADE |
| `status` | text | `'success'` or `'error'` |
| `result` | text | Nullable — LLM response on success |
| `error` | text | Nullable — error message on failure |
| `duration_ms` | integer | Nullable — wall-clock time from fire to completion |
| `ran_at` | timestamp | Default: `now()` |

Logs are cascade-deleted when the parent cronjob is deleted.

---

## Cron expression syntax

`node-cron` uses standard 5-field POSIX syntax:

```
┌──── minute       (0–59)
│ ┌── hour         (0–23)
│ │ ┌ day-of-month (1–31)
│ │ │ ┌ month      (1–12)
│ │ │ │ ┌ weekday  (0–7, 0 and 7 are Sunday)
│ │ │ │ │
* * * * *
```

Common examples:

| Expression | Meaning |
|---|---|
| `* * * * *` | Every minute |
| `0 * * * *` | Every hour, on the hour |
| `0 9 * * *` | Every day at 09:00 |
| `0 9 * * 1` | Every Monday at 09:00 |
| `0 9 1 * *` | First day of every month at 09:00 |
| `*/15 * * * *` | Every 15 minutes |

The API rejects expressions that fail `validate()` from `node-cron` before inserting or updating.
