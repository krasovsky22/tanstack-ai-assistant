import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useSectionDisabled } from '@/lib/sections';
import SectionDisabled from '@/components/SectionDisabled';

export const Route = createFileRoute('/_protected/cronjobs')({
  component: () => {
    const disabled = useSectionDisabled('cronjobs');
    if (disabled) return <SectionDisabled name="Automation" />;
    return <Outlet />;
  },
});
