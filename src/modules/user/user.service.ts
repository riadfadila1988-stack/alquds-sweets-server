import {User} from "./user.interface";
import UserModel from "./user.model";
import AuthService from './auth.service';

class UserService {
    async findAll(): Promise<User[]> {
        try {
            return await UserModel.find();
        } catch (err) {
            throw err;
        }
    }
    async create(employee: User): Promise<User> {
        try {
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
            return await UserModel.findById(id);
        } catch (err) {
            throw err;
        }
    }

    // Update user by id (partial update)
    async update(id: string, payload: Partial<User>): Promise<User | null> {
        try {
            const updateData: any = { ...payload };
            // If password is provided, hash it
            if (payload.password) {
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