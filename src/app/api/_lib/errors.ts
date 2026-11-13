export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number,
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class UpstreamError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UpstreamError'
  }
}
