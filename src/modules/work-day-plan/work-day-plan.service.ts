import { WorkDayPlan } from './work-day-plan.model';
import { IWorkDayPlan } from './work-day-plan.interface';
import Material from '../material/material.model';
import NotificationService from '../notification/notification.service';

class WorkDayPlanService {
  async getByDate(date: string): Promise<IWorkDayPlan | null> {
    const d = new Date(date);
    return await WorkDayPlan.findOne({ date: d }).populate('assignments.user');
  }

  async getAll(): Promise<IWorkDayPlan[]> {
    return await WorkDayPlan.find().populate('assignments.user');
  }

  async createOrUpdate(date: string, assignments: any[]): Promise<IWorkDayPlan> {
    const d = new Date(date);
    let plan = await WorkDayPlan.findOne({ date: d });
    if (!plan) {
      // Creating a brand new plan; nothing to compare against, so just save
      plan = new WorkDayPlan({ date: d, assignments });
      return await plan.save();
    }

    // We have an existing plan: compare old assignments/tasks to incoming ones
    const oldAssignments = plan.assignments || [];

    // Helper to normalize user id to string
    const uid = (u: any) => (u && (u._id || u)).toString();

    for (const newAssign of assignments || []) {
      const newUserId = uid(newAssign.user);
      const oldAssign = (oldAssignments || []).find((a: any) => uid(a.user) === newUserId);
      const newTasks = newAssign.tasks || [];
      const oldTasks = (oldAssign && oldAssign.tasks) || [];

      for (let i = 0; i < newTasks.length; i++) {
        const newTask = newTasks[i] || {};

        // Try to find corresponding old task by _id first, fallback to index
        let oldTask = null;
        if (newTask._id) {
          oldTask = oldTasks.find((t: any) => t && t._id && t._id.toString() === newTask._id.toString());
        }
        if (!oldTask) {
          oldTask = oldTasks[i];
        }

        const newEnded = !!newTask.endTime;
        const oldEnded = !!(oldTask && oldTask.endTime);

        // If task just transitioned from not-ended to ended, decrement used materials
        if (newEnded && !oldEnded) {
          const usedMaterials = newTask.usedMaterials || [];
          for (const um of usedMaterials) {
            try {
              const matRef = um && (um.material && (um.material._id || um.material));
              const usedQty = Number(um && um.quantity) || 0;
              if (!matRef || usedQty <= 0) continue;

              // Load material, compute new quantity (clamped to >= 0), then update
              const mat = await Material.findById(matRef);
              if (!mat) continue;
              const currentQty = Number(mat.quantity) || 0;
              const newQty = Math.max(0, currentQty - usedQty);
              await Material.findByIdAndUpdate(matRef, { quantity: newQty }, { new: true });

              // If the material has a numeric notificationThreshold, create a low-stock notification
              // when the quantity crosses from >= threshold to < threshold. Avoid duplicate unread notifications.
              try {
                const threshold = Number(mat.notificationThreshold);
                if (!Number.isNaN(threshold)) {
                  const crossed = currentQty >= threshold && newQty < threshold;
                  if (crossed) {
                    // Check for an existing unread notification for this material
                    const existing = await NotificationService.findUnreadForMaterial(String(matRef));
                    if (!existing) {
                      const messageAr = `المادة '${mat.name}' منخفضة: المتبقي ${newQty} (الحد الأدنى ${threshold})`;
                      // Log notification creation attempt (Arabic message)
                      // eslint-disable-next-line no-console
                      console.log('[WorkDayPlan] creating low-stock notification for material', String(matRef), 'messageAr:', messageAr);
                      await NotificationService.createNotification(messageAr, String(matRef));
                    }
                  }
                }
              } catch (notifErr) {
                // don't block save for notification failures; just log
                // eslint-disable-next-line no-console
                console.error('Failed to create low-stock notification for material', matRef, notifErr);
              }
            } catch (err) {
              // Log error and continue with other materials/tasks; don't block save
              // eslint-disable-next-line no-console
              console.error('Failed to decrement material for usedMaterial', um, err);
            }
          }

          // If the task produces materials, increment their quantities
          const producedMaterials = newTask.producedMaterials || [];
          for (const pm of producedMaterials) {
            try {
              const matRef = pm && (pm.material && (pm.material._id || pm.material));
              const prodQty = Number(pm && pm.quantity) || 0;
              if (!matRef || prodQty <= 0) continue;

              // Load material, compute new quantity (add produced amount), then update
              const mat = await Material.findById(matRef);
              if (!mat) continue;
              const currentQty = Number(mat.quantity) || 0;
              const newQty = currentQty + prodQty;
              await Material.findByIdAndUpdate(matRef, { quantity: newQty }, { new: true });
            } catch (err) {
              // Log error and continue
              // eslint-disable-next-line no-console
              console.error('Failed to increment material for producedMaterial', pm, err);
            }
          }
        }
      }
    }

    // Persist the updated assignments
    plan.assignments = assignments;
    return await plan.save();
  }

  async deleteById(id: string) {
    return await WorkDayPlan.findByIdAndDelete(id);
  }
}

export default new WorkDayPlanService();
