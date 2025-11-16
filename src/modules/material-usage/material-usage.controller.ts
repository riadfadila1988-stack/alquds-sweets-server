import { Request, Response } from 'express';
import MaterialUsageService from './material-usage.service';

class MaterialUsageController {
    async getMonthlyStatistics(req: Request, res: Response) {
        try {
            const { year, month } = req.query;

            console.log('📊 Material Usage Stats Request:', { year, month });

            if (!year || !month) {
                return res.status(400).json({ message: 'Year and month are required' });
            }

            const statistics = await MaterialUsageService.getMonthlyStatistics(
                Number(year),
                Number(month)
            );

            console.log('📊 Statistics found:', statistics.length, 'materials');
            res.json(statistics);
        } catch (error) {
            console.error('❌ Error fetching monthly statistics:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async getMaterialHistory(req: Request, res: Response) {
        try {
            const { materialId } = req.params;
            const { startDate, endDate, limit } = req.query;

            const history = await MaterialUsageService.getMaterialHistory(
                materialId,
                startDate ? new Date(startDate as string) : undefined,
                endDate ? new Date(endDate as string) : undefined,
                limit ? Number(limit) : undefined
            );

            res.json(history);
        } catch (error) {
            console.error('Error fetching material history:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async getAllUsage(req: Request, res: Response) {
        try {
            const { startDate, endDate, limit } = req.query;

            const usage = await MaterialUsageService.getAllUsage(
                startDate ? new Date(startDate as string) : undefined,
                endDate ? new Date(endDate as string) : undefined,
                limit ? Number(limit) : undefined
            );

            res.json(usage);
        } catch (error) {
            console.error('Error fetching usage data:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}

export default new MaterialUsageController();
