import { Badge as ChakraBadge } from '@chakra-ui/react';

interface BadgeProps {
  label: string;
  variant?: 'blue' | 'gray' | 'green' | 'red' | 'yellow';
}

const variantColorPalettes: Record<NonNullable<BadgeProps['variant']>, string> = {
  blue: 'blue',
  gray: 'gray',
  green: 'green',
  red: 'red',
  yellow: 'yellow',
};

export function Badge({ label, variant = 'blue' }: BadgeProps) {
  return (
    <ChakraBadge
      colorPalette={variantColorPalettes[variant]}
      variant="subtle"
      borderRadius="full"
      px="2"
      py="0.5"
      fontSize="xs"
      fontWeight="medium"
      textTransform="capitalize"
    >
      {label}
    </ChakraBadge>
  );
}
