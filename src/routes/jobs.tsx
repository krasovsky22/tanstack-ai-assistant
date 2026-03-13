import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useSectionDisabled } from '@/lib/sections';
import SectionDisabled from '@/components/SectionDisabled';

export const Route = createFileRoute('/jobs')({
  component: () => {
    const disabled = useSectionDisabled('jobs');
    if (disabled) return <SectionDisabled name="Job Search" />;
    return <Outlet />;
  },
});
