import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useSectionDisabled } from '@/lib/sections';
import SectionDisabled from '@/components/SectionDisabled';

export const Route = createFileRoute('/_protected/notifications')({
  component: () => {
    const disabled = useSectionDisabled('notifications');
    if (disabled) return <SectionDisabled name="Notifications" />;
    return <Outlet />;
  },
});
