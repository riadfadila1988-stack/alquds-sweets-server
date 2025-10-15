import EmployeeModel from './user.model';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from './user.interface';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

class AuthService {
    async login(idNumber: string, password: string): Promise<{ token: string, user: Partial<User> } | null> {
        const user = await EmployeeModel.findOne({ idNumber, active: true });
        if (!user) return null;
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return null;
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        return {
            token,
            user: {
                _id: user._id,
                name: user.name,
                idNumber: user.idNumber,
                role: user.role,
            }
        };
    }
    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    }
}

export default new AuthService();

