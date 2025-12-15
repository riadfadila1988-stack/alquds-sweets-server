import connectDB from '../config/mongoose';
import { WorkDayPlan } from '../modules/work-day-plan/work-day-plan.model';

// Use runtime require for luxon
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DateTime } = require('luxon');

async function run() {
  await connectDB();
  console.log('[recompute] connected to DB');

  const tzEnv = process.env.NOTIFY_TZ || 'Asia/Jerusalem';
  console.log('[recompute] using timezone:', tzEnv);

  const cursor = WorkDayPlan.find().cursor();
  let processed = 0;
  let updatedPlans = 0;
  let updatedTasks = 0;

  for (let plan = await cursor.next(); plan != null; plan = await cursor.next()) {
    processed++;
    let changed = false;
    const assignments = plan.assignments || [];
    for (const assign of assignments) {
      const tasks = assign.tasks || [];
      for (const task of tasks) {
        try {
          if (task && task.startAtString && typeof task.startAtString === 'string') {
            const m = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/.exec(task.startAtString);
            if (m) {
              const hh = Number(m[1]);
              const mm = Number(m[2]);
              const ss = m[3] ? Number(m[3]) : 0;
              const tz = (task && (task as any).timezone) || tzEnv;
              const dt = DateTime.fromObject({
                year: plan.date.getFullYear(),
                month: plan.date.getMonth() + 1,
                day: plan.date.getDate(),
                hour: hh,
                minute: mm,
                second: ss,
              }, { zone: tz });
              if (dt.isValid) {
                const newStartAt = dt.toJSDate();
                const old = task.startAt ? new Date(task.startAt) : null;
                if (!old || Math.abs(old.getTime() - newStartAt.getTime()) > 60 * 1000) {
                  task.startAt = newStartAt;
                  changed = true;
                  updatedTasks++;
                }
              } else {
                console.warn('[recompute] invalid DateTime for plan', String(plan._id), 'task', String(task._id), 'tz', tz, 'str', task.startAtString);
              }
            }
          }
        } catch (err) {
          console.error('[recompute] failed task update', err);
        }
      }
    }

    if (changed) {
      try {
        await plan.save();
        updatedPlans++;
        console.log('[recompute] saved plan', String(plan._id));
      } catch (err) {
        console.error('[recompute] failed to save plan', String(plan._id), err);
      }
    }

    if (processed % 100 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  console.log('[recompute] done. processed=', processed, 'plansUpdated=', updatedPlans, 'tasksUpdated=', updatedTasks);
  process.exit(0);
}

run().catch((e) => {
  console.error('[recompute] error', e);
  process.exit(1);
});

