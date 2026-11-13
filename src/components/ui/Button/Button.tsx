import { type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import type { ButtonVariant } from '@/types/components';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  return (
    <button className={cn(styles.button, styles[variant], className)} data-variant={variant} {...props}>
      {children}
    </button>
  );
}
