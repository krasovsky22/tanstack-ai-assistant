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
Generate tailored resume + cover letter
      ↓
status → resume_generated  (match score, resume & cover letter saved)
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
| `resume_generated` | Tailored resume and cover letter generated |
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

## Generating a tailored resume and cover letter

Once a job has been processed (status `processed`), you can generate a resume tailored to that specific job posting. The AI compares `files/resume/initial-resume.md` against the full job data, rewrites the resume to better emphasise matching experience, and produces a cover letter. Only existing experience is reframed — nothing is fabricated.

The AI returns:

| Output | Description |
|---|---|
| `matchScore` | 0–100 score indicating how well the current resume qualifies |
| `matchReason` | 2–3 sentence explanation of the score |
| `updatedResume` | Full resume in markdown, tailored to the job |
| `coverLetter` | Professional cover letter in markdown |

The two markdown files are saved to `public/generated/{job-id}/` and are accessible as static URLs. After generation, status is changed to `resume_generated` and the match score and file paths are stored in the database.

### Option 1 — UI (Generate Resume button)

**Global button:** On the `/jobs` dashboard, click **⚡ Generate Resume** in the header. Each click processes the oldest job with status `processed`.

**Per-card button:** Each job card with status `processed` also has a **Generate Resume** button that targets that specific job.

After generation, the card shows:
- A colour-coded **Match: XX%** badge (green ≥75%, amber ≥50%, red <50%)
- **Resume ↗** and **Cover Letter ↗** links that open the generated files

### Option 2 — CLI command

```bash
node scripts/generate-resume.mjs
```

Or target a specific job by ID:

```bash
node scripts/generate-resume.mjs <job-id>
```

**Requirements:** The dev server must be running (`pnpm dev`). The server handles `OPENAI_API_KEY`.

By default the script targets `http://localhost:3000`. Override with `APP_URL`:

```bash
APP_URL=https://my-staging-app.com node scripts/generate-resume.mjs
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
| `GET/POST` | `/api/jobs/process` | Process one `new` job with AI |
| `GET/POST` | `/api/jobs/generate-resume` | Generate tailored resume for one `processed` job |

Both `/api/jobs/process` and `/api/jobs/generate-resume` accept an optional `id` query parameter (or `id` in the POST body) to target a specific job instead of the next one in queue.

### `POST /api/jobs/process` response

**200** — returns the updated job object (status `processed`).

**404** — no jobs with status `new` found:
```json
{ "message": "No new jobs to process" }
```

**500** — `OPENAI_API_KEY` not set, or the LLM call failed.

### `POST /api/jobs/generate-resume` response

**200** — returns the updated job object (status `resume_generated`) including `matchScore`, `resumePath`, and `coverLetterPath`.

**404** — no jobs with status `processed` found:
```json
{ "message": "No processed jobs to generate resume for" }
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
| `match_score` | integer | Nullable — 0–100, set during resume generation |
| `resume_path` | text | Nullable — URL path to generated resume `.md` |
| `cover_letter_path` | text | Nullable — URL path to generated cover letter `.md` |
| `created_at` | timestamp | Auto |
| `updated_at` | timestamp | Auto |

After any schema change, run:

```bash
pnpm db:push
```
