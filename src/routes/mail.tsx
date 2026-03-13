import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useSectionDisabled } from '@/lib/sections';
import SectionDisabled from '@/components/SectionDisabled';

export const Route = createFileRoute('/mail')({
  component: () => {
    const disabled = useSectionDisabled('mail');
    if (disabled) return <SectionDisabled name="Mail" />;
    return <Outlet />;
  },
});
