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


}

export default new UserService();