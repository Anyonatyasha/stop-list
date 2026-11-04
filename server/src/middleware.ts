import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from './errors';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const asyncHandler =
  (handler: AsyncHandler): RequestHandler =>
  (req, res, next) => {
    handler(req, res, next).catch(next);
  };

export interface ErrorResponseBody {
  error: { code: string; message: string };
}

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } } satisfies ErrorResponseBody);
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res
      .status(400)
      .json({ error: { code: 'BAD_REQUEST', message: 'Некорректное тело запроса' } } satisfies ErrorResponseBody);
    return;
  }

  console.error(err);
  res
    .status(500)
    .json({ error: { code: 'INTERNAL_ERROR', message: 'Внутренняя ошибка сервера' } } satisfies ErrorResponseBody);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res
    .status(404)
    .json({ error: { code: 'NOT_FOUND', message: `Маршрут ${req.method} ${req.path} не найден` } } satisfies ErrorResponseBody);
};
