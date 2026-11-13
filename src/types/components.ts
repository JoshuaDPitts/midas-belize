import { type ReactNode } from 'react';

export interface BaseProps {
  className?: string;
  children?: ReactNode;
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon';
export type SliderMode = 'single' | 'range';
export type Placement = 'top' | 'bottom' | 'left' | 'right';
export type ModalSize = 'sm' | 'md' | 'lg';
