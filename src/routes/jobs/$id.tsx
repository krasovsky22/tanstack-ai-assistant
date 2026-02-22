import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useForm } from '@tanstack/react-form';
import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { JOB_STATUSES } from '@/lib/job-constants';

const getJob = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { db } = await import('@/db');
    const { jobs } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) throw new Error('Job not found');
    return job;
  });

const resetJob = createServerFn({ method: 'POST' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { db } = await import('@/db');
    const { jobs } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');

    const [job] = await db
      .update(jobs)
      .set({
        title: '',
        company: '',
        source: '',
        link: null,
        notes: null,
        salary: null,
        skills: [],
        jobLocation: null,
        status: 'new',
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, id))
      .returning();

    if (!job) throw new Error('Job not found');
    return job;
  });

export const Route = createFileRoute('/jobs/$id')({
  loader: ({ params }) => getJob({ data: params.id }),
  component: EditJobPage,
});

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  processed: 'Processed',
  applied: 'Applied',
  answered: 'Answered',
  scheduled_for_interview: 'Interview Scheduled',
  offer_received: 'Offer Received',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

function SkillsInput({
  value,
  onChange,
  onBlur,
}: {
  value: string[];
  onChange: (skills: string[]) => void;
  onBlur: () => void;
}) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (raw: string) => {
    const skill = raw.trim();
    if (skill && !value.includes(skill)) {
      onChange([...value, skill]);
    }
    setInput('');
  };

  const remove = (skill: string) => {
    onChange(value.filter((s) => s !== skill));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(input);
    } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
      remove(value[value.length - 1]);
    }
  };

  const handleBlur = () => {
    if (input.trim()) add(input);
    onBlur();
  };

  return (
    <div
      className="min-h-[42px] w-full border rounded-lg px-3 py-2 flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-blue-500 focus-within:outline-none"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((skill) => (
        <span
          key={skill}
          className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full"
        >
          {skill}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              remove(skill);
            }}
            className="hover:text-blue-900 leading-none"
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={value.length === 0 ? 'Type a skill, press Enter or ,' : ''}
        className="flex-1 min-w-[140px] text-sm outline-none bg-transparent"
      />
    </div>
  );
}

function EditJobPage() {
  const job = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    await resetJob({ data: job.id });
    setConfirmReset(false);
    setResetting(false);
    router.invalidate();
  };

  const form = useForm({
    defaultValues: {
      title: job.title,
      company: job.company,
      source: job.source,
      link: job.link ?? '',
      status: job.status,
      description: job.description,
      notes: job.notes ?? '',
      salary: job.salary ?? '',
      skills: (job.skills as string[] | null) ?? [],
      jobLocation: job.jobLocation ?? '',
    },
    onSubmit: async ({ value }) => {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...value,
          link: value.link || null,
          notes: value.notes || null,
          salary: value.salary || null,
          jobLocation: value.jobLocation || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save job');
      navigate({ to: '/jobs' });
    },
  });

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/jobs" className="text-sm text-gray-500 hover:text-gray-700">
          ← Jobs
        </Link>
        <h1 className="text-2xl font-bold">Edit Job</h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <form.Field name="title">
            {(field) => (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title
                </label>
                <input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="company">
            {(field) => (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </form.Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <form.Field name="source">
            {(field) => (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. LinkedIn, Indeed, Referral"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="link">
            {(field) => (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Link
                </label>
                <input
                  type="url"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="https://..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </form.Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <form.Field name="status">
            {(field) => (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {JOB_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </form.Field>

          <form.Field name="jobLocation">
            {(field) => (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. Remote, New York, NY"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </form.Field>
        </div>

        <form.Field name="salary">
          {(field) => (
            <div className="sm:max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salary
              </label>
              <input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="e.g. $120k–$160k"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="skills">
          {(field) => (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skills
              </label>
              <SkillsInput
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>

        <form.Field
          name="description"
          validators={{
            onChange: ({ value }) =>
              !value.trim() ? 'Description is required' : undefined,
          }}
        >
          {(field) => (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                rows={12}
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
              {field.state.meta.isTouched && !field.state.meta.isValid && (
                <p className="text-sm text-red-600 mt-1">
                  {field.state.meta.errors.join(', ')}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="notes">
          {(field) => (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Any personal notes about this job..."
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>
          )}
        </form.Field>

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="px-6 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <Link
                  to="/jobs"
                  className="px-6 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Link>
              </div>

              <div className="flex items-center gap-2">
                {confirmReset ? (
                  <>
                    <span className="text-xs text-gray-500">Reset all fields?</span>
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={resetting}
                      className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {resetting ? 'Resetting...' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="text-xs px-3 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Reset to new
                  </button>
                )}
              </div>
            </div>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
