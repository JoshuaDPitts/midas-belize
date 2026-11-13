import { cn } from '@/lib/cn';
import styles from './ContentContainer.module.css';

interface ContentContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function ContentContainer({ children, className }: ContentContainerProps) {
  return <div className={cn(styles.container, className)}>{children}</div>;
}
