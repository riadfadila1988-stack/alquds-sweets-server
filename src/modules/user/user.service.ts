import {User} from "./user.interface";
import UserModel from "./user.model";
import AuthService from './auth.service';

class UserService {
    async findAll(limit = 100, page = 1): Promise<User[]> {
        try {
            const capped = Math.max(1, Math.min(1000, Number(limit)));
            const p = Math.max(1, Number(page));
            const skip = (p - 1) * capped;
            return await UserModel.find().skip(skip).limit(capped).lean();
        } catch (err) {
            throw err;
        }
    }
    async create(employee: User): Promise<User> {
        try {
            // Validate password length
            if (!employee.password || employee.password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }
            // Hash the password before saving
            const hashedPassword = await AuthService.hashPassword(employee.password);
            return await UserModel.create({ ...employee, password: hashedPassword, active: true, _id: undefined });
        } catch (err) {
            throw err;
        }
    }

    // Find a single user by id
    async findById(id: string): Promise<User | null> {
        try {
            return await UserModel.findById(id).lean();
        } catch (err) {
            throw err;
        }
    }

    // Update user by id (partial update)
    async update(id: string, payload: Partial<User>): Promise<User | null> {
        try {
            const updateData: any = { ...payload };
            // If password is provided, validate and hash it
            if (payload.password) {
                if (payload.password.length < 6) {
                    throw new Error('Password must be at least 6 characters');
                }
                updateData.password = await AuthService.hashPassword(payload.password);
            }
            // Avoid updating _id
            delete updateData._id;

            return await UserModel.findByIdAndUpdate(id, updateData, { new: true });
        } catch (err) {
            throw err;
        }
    }

}

export default new UserService();