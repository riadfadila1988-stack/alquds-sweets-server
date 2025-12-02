import { WorkDayPlan } from '../modules/work-day-plan/work-day-plan.model';
import NotificationService from '../modules/notification/notification.service';

// Use runtime require for luxon to avoid TypeScript module resolution issues in some dev setups
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DateTime } = require('luxon');

// Configuration
const GRACE_MINUTES = Number(process.env.LATE_GRACE_MINUTES || '0');
const CHECK_INTERVAL_MS = Number(process.env.LATE_CHECK_INTERVAL_MS || String(60 * 1000)); // default every minute
// Optional verbose debugging for the late-job. Set LATE_JOB_VERBOSE=1 to enable detailed logs.
const LATE_JOB_VERBOSE = process.env.LATE_JOB_VERBOSE === '1' || process.env.LATE_JOB_VERBOSE === 'true';

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
    // Match plans whose `date` is within this server-local day. Use a half-open range
    // [startOfDay, nextDay) instead of exact equality to avoid timezone-storage mismatches.
    const dayEnd = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const cursor = WorkDayPlan.find({ date: { $gte: startOfDay, $lt: dayEnd } }).cursor();

    const now = new Date();

    // defaultNotifyTZ is computed below (prefer env), declare in outer scope so it's visible later
    // Default to Israel time if NOTIFY_TZ isn't set so server checks times as in Israel
    let defaultNotifyTZ = process.env.NOTIFY_TZ || 'Asia/Jerusalem';



    // Log server time and relevant environment settings for debugging notification timing differences
    try {
      const serverTZ = (typeof Intl !== 'undefined' && Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions)
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : undefined;
      // Determine a default timezone to use when NOTIFY_TZ isn't set and tasks lack per-task timezone.
      // This prefers explicit env NOTIFY_TZ, then the system Intl-detected tz, then falls back to 'UTC'.
      // If code above set defaultNotifyTZ from env it stays; otherwise prefer server detected tz, else keep Asia/Jerusalem
      defaultNotifyTZ = process.env.NOTIFY_TZ || serverTZ || defaultNotifyTZ;
    } catch (e) {
      // defensive: logging should not break the job
      // eslint-disable-next-line no-console
    }

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
          // More explicit null/undefined checks to avoid edge cases
          if (!task.startAt && !task.startAtString) {

            continue;
          }
          // Check if task has already been started - must be explicit to handle all cases
          if (task.startTime !== null && task.startTime !== undefined) {

            continue;
          }
          if (task.lateNotified === true) {

            continue;
          }

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
              // Prefer per-task timezone, then configured NOTIFY_TZ, then detected server tz, then UTC.
              // Use the defaultNotifyTZ computed earlier so the same value logged is actually applied here.
              const tz = ((task as any) && (task as any).timezone) || defaultNotifyTZ;

              if (tz) {
                // Interpret the plan.date in the chosen zone, then set the wall-clock time (hh:mm:ss) there.
                // This avoids mistakes when plan.date is stored as midnight UTC but the intended local date is different.
                try {
                  const planDt = DateTime.fromJSDate(plan.date, { zone: tz });
                  const dt = planDt.set({ hour: hh, minute: mm, second: ss, millisecond: 0 });
                  if (dt.isValid) {
                    scheduledDate = dt.toJSDate();

                  } else {
                    console.error('[LateTaskJob] ERROR: Luxon DateTime is invalid', { planDt: planDt.toISO?.(), dt: dt.toISO?.(), tz, hh, mm, ss });
                  }
                } catch (err) {
                  console.error('[LateTaskJob] ERROR: Failed to parse with Luxon', { err, tz, planDate: plan.date, hh, mm, ss });
                }
              } else {
                // No zone provided: interpret as server-local wall-clock
                scheduledDate = new Date(plan.date.getFullYear(), plan.date.getMonth(), plan.date.getDate(), hh, mm, ss, 0);
              }
            } else if (LATE_JOB_VERBOSE) {
            }
          }
          if (!scheduledDate && task.startAt) {
            scheduledDate = new Date(task.startAt);

          }

          // Validate that we have a valid scheduledDate
          if (!scheduledDate || isNaN(scheduledDate.getTime())) {

            continue;
          }

          // Optional additional shift (minutes) to postpone notifications relative to the computed scheduled time.
          // Use env NOTIFY_SHIFT_MINUTES (can be negative). For example, set to 60 to delay by 1 hour.
          const shiftMinutes = Number(process.env.NOTIFY_SHIFT_MINUTES || '0');
          if (shiftMinutes !== 0) {
            scheduledDate = new Date(scheduledDate.getTime() + shiftMinutes * 60 * 1000);
          }

          // Compute cutoff using scheduledDate (absolute time representing the intended wall-clock)
          const cutoff = new Date(scheduledDate.getTime() + GRACE_MINUTES * 60 * 1000);

          if (cutoff <= now) {
            // Task is late - send notifications


            // Mark notified locally to avoid duplicate notifications
            task.lateNotified = true;
            modified = true;

            // prefer showing the original startAtString if available (user-entered wall-clock)
            const plannedAtStr = (task.startAtString && typeof task.startAtString === 'string') ? task.startAtString : formatTimeLocal(new Date(scheduledDate));

            // Employee notification (Arabic) targeted to user
            const empMsg = `أنت متأخر عن المهمة "${task.name || 'مهمة'}" المقررة في ${plannedAtStr}`;
            try {
              if (!userId) {
              } else {
                await NotificationService.createForUser(empMsg, userId, { taskId: task._id, planId: plan._id });
              }
            } catch (e) {
            }

            // Admin notification (Arabic) with employee and task details targeted to role 'admin'
            const adminMsg = `${userName} متأخر عن المهمة "${task.name || 'مهمة'}" (المقررة ${plannedAtStr})`;
            try {
              await NotificationService.createForRole(adminMsg, 'admin', { taskId: task._id, planId: plan._id, userId });
            } catch (e) {
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
            }
          }
        }
      }

      if (modified) {
        try {
          await plan.save();
        } catch (e) {
        }
      }

      // yield periodically
      await new Promise((r) => setTimeout(r, 0));
    }
  } catch (err) {
  }
}

let intervalId: NodeJS.Timeout | null = null;

export function startLateTaskChecker() {
  if (intervalId) return; // already started
  // Run immediately, then on interval
  void checkLateTasksOnce();
  intervalId = setInterval(() => void checkLateTasksOnce(), CHECK_INTERVAL_MS);
  // job started (log removed in production)
}
