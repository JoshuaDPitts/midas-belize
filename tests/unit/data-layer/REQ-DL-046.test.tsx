import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import {
  RateLimitAlert,
  formatWait,
} from '@/app/admin/data/components/RateLimitAlert';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('REQ-DL-046 — formatWait', () => {
  it('formats sub-minute waits as seconds', () => {
    expect(formatWait(30)).toBe('30s');
    expect(formatWait(0.5)).toBe('1s');
  });

  it('formats round minutes as Xm', () => {
    expect(formatWait(60)).toBe('1m');
    expect(formatWait(180)).toBe('3m');
    expect(formatWait(3600)).toBe('60m');
  });

  it('formats partial minutes as Xm Ys', () => {
    expect(formatWait(125)).toBe('2m 5s');
    expect(formatWait(61)).toBe('1m 1s');
  });

  it('returns "0s" for non-positive or invalid input', () => {
    expect(formatWait(0)).toBe('0s');
    expect(formatWait(-5)).toBe('0s');
    expect(formatWait(Number.NaN)).toBe('0s');
  });
});

describe('REQ-DL-046 — RateLimitAlert', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders the rate-limit message with the formatted wait time + a tabular timer', () => {
    render(<RateLimitAlert retryAfterSeconds={125} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/Rate limit reached/);
    expect(alert).toHaveTextContent(/2m 5s/);
    expect(alert.getAttribute('data-expired')).toBeNull();
  });

  it('uses the actionLabel in the message', () => {
    render(
      <RateLimitAlert retryAfterSeconds={30} actionLabel="rerunning" />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/before rerunning/);
  });

  it('counts down once per second', () => {
    render(<RateLimitAlert retryAfterSeconds={5} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/5s/);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('alert')).toHaveTextContent(/4s/);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('alert')).toHaveTextContent(/2s/);
  });

  it('flips to expired state and fires onExpire when timer hits zero', () => {
    const onExpire = vi.fn();
    render(<RateLimitAlert retryAfterSeconds={2} onExpire={onExpire} />);
    expect(onExpire).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(2000));
    expect(onExpire).toHaveBeenCalledTimes(1);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('data-expired', 'true');
    expect(alert).toHaveTextContent(/can try .* again now/);
  });

  it('resets the countdown when retryAfterSeconds prop changes (re-rate-limited)', () => {
    const { rerender } = render(<RateLimitAlert retryAfterSeconds={3} />);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('alert')).toHaveTextContent(/1s/);
    rerender(<RateLimitAlert retryAfterSeconds={10} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/10s/);
  });
});
