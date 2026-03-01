import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/cronjobs/$id')({
  component: () => <Outlet />,
});
