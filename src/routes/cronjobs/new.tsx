import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';

export const Route = createFileRoute('/cronjobs/new')({
  component: NewCronjobPage,
});

function NewCronjobPage() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: '',
      cronExpression: '',
      prompt: '',
      isActive: true,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const res = await fetch('/api/cronjobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });
      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error ?? 'Failed to create job');
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
        <h1 className="text-2xl font-bold">New Cron Job</h1>
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
                placeholder="e.g. Daily Summary"
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
                placeholder="* * * * *"
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
                placeholder="What should the AI do when this job runs?"
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
                Active (schedule immediately)
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
                  {isSubmitting ? 'Creating...' : 'Create Job'}
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
