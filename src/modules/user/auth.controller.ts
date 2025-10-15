import { Request, Response } from 'express';
import AuthService from './auth.service';

class AuthController {
    async login(req: Request, res: Response) {
        const { idNumber, password } = req.body;
        if (!idNumber || !password) {
             res.status(400).json({ message: 'idNumber and password are required' });
        }
        const result = await AuthService.login(idNumber, password);
        if (!result) {
             res.status(401).json({ message: 'Invalid credentials' });
        }
        res.json(result);
    }
}

export default new AuthController();



