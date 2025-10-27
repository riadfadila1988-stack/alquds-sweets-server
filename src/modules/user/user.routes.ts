import {Router} from "express";
import UserController from "./user.controller";
import AuthController from './auth.controller';
import {Request, Response} from "express";
const router = Router();

router.get('/', async (req: Request, res: Response) => await UserController.getAll(req, res));

router.post('/add', async (req: Request, res: Response) => await UserController.create(req, res));
router.post('/login', async (req: Request, res: Response) => await AuthController.login(req, res));

export default router;