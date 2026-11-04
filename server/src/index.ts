import 'dotenv/config';
import { createApp } from './app';
import { createInMemoryDishRepo, createInMemoryStopListRepo } from './repository';
import { createStopListService } from './service';

const PORT = Number(process.env.PORT ?? 3001);

const dishRepo = createInMemoryDishRepo();
const stopListService = createStopListService({
  stopList: createInMemoryStopListRepo(),
  dishes: dishRepo,
  now: () => new Date(),
});

createApp({ stopListService, dishRepo }).listen(PORT, () => {
  console.log(`Stop-list API listening on http://localhost:${PORT}`);
});
