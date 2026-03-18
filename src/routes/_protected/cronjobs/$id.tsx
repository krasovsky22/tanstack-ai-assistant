import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_protected/cronjobs/$id')({
  component: () => <Outlet />,
});
