import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { JOB_STATUSES } from '@/lib/job-constants';

export const Route = createFileRoute('/jobs/new')({
  component: NewJobPage,
});

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  applied: 'Applied',
  answered: 'Answered',
  scheduled_for_interview: 'Interview Scheduled',
  offer_received: 'Offer Received',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

function NewJobPage() {
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      title: '',
      company: '',
      source: '',
      link: '',
      status: 'new' as string,
      description: '',
      notes: '',
    },
    onSubmit: async ({ value }) => {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
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
        <h1 className="text-2xl font-bold">Add Job</h1>
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

        <form.Field name="status">
          {(field) => (
            <div className="sm:max-w-xs">
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
                placeholder="Paste the full job description here..."
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
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={!canSubmit}
                className="px-6 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save Job'}
              </button>
              <Link
                to="/jobs"
                className="px-6 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
            </div>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
