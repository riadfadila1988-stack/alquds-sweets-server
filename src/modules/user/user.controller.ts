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
}

export default new UserController();