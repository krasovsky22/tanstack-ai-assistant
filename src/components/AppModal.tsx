import { type ReactNode } from 'react';
import { Dialog, IconButton } from '@chakra-ui/react';
import { X } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: string;
};

export function AppModal({ isOpen, onClose, title, children, footer, size = 'md' }: Props) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => { if (!details.open) onClose(); }} size={size as never}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header display="flex" alignItems="center" justifyContent="space-between">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.CloseTrigger asChild>
              <IconButton aria-label="Close dialog" variant="ghost" size="sm">
                <X size={16} />
              </IconButton>
            </Dialog.CloseTrigger>
          </Dialog.Header>
          <Dialog.Body>{children}</Dialog.Body>
          {footer && <Dialog.Footer>{footer}</Dialog.Footer>}
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
