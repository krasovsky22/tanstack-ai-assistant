import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useSectionDisabled } from '@/lib/sections';
import SectionDisabled from '@/components/SectionDisabled';

export const Route = createFileRoute('/cronjobs')({
  component: () => {
    const disabled = useSectionDisabled('cronjobs');
    if (disabled) return <SectionDisabled name="Automation" />;
    return <Outlet />;
  },
});
