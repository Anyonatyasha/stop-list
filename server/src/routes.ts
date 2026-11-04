import { Router } from 'express';
import { validateCategory, validateCreateStopEntry, validatePagination } from './domain';
import { ValidationError } from './errors';
import { asyncHandler } from './middleware';
import type { DishRepo } from './repository';
import type { StopListService } from './service';

export const createDishesRouter = (dishes: DishRepo): Router => {
  const router = Router();
  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.status(200).json(await dishes.findAll());
    }),
  );
  return router;
};

export const createStopListRouter = (service: StopListService): Router => {
  const router = Router();

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const { errors, value } = validateCreateStopEntry(req.body);
      if (!value) throw new ValidationError(Object.values(errors).join('; '));
      const created = await service.stopDish(value);
      res.status(201).json(created);
    }),
  );

  router.get(
    '/history',
    asyncHandler(async (req, res) => {
      const { errors, value } = validatePagination(req.query as Record<string, unknown>);
      if (!value) throw new ValidationError(Object.values(errors).join('; '));
      res.status(200).json(await service.getHistory(value.limit, value.offset));
    }),
  );

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { error, value } = validateCategory(req.query.category);
      if (error) throw new ValidationError(error);
      res.status(200).json(await service.listActive(value));
    }),
  );

  router.patch(
    '/:id/return',
    asyncHandler(async (req, res) => {
      res.status(200).json(await service.returnDish(req.params.id));
    }),
  );

  return router;
};
