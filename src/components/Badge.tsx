interface BadgeProps {
  label: string;
  variant?: 'blue' | 'gray' | 'green' | 'red' | 'yellow';
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  blue: 'bg-blue-100 text-blue-700',
  gray: 'bg-gray-100 text-gray-600',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
};

export function Badge({ label, variant = 'blue' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${variantClasses[variant]}`}
    >
      {label}
    </span>
  );
}
