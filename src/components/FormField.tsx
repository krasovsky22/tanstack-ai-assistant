import { type ReactNode } from 'react';
import { Field } from '@chakra-ui/react';

type Props = {
  label: string;
  error?: string;
  isRequired?: boolean;
  helperText?: string;
  children: ReactNode;
};

export function FormField({ label, error, isRequired, helperText, children }: Props) {
  return (
    <Field.Root invalid={!!error} required={isRequired}>
      <Field.Label>{label}</Field.Label>
      {children}
      {helperText && !error && <Field.HelperText>{helperText}</Field.HelperText>}
      {error && <Field.ErrorText>{error}</Field.ErrorText>}
    </Field.Root>
  );
}
