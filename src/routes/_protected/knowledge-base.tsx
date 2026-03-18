import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useSectionDisabled } from '@/lib/sections';
import SectionDisabled from '@/components/SectionDisabled';

export const Route = createFileRoute('/_protected/knowledge-base')({
  component: () => {
    const disabled = useSectionDisabled('knowledge-base');
    if (disabled) return <SectionDisabled name="Knowledge Base" />;
    return <Outlet />;
  },
});
