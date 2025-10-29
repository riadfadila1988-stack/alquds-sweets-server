import BaseController from "../../core/base.controller";
import EmployeeService from "./user.service";
import {Request, Response} from "express";

class UserController extends BaseController{
    async create(req: Request, res: Response){
        try {
            // Placeholder for employee creation logic
            const newEmployee = await EmployeeService.create(req.body);
            this.handleSuccess(res, newEmployee);
        } catch (e) {
            this.handleError(res, 'Failed to create employee');
        }
    }
    async getAll(req: Request, res: Response){
        try {
            const employees = await EmployeeService.findAll();
            this.handleSuccess(res, employees);
        } catch (e) {
            this.handleError(res, 'Failed to get employees');
        }
    }

    // Get single user by id
    async getOne(req: Request, res: Response){
        try {
            const { id } = req.params;
            const user = await EmployeeService.findById(id);
            if (!user) return this.handleError(res, 'User not found', 404);
            this.handleSuccess(res, user);
        } catch (e) {
            this.handleError(res, 'Failed to get user');
        }
    }

    // Update user by id
    async update(req: Request, res: Response){
        try {
            const { id } = req.params;
            const updated = await EmployeeService.update(id, req.body);
            if (!updated) return this.handleError(res, 'User not found', 404);
            this.handleSuccess(res, updated);
        } catch (e) {
            this.handleError(res, 'Failed to update user');
        }
    }
}

export default new UserController();