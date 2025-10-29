import BaseController from "../../core/base.controller";
import EmployeeService from "./user.service";
import {Request, Response} from "express";

class UserController extends BaseController{
    // helper to remove password from returned user(s)
    private sanitizeUser(user: any) {
        if (!user) return user;
        // Mongoose documents may have toObject
        const obj = typeof user.toObject === 'function' ? user.toObject() : user;
        const { password, ...rest } = obj;
        return rest;
    }

    async create(req: Request, res: Response){
        try {
            // Placeholder for employee creation logic
            const newEmployee = await EmployeeService.create(req.body);
            this.handleSuccess(res, this.sanitizeUser(newEmployee));
        } catch (e: any) {
            // If service threw a validation error, forward message
            const message = e?.message || 'Failed to create employee';
            this.handleError(res, message);
        }
    }
    async getAll(req: Request, res: Response){
        try {
            const employees = await EmployeeService.findAll();
            // sanitize list
            const sanitized = Array.isArray(employees) ? employees.map((u: any) => this.sanitizeUser(u)) : employees;
            this.handleSuccess(res, sanitized);
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
            this.handleSuccess(res, this.sanitizeUser(user));
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
            this.handleSuccess(res, this.sanitizeUser(updated));
        } catch (e: any) {
            const message = e?.message || 'Failed to update user';
            this.handleError(res, message);
        }
    }
}

export default new UserController();