import cors from 'cors';
import express, { type Express } from 'express';
import { errorHandler, notFoundHandler } from './middleware';
import { createDishesRouter, createStopListRouter } from './routes';
import type { DishRepo } from './repository';
import type { StopListService } from './service';

export const createApp = (deps: { stopListService: StopListService; dishRepo: DishRepo }): Express => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/dishes', createDishesRouter(deps.dishRepo));
  app.use('/api/stop-list', createStopListRouter(deps.stopListService));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
