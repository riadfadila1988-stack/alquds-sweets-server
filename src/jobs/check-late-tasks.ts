import { WorkDayPlan } from '../modules/work-day-plan/work-day-plan.model';
import NotificationService from '../modules/notification/notification.service';

// Use runtime require for luxon to avoid TypeScript module resolution issues in some dev setups
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DateTime } = require('luxon');

// Configuration
const GRACE_MINUTES = Number(process.env.LATE_GRACE_MINUTES || '5');
const CHECK_INTERVAL_MS = Number(process.env.LATE_CHECK_INTERVAL_MS || String(60 * 1000)); // default every minute

function formatTimeLocal(d: Date) {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

async function checkLateTasksOnce() {
  try {
    const today = new Date();
    // Normalize to server date-only (midnight)
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    // Use a cursor to stream matching plans to avoid loading all into memory
    const cursor = WorkDayPlan.find({ date: startOfDay }).cursor();

    const now = new Date();

    for (let plan = await cursor.next(); plan != null; plan = await cursor.next()) {
      // populate assignments.user for this single plan only
      await plan.populate('assignments.user');

      let modified = false;
      for (const assign of (plan.assignments || [])) {
        const user = assign.user as any;
        const userId = user && (user._id || user).toString();
        const userName = user && user.name ? user.name : (userId || 'Unknown');

        for (const task of (assign.tasks || [])) {
          // Only consider tasks with scheduled start (either stored startAt Date or startAtString),
          // not yet started, and not already notified
          if (!task.startAt && !task.startAtString) continue;
          if (task.startTime) continue;
          if (task.lateNotified) continue;

          // Compute scheduledDate: prefer startAtString (HH:mm) interpreted on plan date as local time
          // Use Luxon for timezone-aware conversion. Prefer task.timezone, then NOTIFY_TZ env var (IANA string like 'Asia/Jerusalem'), then server local.
          // Construct scheduledDate using DateTime.fromObject with zone so notifications fire at the user's local intended time.
          let scheduledDate: Date | null = null;
          if (task.startAtString && typeof task.startAtString === 'string') {
            const m = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/.exec(task.startAtString);
            if (m) {
              const hh = Number(m[1]);
              const mm = Number(m[2]);
              const ss = m[3] ? Number(m[3]) : 0;
              // Determine zone: prefer task.timezone (IANA), then NOTIFY_TZ env var, otherwise server local
              const tz = ((task as any) && (task as any).timezone) || process.env.NOTIFY_TZ || undefined;
              if (tz) {
                // Use Luxon to build a Date in the target zone then convert to JS Date (UTC instant)
                const dt = DateTime.fromObject({
                  year: plan.date.getFullYear(),
                  month: plan.date.getMonth() + 1,
                  day: plan.date.getDate(),
                  hour: hh,
                  minute: mm,
                  second: ss,
                }, { zone: tz });
                if (dt.isValid) scheduledDate = dt.toJSDate();
              } else {
                // No zone provided: interpret as server-local wall-clock
                scheduledDate = new Date(plan.date.getFullYear(), plan.date.getMonth(), plan.date.getDate(), hh, mm, ss, 0);
              }
            }
          }
          if (!scheduledDate && task.startAt) {
            scheduledDate = new Date(task.startAt);
          }
          if (!scheduledDate) continue; // should not happen due to earlier guard

          // Compute cutoff using scheduledDate (absolute time representing the intended wall-clock)
          const cutoff = new Date(scheduledDate.getTime() + GRACE_MINUTES * 60 * 1000);
          if (cutoff <= now) {
            // Mark notified locally to avoid duplicate notifications
            task.lateNotified = true;
            modified = true;

            // prefer showing the original startAtString if available (user-entered wall-clock)
            const plannedAtStr = (task.startAtString && typeof task.startAtString === 'string') ? task.startAtString : formatTimeLocal(new Date(scheduledDate));

            // Employee notification (Arabic) targeted to user
            const empMsg = `أنت متأخر عن المهمة "${task.name || 'مهمة'}" المقررة في ${plannedAtStr}`;
            try {
              if (!userId) {
                console.warn('[LateTaskJob] skipping employee notification because userId is falsy', { planId: plan._id, assign, taskId: task._id });
              } else {
                const empN = await NotificationService.createForUser(empMsg, userId, { taskId: task._id, planId: plan._id });
                console.log('[LateTaskJob] created employee notification', { id: empN?._id, recipient: empN?.recipient, userId, taskId: task._id });
              }
            } catch (e) {
              console.error('[LateTaskJob] failed to create employee notification', e);
            }

            // Admin notification (Arabic) with employee and task details targeted to role 'admin'
            const adminMsg = `${userName} متأخر عن المهمة "${task.name || 'مهمة'}" (المقررة ${plannedAtStr})`;
            try {
              const adminN = await NotificationService.createForRole(adminMsg, 'admin', { taskId: task._id, planId: plan._id, userId });
              console.log('[LateTaskJob] created admin notification', { id: adminN?._id, role: adminN?.role, taskId: task._id });
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

      // yield periodically
      await new Promise((r) => setTimeout(r, 0));
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
