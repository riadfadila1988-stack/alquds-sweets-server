import MaterialUsage from './material-usage.model';
import { IMaterialUsage } from './material-usage.interface';

class MaterialUsageService {
    async logMaterialUsage(data: {
        materialId: string;
        materialName: string;
        previousQuantity: number;
        newQuantity: number;
        userId?: string;
        userName?: string;
    }): Promise<IMaterialUsage> {
        const quantityChange = data.newQuantity - data.previousQuantity;

        console.log('💾 Logging material usage:', {
            materialName: data.materialName,
            previousQuantity: data.previousQuantity,
            newQuantity: data.newQuantity,
            quantityChange,
            userName: data.userName
        });

        const usageLog = new MaterialUsage({
            materialId: data.materialId,
            materialName: data.materialName,
            previousQuantity: data.previousQuantity,
            newQuantity: data.newQuantity,
            quantityChange,
            userId: data.userId,
            userName: data.userName,
            timestamp: new Date(),
        });

        const saved = await usageLog.save();
        console.log('✅ Material usage logged successfully:', saved._id);
        return saved;
    }

    // Get material usage statistics by month
    async getMonthlyStatistics(year: number, month: number): Promise<any> {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        console.log('🔍 Querying material usage:', { year, month, startDate, endDate });

        // First, check if there's any data at all
        const totalCount = await MaterialUsage.countDocuments();
        console.log('📦 Total material usage records in DB:', totalCount);

        const usageData = await MaterialUsage.aggregate([
            {
                $match: {
                    timestamp: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: '$materialId',
                    materialName: { $first: '$materialName' },
                    totalUsed: {
                        $sum: {
                            $cond: [
                                { $lt: ['$quantityChange', 0] },
                                { $abs: '$quantityChange' },
                                0
                            ]
                        }
                    },
                    totalAdded: {
                        $sum: {
                            $cond: [
                                { $gt: ['$quantityChange', 0] },
                                '$quantityChange',
                                0
                            ]
                        }
                    },
                    netChange: { $sum: '$quantityChange' },
                    usageCount: {
                        $sum: {
                            $cond: [
                                { $lt: ['$quantityChange', 0] },
                                1,
                                0
                            ]
                        }
                    },
                    additionCount: {
                        $sum: {
                            $cond: [
                                { $gt: ['$quantityChange', 0] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $sort: { totalUsed: -1 }
            }
        ]);

        console.log('📊 Aggregation result:', usageData.length, 'materials');
        return usageData;
    }

    // Get usage history for a specific material
    async getMaterialHistory(
        materialId: string,
        startDate?: Date,
        endDate?: Date,
        limit = 100
    ): Promise<IMaterialUsage[]> {
        const query: any = { materialId };

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = startDate;
            if (endDate) query.timestamp.$lte = endDate;
        }

        return await MaterialUsage.find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .populate('userId', 'name')
            .lean();
    }

    // Get all usage logs with optional filters
    async getAllUsage(
        startDate?: Date,
        endDate?: Date,
        limit = 500
    ): Promise<IMaterialUsage[]> {
        const query: any = {};

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = startDate;
            if (endDate) query.timestamp.$lte = endDate;
        }

        return await MaterialUsage.find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();
    }
}

export default new MaterialUsageService();
