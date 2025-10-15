import { Response } from 'express';

export default class BaseController {
    protected handleSuccess<T>(res: Response, data: T, statusCode = 200): void {
        console.log(data);
        res.status(statusCode).json(data);
    }

    protected handleError(res: Response, message: string, statusCode = 500): void {
        console.log(message);
        res.status(statusCode).json({ error: message });
    }
}