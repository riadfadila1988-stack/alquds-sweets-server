import Material from './material.model';
import { IMaterial } from './material.interface';
import NotificationService from '../notification/notification.service';

class MaterialService {
    async getAllMaterials(): Promise<IMaterial[]> {
        return Material.find();
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

    async updateMaterial(id: string, materialData: Partial<IMaterial>): Promise<IMaterial | null> {
        const updated = await Material.findByIdAndUpdate(id, materialData, { new: true });
        if (!updated) return null;

        try {
            const q = updated.quantity ?? 0;
            const thresh = updated.notificationThreshold ?? 0;
            if (q <= thresh) {
                const existing = await NotificationService.findUnreadForMaterial(String(updated._id));
                if (!existing) {
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

    async deleteMaterial(id: string): Promise<void> {
        await Material.findByIdAndDelete(id);
    }
}

export default new MaterialService();
