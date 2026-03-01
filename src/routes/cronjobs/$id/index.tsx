import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';

const getCronjob = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { db } = await import('@/db');
    const { cronjobs } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');

    const [job] = await db.select().from(cronjobs).where(eq(cronjobs.id, id));
    if (!job) throw new Error('Cronjob not found');
    return job;
  });

export const Route = createFileRoute('/cronjobs/$id/')({
  loader: ({ params }) => getCronjob({ data: params.id }),
  component: EditCronjobPage,
});

function EditCronjobPage() {
  const job = Route.useLoaderData();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: job.name,
      cronExpression: job.cronExpression,
      prompt: job.prompt,
      isActive: job.isActive,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const res = await fetch(`/api/cronjobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });
      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error ?? 'Failed to update job');
        return;
      }
      navigate({ to: '/cronjobs' });
    },
  });

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/cronjobs" className="text-sm text-gray-500 hover:text-gray-700">
          ← Automation
        </Link>
        <h1 className="text-2xl font-bold">Edit Cron Job</h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-5"
      >
        <form.Field
          name="name"
          validators={{ onChange: ({ value }) => !value.trim() ? 'Name is required' : undefined }}
        >
          {(field) => (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {field.state.meta.isTouched && !field.state.meta.isValid && (
                <p className="text-sm text-red-600 mt-1">{field.state.meta.errors.join(', ')}</p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field
          name="cronExpression"
          validators={{ onChange: ({ value }) => !value.trim() ? 'Cron expression is required' : undefined }}
        >
          {(field) => (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cron Expression
              </label>
              <input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">minute hour day month weekday</p>
              {field.state.meta.isTouched && !field.state.meta.isValid && (
                <p className="text-sm text-red-600 mt-1">{field.state.meta.errors.join(', ')}</p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field
          name="prompt"
          validators={{ onChange: ({ value }) => !value.trim() ? 'Prompt is required' : undefined }}
        >
          {(field) => (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
              <textarea
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                rows={6}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
              {field.state.meta.isTouched && !field.state.meta.isValid && (
                <p className="text-sm text-red-600 mt-1">{field.state.meta.errors.join(', ')}</p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="isActive">
          {(field) => (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={field.state.value}
                onChange={(e) => field.handleChange(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <div className="space-y-3">
              {submitError && (
                <p className="text-sm text-red-600">{submitError}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="px-6 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <Link
                  to="/cronjobs"
                  className="px-6 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </div>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
