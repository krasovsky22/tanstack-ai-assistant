import { useQuery } from '@tanstack/react-query';

export type Section = 'ai' | 'jobs' | 'mail' | 'knowledge-base' | 'cronjobs' | 'notifications';

export function useDisabledSections() {
  return useQuery<{ disabled: Section[] }>({
    queryKey: ['sections'],
    queryFn: async () => {
      const res = await fetch('/api/sections');
      return res.json();
    },
    staleTime: Infinity,
  });
}

export function useSectionDisabled(section: Section) {
  const { data } = useDisabledSections();
  return data?.disabled.includes(section) ?? false;
}
