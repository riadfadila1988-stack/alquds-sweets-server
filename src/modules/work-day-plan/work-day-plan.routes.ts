import { Router } from 'express';
import WorkDayPlanController from './work-day-plan.controller';
import { Request, Response } from 'express';

const router = Router();

router.get('/by-date', async (req: Request, res: Response) => await WorkDayPlanController.getByDate(req, res));
router.get('/', async (req: Request, res: Response) => await WorkDayPlanController.getAll(req, res));
router.post('/', async (req: Request, res: Response) => await WorkDayPlanController.createOrUpdate(req, res));
router.delete('/:id', async (req: Request, res: Response) => await WorkDayPlanController.delete(req, res));

export default router;

