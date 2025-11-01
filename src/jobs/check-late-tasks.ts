import { WorkDayPlan } from '../modules/work-day-plan/work-day-plan.model';
import NotificationService from '../modules/notification/notification.service';

// Configuration
const GRACE_MINUTES = Number(process.env.LATE_GRACE_MINUTES || '5');
const CHECK_INTERVAL_MS = Number(process.env.LATE_CHECK_INTERVAL_MS || String(60 * 1000)); // default every minute

function formatTimeUTC(d: Date) {
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

async function checkLateTasksOnce() {
  try {
    const today = new Date();
    // Normalize to server date-only (midnight)
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    // Query plans whose date equals startOfDay
    const plans = await WorkDayPlan.find({ date: startOfDay }).populate('assignments.user');

    const now = new Date();

    for (const plan of plans) {
      let modified = false;
      for (const assign of (plan.assignments || [])) {
        const user = assign.user as any;
        const userId = user && (user._id || user).toString();
        const userName = user && user.name ? user.name : (userId || 'Unknown');

        for (const task of (assign.tasks || [])) {
          // Only consider tasks with scheduled start, not yet started, and not already notified
          if (!task.startAt) continue;
          if (task.startTime) continue;
          if (task.lateNotified) continue;

          // Compute cutoff
          const cutoff = new Date(task.startAt.getTime() + GRACE_MINUTES * 60 * 1000);
          if (cutoff <= now) {
            // Mark notified locally to avoid duplicate notifications
            task.lateNotified = true;
            modified = true;

            const plannedAtStr = formatTimeUTC(new Date(task.startAt));

            // Employee notification (Arabic) targeted to user
            const empMsg = `أنت متأخر عن المهمة "${task.name || 'مهمة'}" المقررة في ${plannedAtStr}`;
            try {
              await NotificationService.createForUser(empMsg, userId, { taskId: task._id, planId: plan._id });
            } catch (e) {
              console.error('[LateTaskJob] failed to create employee notification', e);
            }

            // Admin notification (Arabic) with employee and task details targeted to role 'admin'
            const adminMsg = `${userName} متأخر عن المهمة "${task.name || 'مهمة'}" (المقررة ${plannedAtStr})`;
            try {
              await NotificationService.createForRole(adminMsg, 'admin', { taskId: task._id, planId: plan._id, userId });
            } catch (e) {
              console.error('[LateTaskJob] failed to create admin notification', e);
            }

            // Emit socket events to connected clients so UIs can react in real time
            try {
              // Require io at runtime to avoid circular import
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const { io } = require('../index');
              if (io && typeof io.emit === 'function') {
                io.emit('late-task', { userId, userName, taskId: task._id, taskName: task.name, plannedAt: plannedAtStr });
              }
            } catch (e) {
              // ignore socket errors
              console.error('[LateTaskJob] socket emit failed', e);
            }
          }
        }
      }

      if (modified) {
        try {
          await plan.save();
        } catch (e) {
          console.error('[LateTaskJob] failed to save updated plan', e);
        }
      }
    }
  } catch (err) {
    console.error('[LateTaskJob] unexpected error', err);
  }
}

let intervalId: NodeJS.Timeout | null = null;

export function startLateTaskChecker() {
  if (intervalId) return; // already started
  // Run immediately, then on interval
  void checkLateTasksOnce();
  intervalId = setInterval(() => void checkLateTasksOnce(), CHECK_INTERVAL_MS);
  console.log('[LateTaskJob] started, check interval ms=', CHECK_INTERVAL_MS, 'grace minutes=', GRACE_MINUTES);
}

export function stopLateTaskChecker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
