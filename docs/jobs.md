# Jobs

The jobs section is a job application tracker. You paste a raw job posting, and the app uses an LLM to extract structured data from it — title, company, platform, salary, required skills, and location. From there you track the application through its lifecycle via status updates.

---

## Workflow overview

```
Add job (status: new)
      ↓
Run AI processor
      ↓
Fields extracted, status → processed
      ↓
Apply, interview, outcome...
applied → answered → scheduled_for_interview → offer_received
                                             → rejected
                                             → withdrawn
```

---

## Statuses

| Status | Meaning |
|---|---|
| `new` | Job added, not yet processed by AI |
| `processed` | AI has extracted structured fields |
| `applied` | Application submitted |
| `answered` | Recruiter/company responded |
| `scheduled_for_interview` | Interview confirmed |
| `offer_received` | Offer made |
| `rejected` | Application rejected |
| `withdrawn` | You withdrew the application |

---

## Adding a job

Navigate to `/jobs/new` or click **Add Job** from the dashboard.

**Required:**
- **Job Description** — paste the full raw job posting text here. This is what the AI reads.

**Optional but recommended:**
- **Job Link** — URL to the original posting. The AI uses the domain to infer the source platform (e.g. `linkedin.com` → "LinkedIn").
- **Job Title**, **Company**, **Source** — pre-fill these if you know them; the AI will overwrite them during processing.
- **Status** — defaults to `new`.
- **Notes** — personal notes, not seen by the AI.

On submit, the job is saved with status `new` and is ready to be processed.

---

## Processing a job with AI

Processing reads the job description (and link URL if present) and extracts:

| Field | Description |
|---|---|
| `title` | Job title |
| `company` | Company name |
| `source` | Platform (inferred from link domain) |
| `salary` | Salary/compensation range, if mentioned |
| `skills` | Array of required technologies and tools |
| `location` | City, region, country, or "Remote" |

After processing, status is changed to `processed` and all extracted fields are saved to the database.

### Option 1 — UI (Process button)

On the `/jobs` dashboard, click the **⚡ Process** button in the top-right area of the header.

Each click processes **one** job at a time (the oldest unprocessed one with status `new`). The list refreshes automatically on completion.

If no `new` jobs remain, an error message is shown below the header.

### Option 2 — CLI command

```bash
pnpm process-jobs
```

A thin script that calls `POST /api/jobs/process` on the running dev server and prints the result. All AI logic lives in the API endpoint — the script is just an HTTP trigger.

**Requirements:** The dev server must be running (`pnpm dev`). The server handles `OPENAI_API_KEY`.

By default the script targets `http://localhost:3000`. Override with `APP_URL`:

```bash
APP_URL=https://my-staging-app.com pnpm process-jobs
```

**Example output:**
```
POSTing to http://localhost:3000/api/jobs/process ...
Processed job:
{
  "id": "3f2a1b...",
  "title": "Senior Frontend Engineer",
  "company": "Acme Corp",
  "source": "LinkedIn",
  "salary": "$140k–$180k",
  "skills": ["React", "TypeScript", "GraphQL"],
  "jobLocation": "Remote",
  "status": "processed",
  ...
}
```

To process multiple jobs, run the command repeatedly:

```bash
# process 5 jobs in sequence
for i in {1..5}; do pnpm process-jobs; done
```

---

## Editing a job

Click the **pencil icon** on any job card in the dashboard, or navigate directly to `/jobs/:id`.

The edit page shows all fields, including those populated by the AI processor:

- Title, Company, Source, Job Link, Status
- **Location** — extracted or manually entered
- **Salary** — extracted or manually entered
- **Skills** — comma-separated list, extracted or manually entered
- Job Description, Notes

Changes are saved with **Save Changes** and redirect back to the dashboard.

---

## API reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/jobs` | List jobs. Query params: `status`, `search` |
| `POST` | `/api/jobs` | Create a new job |
| `GET` | `/api/jobs/:id` | Fetch a single job by ID |
| `PATCH` | `/api/jobs/:id` | Update fields on a job |
| `DELETE` | `/api/jobs/:id` | Delete a job |
| `POST` | `/api/jobs/process` | Process one `new` job with AI |

### `POST /api/jobs/process` response

**200** — returns the updated job object.

**404** — no jobs with status `new` found:
```json
{ "message": "No new jobs to process" }
```

**500** — `OPENAI_API_KEY` not set, or the LLM call failed.

---

## Database schema

Table: `jobs`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, auto-generated |
| `title` | text | Required |
| `company` | text | Required |
| `description` | text | Required — the raw job posting |
| `source` | text | Required — platform name |
| `status` | text | Default: `new` |
| `link` | text | Nullable — URL to original posting |
| `notes` | text | Nullable — personal notes |
| `salary` | text | Nullable — AI-extracted |
| `skills` | jsonb | Nullable — `string[]`, AI-extracted |
| `job_location` | text | Nullable — AI-extracted |
| `created_at` | timestamp | Auto |
| `updated_at` | timestamp | Auto |

After any schema change, run:

```bash
pnpm db:push
```
