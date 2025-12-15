import {Router, Request, Response, NextFunction} from "express";
import UserController from "./user.controller";
import AuthController from './auth.controller';
const router = Router();

router.get('/', (req: Request, res: Response, next: NextFunction) => {
    UserController.getAll(req, res).catch(next);
});

router.post('/add', (req: Request, res: Response, next: NextFunction) => {
    UserController.create(req, res).catch(next);
});
router.post('/login', (req: Request, res: Response, next: NextFunction) => {
    AuthController.login(req, res).catch(next);
});

// Get single user
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    UserController.getOne(req, res).catch(next);
});
// Update user
router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
    UserController.update(req, res).catch(next);
});

export default router;