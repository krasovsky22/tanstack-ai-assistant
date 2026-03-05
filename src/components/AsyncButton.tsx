import { useState, type ReactNode, type ButtonHTMLAttributes } from 'react';

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg
      className="animate-spin shrink-0"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  onClick: () => Promise<unknown>;
  children: ReactNode;
  spinnerSize?: number;
};

export default function AsyncButton({ onClick, children, spinnerSize = 14, disabled, className, ...rest }: Props) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    try {
      await onClick();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      {...rest}
      onClick={handleClick}
      disabled={disabled || pending}
      className={className}
    >
      {pending ? <Spinner size={spinnerSize} /> : null}
      {children}
    </button>
  );
}
