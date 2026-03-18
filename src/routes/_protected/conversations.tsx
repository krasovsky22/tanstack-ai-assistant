import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useSectionDisabled } from '@/lib/sections';
import SectionDisabled from '@/components/SectionDisabled';

export const Route = createFileRoute('/_protected/conversations')({
  component: () => {
    const disabled = useSectionDisabled('ai');
    if (disabled) return <SectionDisabled name="AI" />;
    return <Outlet />;
  },
});
