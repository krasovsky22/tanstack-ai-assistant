import { Badge } from '@chakra-ui/react';

export const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  processed: 'Processed',
  resume_generated: 'Resume Generated',
  applied: 'Applied',
  answered: 'Answered',
  scheduled_for_interview: 'Interview Scheduled',
  offer_received: 'Offer Received',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  'generated-from-email': 'From Email',
};

export const STATUS_COLOR_PALETTES: Record<string, string> = {
  new: 'gray',
  processed: 'teal',
  resume_generated: 'purple',
  applied: 'blue',
  answered: 'violet',
  scheduled_for_interview: 'orange',
  offer_received: 'green',
  rejected: 'red',
  withdrawn: 'gray',
  'generated-from-email': 'orange',
};

type Props = {
  status: string;
};

export function StatusBadge({ status }: Props) {
  return (
    <Badge
      colorPalette={STATUS_COLOR_PALETTES[status] ?? 'gray'}
      variant="subtle"
      borderRadius="full"
      px="2.5"
      py="1"
      fontSize="xs"
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
