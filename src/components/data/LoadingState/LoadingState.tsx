import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import styles from './LoadingState.module.css';

interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  width?: number;
  height?: number;
}

export function LoadingState({ width, height, className, style, ...props }: LoadingStateProps) {
  return (
    <div
      className={cn(styles.skeleton, className)}
      style={{
        width: width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined,
        ...style,
      }}
      {...props}
    />
  );
}
