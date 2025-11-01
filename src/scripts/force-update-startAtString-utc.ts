import connectDB from '../config/mongoose';
import { WorkDayPlan } from '../modules/work-day-plan/work-day-plan.model';

function pad(n: number) { return String(n).padStart(2, '0'); }

async function run() {
  await connectDB();
  console.log('[force-backfill] connected to DB');
  const plans = await WorkDayPlan.find();
  console.log('[force-backfill] found', plans.length, 'plans');
  let updatedPlans = 0;
  let updatedTasks = 0;

  for (const plan of plans) {
    let changed = false;
    const assignments = plan.assignments || [];
    for (const a of assignments) {
      const tasks = a.tasks || [];
      for (const t of tasks) {
        try {
          if (t && t.startAt) {
            const d = new Date(t.startAt);
            if (!isNaN(d.getTime())) {
              const hh = pad(d.getUTCHours());
              const mm = pad(d.getUTCMinutes());
              const newStr = `${hh}:${mm}`;
              if (t.startAtString !== newStr) {
                t.startAtString = newStr;
                changed = true;
                updatedTasks++;
              }
            }
          }
        } catch (err) {
          console.error('[force-backfill] failed task update', err);
        }
      }
    }
    if (changed) {
      try {
        await plan.save();
        updatedPlans++;
        console.log('[force-backfill] saved plan', String(plan._id));
      } catch (err) {
        console.error('[force-backfill] failed to save plan', String(plan._id), err);
      }
    }
  }

  console.log('[force-backfill] done. plansUpdated=', updatedPlans, 'tasksUpdated=', updatedTasks);
  process.exit(0);
}

run().catch((e) => {
  console.error('[force-backfill] error', e);
  process.exit(1);
});

