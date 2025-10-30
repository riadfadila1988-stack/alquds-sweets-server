import { Request, Response } from 'express';
import AuthService from './auth.service';

class AuthController {
    async login(req: Request, res: Response) {
        try {
            const { idNumber, password } = req.body;
            if (!idNumber || !password) {
                // return immediately so we don't continue and send another response
                return res.status(400).json({ message: 'idNumber and password are required' });
            }

            const result = await AuthService.login(idNumber, password);
            if (!result) {
                // return immediately to avoid double-send
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            return res.json(result);
        } catch (err) {
            console.error('AuthController.login error:', err);
            if (!res.headersSent) {
                return res.status(500).json({ message: 'Internal server error' });
            }
            // If headers already sent, do nothing
        }
    }
}

export default new AuthController();
