import { WorkDayPlan } from './work-day-plan.model';
import { IWorkDayPlan } from './work-day-plan.interface';
import Material from '../material/material.model';
import NotificationService from '../notification/notification.service';
import MaterialUsageService from '../material-usage/material-usage.service';
// Luxon for timezone-aware conversions
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DateTime } = require('luxon');

class WorkDayPlanService {
  async getByDate(date: string): Promise<IWorkDayPlan | null> {
    const d = new Date(date);
    return await WorkDayPlan.findOne({ date: d }).populate('assignments.user').lean();
  }

  /**
   * Get work day plan for a specific user only
   * Returns only the assignment for the specified user, not all assignments
   */
  async getByDateForUser(date: string, userId: string): Promise<{ date: Date; assignment: any } | null> {
    const d = new Date(date);
    const plan = await WorkDayPlan.findOne({ date: d }).populate('assignments.user').lean();

    if (!plan) {
      return null;
    }

    // Find the assignment for this specific user
    const uid = (u: any) => (u && (u._id || u)).toString();
    const assignment = plan.assignments.find((a: any) => uid(a.user) === userId);

    if (!assignment) {
      return null;
    }

    return {
      date: plan.date,
      assignment: assignment
    };
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
            // Determine timezone to interpret the user-entered wall-clock. Prefer per-task timezone
            // (if provided by client), then server-level NOTIFY_TZ, then fall back to Asia/Jerusalem.
            // This MUST match the fallback in check-late-tasks.ts to avoid timezone mismatches.
            const tz = process.env.NOTIFY_TZ || 'Asia/Jerusalem';
            try {
              const dt = DateTime.fromJSDate(d, { zone: tz }).set({ hour: hh, minute: mm, second: ss, millisecond: 0 });
              if (dt.isValid) return dt.toJSDate();
            } catch {
              // fallback to local interpretation if Luxon fails
              return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, ss, 0);
            }
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
              // Use local hours/minutes so the UI reflects the stored wall-clock time
              const hh = String(dd.getHours()).padStart(2, '0');
              const mm = String(dd.getMinutes()).padStart(2, '0');
              rawStartAtString = `${hh}:${mm}`;
            }
          } catch { }
        }
        // Compute startAt: prefer explicit startAt value if provided. If only startAtString exists,
        // convert it into an absolute UTC Date using Luxon and the configured NOTIFY_TZ (or UTC).
        let computedStartAt = undefined;
        if (mapped.startAt) {
          // If client sent an ISO string, number, or Date, parse it to Date
          computedStartAt = parseDateOrTimeOnPlanDate(mapped.startAt);
        } else if (mapped.startAtString) {
          // parse HH:mm on plan date using configured timezone
          const m = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/.exec(mapped.startAtString);
          if (m) {
            const hh = Number(m[1]);
            const mm = Number(m[2]);
            const ss = m[3] ? Number(m[3]) : 0;
            const tz = ((mapped as any).timezone) || process.env.NOTIFY_TZ || 'Asia/Jerusalem';
            try {
              const planDt = DateTime.fromJSDate(d, { zone: tz });
              const dt = planDt.set({ hour: hh, minute: mm, second: ss, millisecond: 0 });
              if (dt.isValid) computedStartAt = dt.toJSDate();
            } catch {
              // fallback to local
              computedStartAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, ss, 0);
            }
          }
        }

        return {
          ...mapped,
          startAtString: rawStartAtString,
          startAt: computedStartAt,
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

    // VALIDATION: Ensure no started tasks are deleted or have their start time modified
    for (const oldAssign of oldAssignments) {
      const userId = uid(oldAssign.user);
      const newAssign = normalizedAssignments.find((a: any) => uid(a.user) === userId);

      // If the whole user assignment is missing, check if they had any started tasks
      if (!newAssign) {
        const startedTask = (oldAssign.tasks || []).find((t: any) => t.startTime);
        if (startedTask) {
          throw new Error(`Cannot remove assignment for user ${userId} because they have started tasks.`);
        }
        continue;
      }

      const oldTasks = oldAssign.tasks || [];
      const newTasks = newAssign.tasks || [];

      for (const oldTask of oldTasks) {
        // If task hasn't started, we don't care if it's deleted or modified
        if (!oldTask.startTime) continue;

        // Try to find this task in the new list
        // 1. Match by _id if available
        let newTask = newTasks.find((t: any) => t._id && t._id.toString() === oldTask._id.toString());

        // 2. If not found by ID, try to match by exact properties (heuristic fallback)
        // This is tricky because if the client sends new objects without IDs, we might lose track.
        // Ideally, clients should preserve IDs. If we can't find it by ID, we assume it's being deleted.
        if (!newTask) {
          throw new Error(`Cannot delete task '${oldTask.name}' because it has already started.`);
        }

        // Check if start time is modified
        // We compare the time values. Note: new start time might be a Date object or null/undefined
        const oldTime = oldTask.startTime.getTime();
        const newTime = newTask.startTime ? new Date(newTask.startTime).getTime() : null;

        if (newTime !== oldTime) {
          throw new Error(`Cannot modify start time for task '${oldTask.name}' because it has already started.`);
        }
      }
    }

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

              // Log material usage
              try {
                await MaterialUsageService.logMaterialUsage({
                  materialId: String(matRef),
                  materialName: mat.name,
                  previousQuantity: currentQty,
                  newQuantity: newQty,
                  userId: newUserId,
                  userName: newAssign.user?.name || 'Unknown',
                });
              } catch (logErr) {
                console.error('Failed to log material usage for task completion', logErr);
              }

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

              // Log material production (addition)
              try {
                await MaterialUsageService.logMaterialUsage({
                  materialId: String(matRef),
                  materialName: mat.name,
                  previousQuantity: currentQty,
                  newQuantity: newQty,
                  userId: newUserId,
                  userName: newAssign.user?.name || 'Unknown',
                });
              } catch (logErr) {
                console.error('Failed to log material production for task completion', logErr);
              }
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

  /**
   * Update a specific task for a specific user without replacing all assignments
   * This is more efficient and prevents race conditions when multiple users update tasks simultaneously
   * Returns only the user's assignment, not all assignments
   */
  async updateUserTask(
    date: string,
    userId: string,
    taskId: string | undefined,
    taskIndex: number | undefined,
    updates: { startTime?: Date | string; endTime?: Date | string; overrunReason?: string }
  ): Promise<{ date: Date; assignment: any } | null> {
    const d = new Date(date);
    const plan = await WorkDayPlan.findOne({ date: d });

    if (!plan) {
      throw new Error('Work day plan not found for the specified date');
    }

    // Helper to parse date values
    const parseDateOrTimeOnPlanDate = (val: any) => {
      if (val === undefined || val === null) return val;
      if (val instanceof Date) return Number.isFinite(val.getTime()) ? val : val;
      if (typeof val === 'number' && Number.isFinite(val)) {
        const dd = new Date(val);
        return Number.isFinite(dd.getTime()) ? dd : val;
      }
      if (typeof val === 'string') {
        if (val.includes('T') || /\d{4}-\d{2}-\d{2}/.test(val)) {
          const dd = new Date(val);
          if (Number.isFinite(dd.getTime())) return dd;
        }
        const hhmm = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/.exec(val);
        if (hhmm) {
          const hh = Number(hhmm[1]);
          const mm = Number(hhmm[2]);
          const ss = hhmm[3] ? Number(hhmm[3]) : 0;
          if (hh >= 0 && hh < 24 && mm >= 0 && mm < 60 && ss >= 0 && ss < 60) {
            const tz = process.env.NOTIFY_TZ || 'Asia/Jerusalem';
            try {
              const dt = DateTime.fromJSDate(d, { zone: tz }).set({ hour: hh, minute: mm, second: ss, millisecond: 0 });
              if (dt.isValid) return dt.toJSDate();
            } catch {
              return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, ss, 0);
            }
          }
        }
        const dd2 = new Date(val);
        if (Number.isFinite(dd2.getTime())) return dd2;
      }
      return val;
    };

    // Find the assignment for this user
    const uid = (u: any) => (u && (u._id || u)).toString();
    const assignmentIndex = plan.assignments.findIndex((a: any) => uid(a.user) === userId);

    if (assignmentIndex === -1) {
      throw new Error('Assignment not found for the specified user');
    }

    const assignment = plan.assignments[assignmentIndex];
    const oldTasks = assignment.tasks || [];

    // Find the task by _id or index
    let targetTaskIndex = -1;
    if (taskId) {
      targetTaskIndex = oldTasks.findIndex((t: any) => t && t._id && t._id.toString() === taskId);
    }
    if (targetTaskIndex === -1 && taskIndex !== undefined) {
      targetTaskIndex = taskIndex;
    }

    if (targetTaskIndex === -1 || !oldTasks[targetTaskIndex]) {
      throw new Error('Task not found');
    }

    const oldTask = oldTasks[targetTaskIndex];
    const oldEnded = !!oldTask.endTime;

    // Apply updates to the task
    if (updates.startTime !== undefined) {
      const newStartTime = parseDateOrTimeOnPlanDate(updates.startTime);
      // If task already has a start time, prevent changing it
      if (oldTask.startTime) {
        const oldTime = oldTask.startTime.getTime();
        const newTime = newStartTime ? newStartTime.getTime() : null;
        if (oldTime !== newTime) {
          throw new Error('Cannot modify start time of a task that has already started');
        }
      }
      oldTask.startTime = newStartTime;
    }
    if (updates.endTime !== undefined) {
      oldTask.endTime = parseDateOrTimeOnPlanDate(updates.endTime);
    }
    if (updates.overrunReason !== undefined) {
      oldTask.overrunReason = updates.overrunReason;
    }

    const newEnded = !!oldTask.endTime;

    // If task just transitioned from not-ended to ended, process materials
    if (newEnded && !oldEnded) {
      // Decrement used materials
      const usedMaterials = oldTask.usedMaterials || [];
      for (const um of usedMaterials) {
        try {
          const matRef = um && (um.material && (um.material._id || um.material));
          const usedQty = Number(um && um.quantity) || 0;
          if (!matRef || usedQty <= 0) continue;

          const mat = await Material.findById(matRef);
          if (!mat) continue;
          const currentQty = Number(mat.quantity) || 0;
          const newQty = Math.max(0, currentQty - usedQty);
          await Material.findByIdAndUpdate(matRef, { quantity: newQty }, { new: true });

          // Log material usage
          try {
            await MaterialUsageService.logMaterialUsage({
              materialId: String(matRef),
              materialName: mat.name,
              previousQuantity: currentQty,
              newQuantity: newQty,
              userId: userId,
              userName: assignment.user?.name || 'Unknown',
            });
          } catch (logErr) {
            console.error('Failed to log material usage for task completion', logErr);
          }

          // Create low-stock notification if needed
          try {
            const threshold = Number(mat.notificationThreshold);
            if (!Number.isNaN(threshold)) {
              const crossed = currentQty >= threshold && newQty < threshold;
              if (crossed) {
                const existing = await NotificationService.findUnreadForMaterial(String(matRef));
                if (!existing) {
                  const messageAr = `المادة '${mat.name}' منخفضة: المتبقي ${newQty} (الحد الأدنى ${threshold})`;
                  console.log('[WorkDayPlan] creating low-stock notification for material', String(matRef));
                  await NotificationService.createNotification(messageAr, String(matRef));
                }
              }
            }
          } catch (notifErr) {
            console.error('Failed to create low-stock notification for material', matRef, notifErr);
          }
        } catch (err) {
          console.error('Failed to decrement material for usedMaterial', um, err);
        }
      }

      // Increment produced materials
      const producedMaterials = oldTask.producedMaterials || [];
      for (const pm of producedMaterials) {
        try {
          const matRef = pm && (pm.material && (pm.material._id || pm.material));
          const prodQty = Number(pm && pm.quantity) || 0;
          if (!matRef || prodQty <= 0) continue;

          const mat = await Material.findById(matRef);
          if (!mat) continue;
          const currentQty = Number(mat.quantity) || 0;
          const newQty = currentQty + prodQty;
          await Material.findByIdAndUpdate(matRef, { quantity: newQty }, { new: true });

          // Log material production
          try {
            await MaterialUsageService.logMaterialUsage({
              materialId: String(matRef),
              materialName: mat.name,
              previousQuantity: currentQty,
              newQuantity: newQty,
              userId: userId,
              userName: assignment.user?.name || 'Unknown',
            });
          } catch (logErr) {
            console.error('Failed to log material production for task completion', logErr);
          }
        } catch (err) {
          console.error('Failed to increment material for producedMaterial', pm, err);
        }
      }
    }

    // Save and return only the updated user's assignment
    await plan.save();

    // Fetch the updated plan with populated user data
    const updatedPlan = await WorkDayPlan.findOne({ date: d }).populate('assignments.user').lean();

    if (!updatedPlan) {
      return null;
    }

    // Find and return only this user's assignment
    const updatedAssignment = updatedPlan.assignments.find((a: any) => uid(a.user) === userId);

    if (!updatedAssignment) {
      return null;
    }

    return {
      date: updatedPlan.date,
      assignment: updatedAssignment
    };
  }
}

export default new WorkDayPlanService();
