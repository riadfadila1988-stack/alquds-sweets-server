import { WorkDayPlan } from './work-day-plan.model';
import { IWorkDayPlan } from './work-day-plan.interface';
import Material from '../material/material.model';
import NotificationService from '../notification/notification.service';

class WorkDayPlanService {
  async getByDate(date: string): Promise<IWorkDayPlan | null> {
    const d = new Date(date);
    return await WorkDayPlan.findOne({ date: d }).populate('assignments.user').lean();
  }

  // Make getAll paginated and lean to avoid returning the entire collection into memory
  async getAll(limit = 100, page = 1): Promise<IWorkDayPlan[]> {
    const capped = Math.max(1, Math.min(1000, Number(limit)));
    const p = Math.max(1, Number(page));
    const skip = (p - 1) * capped;
    return await WorkDayPlan.find().skip(skip).limit(capped).populate('assignments.user').lean();
  }

  async createOrUpdate(date: string, assignments: any[]): Promise<IWorkDayPlan> {
    const d = new Date(date);

    // Helper: parse a value into a Date when possible. Accepts ISO strings, epoch numbers,
    // or time-only strings like 'HH:mm' which are interpreted on the provided plan date `d`.
    const parseDateOrTimeOnPlanDate = (val: any) => {
      if (val === undefined || val === null) return val;
      // If already a Date, return if valid
      if (val instanceof Date) return Number.isFinite(val.getTime()) ? val : val;
      // If numeric (epoch)
      if (typeof val === 'number' && Number.isFinite(val)) {
        const dd = new Date(val);
        return Number.isFinite(dd.getTime()) ? dd : val;
      }
      if (typeof val === 'string') {
        // If ISO-like or timezone-inclusive, try parsing as Date
        if (val.includes('T') || /\d{4}-\d{2}-\d{2}/.test(val)) {
          const dd = new Date(val);
          if (Number.isFinite(dd.getTime())) return dd;
        }
        // Accept 'HH:mm' (optionally with seconds) and interpret on plan date
        const hhmm = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/.exec(val);
        if (hhmm) {
          const hh = Number(hhmm[1]);
          const mm = Number(hhmm[2]);
          const ss = hhmm[3] ? Number(hhmm[3]) : 0;
          if (hh >= 0 && hh < 24 && mm >= 0 && mm < 60 && ss >= 0 && ss < 60) {
            const combined = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, ss, 0);
            return combined;
          }
        }
        // Fallback: try generic Date parse
        const dd2 = new Date(val);
        if (Number.isFinite(dd2.getTime())) return dd2;
      }
      return val;
    };

    // Map common alternative names to server canonical names before normalization
    const mapTaskNames = (t: any) => {
      if (!t || typeof t !== 'object') return t;
      const mapped: any = { ...t };
      // Scheduled start: accept startAt / scheduledStart / scheduleAt / start_at variants
      mapped.startAt = mapped.startAt ?? mapped.scheduledStart ?? mapped.scheduleAt ?? mapped.start_at ?? mapped.scheduled_start ?? mapped.scheduled_at ?? mapped.start;
      // Actual times: try to preserve startTime/endTime or accept alternative names
      mapped.startTime = mapped.startTime ?? mapped.startedAt ?? mapped.start_at_time ?? mapped.started_at ?? mapped.started_at_time ?? mapped.actualStart;
      mapped.endTime = mapped.endTime ?? mapped.endedAt ?? mapped.end_at_time ?? mapped.ended_at ?? mapped.actualEnd;
      return mapped;
    };

    // Normalize incoming assignments: ensure task startAt/startTime/endTime (if present)
    // are Date objects (convert from ISO strings or 'HH:mm' when possible) relative to plan date `d`.
    const normalizedAssignments = (assignments || []).map((a: any) => ({
      ...a,
      tasks: (a.tasks || []).map((t: any) => {
        const mapped = mapTaskNames(t);
        // capture the raw scheduled string if provided (prefer string fields). If startAt is a Date/ISO and
        // no startAtString was provided, derive an HH:mm from the stored Date using UTC hours/minutes so the
        // UI can display the exact stored wall-clock time without timezone conversion.
        let rawStartAtString: any = undefined;
        if (mapped.startAtString !== undefined && mapped.startAtString !== null) {
          rawStartAtString = mapped.startAtString;
        } else if (typeof mapped.startAt === 'string') {
          rawStartAtString = mapped.startAt;
        } else if (mapped.startAt) {
          try {
            const dd = new Date(mapped.startAt);
            if (!Number.isNaN(dd.getTime())) {
              const hh = String(dd.getUTCHours()).padStart(2, '0');
              const mm = String(dd.getUTCMinutes()).padStart(2, '0');
              rawStartAtString = `${hh}:${mm}`;
            }
          } catch {}
        }
         return {
          ...mapped,
          startAtString: rawStartAtString,
          startAt: parseDateOrTimeOnPlanDate(mapped && mapped.startAt),
           startTime: parseDateOrTimeOnPlanDate(mapped && mapped.startTime),
           endTime: parseDateOrTimeOnPlanDate(mapped && mapped.endTime),
         };
      }),
    }));

    let plan = await WorkDayPlan.findOne({ date: d });
    if (!plan) {
      // Creating a brand new plan; nothing to compare against, so just save
      plan = new WorkDayPlan({ date: d, assignments: normalizedAssignments });
      return await plan.save();
    }

    // We have an existing plan: compare old assignments/tasks to incoming ones
    const oldAssignments = plan.assignments || [];

    // Helper to normalize user id to string
    const uid = (u: any) => (u && (u._id || u)).toString();

    for (const newAssign of normalizedAssignments || []) {
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
    plan.assignments = normalizedAssignments;
    return await plan.save();
  }

  async deleteById(id: string) {
    return await WorkDayPlan.findByIdAndDelete(id);
  }
}

export default new WorkDayPlanService();
