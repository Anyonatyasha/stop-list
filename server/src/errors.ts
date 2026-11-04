export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'DISH_NOT_FOUND'
  | 'ENTRY_NOT_FOUND'
  | 'DISH_ALREADY_STOPPED'
  | 'ENTRY_NOT_ACTIVE'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR';

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  constructor(
    message: string,
    readonly code: ErrorCode,
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 422;
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  constructor(
    message: string, 
    code: ErrorCode = 'NOT_FOUND'
  ) {
    super(message, code);
  }
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  constructor(
    message: string,
    code: ErrorCode,
  ) {
    super(message, code);
  }
}
