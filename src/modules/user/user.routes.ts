import {Router} from "express";
import UserController from "./user.controller";
import AuthController from './auth.controller';
import {Request, Response} from "express";
const router = Router();

router.get('/', async (req: Request, res: Response) => await UserController.getAll(req, res));

router.post('/add', async (req: Request, res: Response) => await UserController.create(req, res));
router.post('/login', async (req: Request, res: Response) => await AuthController.login(req, res));

// Get single user
router.get('/:id', async (req: Request, res: Response) => await UserController.getOne(req, res));
// Update user
router.put('/:id', async (req: Request, res: Response) => await UserController.update(req, res));

export default router;