import Material from './material.model';
import { IMaterial } from './material.interface';
import NotificationService from '../notification/notification.service';
import MaterialUsageService from '../material-usage/material-usage.service';

class MaterialService {
    async getAllMaterials(limit = 100, page = 1): Promise<IMaterial[]> {
        const capped = Math.max(1, Math.min(1000, Number(limit)));
        const p = Math.max(1, Number(page));
        const skip = (p - 1) * capped;
        return Material.find().skip(skip).limit(capped).lean();
    }

    async createMaterial(materialData: IMaterial): Promise<IMaterial> {
        const newMaterial = new Material(materialData);
        const saved = await newMaterial.save();

        // If quantity is at or below threshold, create an admin notification (avoid duplicates)
        try {
            const q = saved.quantity ?? 0;
            const thresh = saved.notificationThreshold ?? 0;
            if (q <= thresh) {
                const existing = await NotificationService.findUnreadForMaterial(String(saved._id));
                if (!existing) {
                    // Arabic: notify admins that this material is low
                    const messageAr = `المادة '${saved.name}' منخفضة: المتبقي ${q} (الحد الأدنى ${thresh})`;
                    await NotificationService.createNotification(messageAr, String(saved._id));
                }
            }
        } catch (e) {
            // log and continue
            console.warn('Failed to create notification for material', e);
        }

        return saved;
    }

    async updateMaterial(id: string, materialData: Partial<IMaterial>, userId?: string, userName?: string): Promise<IMaterial | null> {
        // Load the existing document so Mongoose `updatedAt` timestamp is applied on save
        const existing = await Material.findById(id);
        if (!existing) return null;

        const previousQuantity = existing.quantity ?? 0;

        // assign provided fields
        Object.keys(materialData).forEach((key) => {
            // @ts-ignore
            existing.set(key, (materialData as any)[key]);
        });

        const updated = await existing.save();
        if (!updated) return null;

        // Log material usage if quantity changed
        if (materialData.quantity !== undefined && materialData.quantity !== previousQuantity) {
            try {
                await MaterialUsageService.logMaterialUsage({
                    materialId: String(updated._id),
                    materialName: updated.name,
                    previousQuantity,
                    newQuantity: updated.quantity ?? 0,
                    userId,
                    userName,
                });
            } catch (e) {
                console.warn('Failed to log material usage', e);
            }
        }

        try {
            const q = updated.quantity ?? 0;
            const thresh = updated.notificationThreshold ?? 0;
            if (q <= thresh) {
                const existingNotif = await NotificationService.findUnreadForMaterial(String(updated._id));
                if (!existingNotif) {
                    const messageAr = `المادة '${updated.name}' منخفضة: المتبقي ${q} (الحد الأدنى ${thresh})`;
                    await NotificationService.createNotification(messageAr, String(updated._id));
                }
            } else {
                // If quantity was replenished above threshold, mark existing notifications read
                await NotificationService.markAllReadForMaterial(String(updated._id));
            }
        } catch (e) {
            console.warn('Failed to handle notification for material update', e);
        }

        return updated;
    }

    async updateMaterialQuantity(id: string, data: { quantity?: number; userId?: string; userName?: string }): Promise<IMaterial | null> {
        const existing = await Material.findById(id);
        if (!existing) return null;

        const previousQuantity = existing.quantity ?? 0;

        if (typeof data.quantity === 'number') existing.quantity = data.quantity;

        const updated = await existing.save();
        // Log material usage change
        try {
            await MaterialUsageService.logMaterialUsage({
                materialId: String(updated._id),
                materialName: updated.name,
                previousQuantity,
                newQuantity: updated.quantity ?? 0,
                userId: data.userId,
                userName: data.userName,
            });
        } catch (e) {
            console.warn('Failed to log material usage', e);
        }


        try {
            const q = updated.quantity ?? 0;
            const thresh = updated.notificationThreshold ?? 0;
            if (q <= thresh) {
                const existingNotif = await NotificationService.findUnreadForMaterial(String(updated._id));
                if (!existingNotif) {
                    const messageAr = `المادة '${updated.name}' منخفضة: المتبقي ${q} (الحد الأدنى ${thresh})`;
                    await NotificationService.createNotification(messageAr, String(updated._id));
                }
            } else {
                await NotificationService.markAllReadForMaterial(String(updated._id));
            }
        } catch (e) {
            console.warn('Failed to handle notification for material update', e);
        }

        return updated;
    }

    async deleteMaterial(id: string): Promise<void> {
        await Material.findByIdAndDelete(id);
    }
}

export default new MaterialService();
