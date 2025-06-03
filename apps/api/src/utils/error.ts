export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 500, error);
  }

  return new AppError('An unexpected error occurred', 500, error);
} 